import json
import boto3
import os
import logging
from datetime import datetime

# Set up logging
logger = logging.getLogger()
logger.setLevel(logging.INFO)

# Initialize AWS clients
dynamodb = boto3.resource('dynamodb')
lambda_client = boto3.client('lambda')

# Get table name from environment variable
bookings_table_name = os.environ.get('BOOKINGS_TABLE')
bookings_table = dynamodb.Table(bookings_table_name)

# Get notification Lambda ARN from environment variable
notification_lambda_arn = os.environ.get('NOTIFICATION_LAMBDA_ARN')

def lambda_handler(event, context):
    """
    Processes booking requests from SQS queue
    
    Expected SQS message structure:
    {
        "email": "user@example.com",
        "vehicleID": "v-12345",
        "startTime": "2025-07-04T09:00:00Z",
        "endTime": "2025-07-04T17:00:00Z"
    }
    """
    try:
        logger.info(f"Received event: {json.dumps(event)}")
        
        processed_bookings = []
        
        # Process each message from the SQS queue
        for record in event['Records']:
            message_body = json.loads(record['body'])
            
            # If the message is from SNS, extract the actual message
            if 'Message' in message_body:
                booking_request = json.loads(message_body['Message'])
            else:
                booking_request = message_body
                
            booking_result = process_booking_request(booking_request)
            processed_bookings.append(booking_result)
        
        return {
            'statusCode': 200,
            'body': json.dumps({
                'message': f'Processed {len(processed_bookings)} booking requests',
                'results': processed_bookings
            })
        }
        
    except Exception as e:
        logger.error(f"Error processing booking requests: {str(e)}")
        return {
            'statusCode': 500,
            'body': json.dumps({
                'message': 'Error processing booking requests',
                'error': str(e)
            })
        }

def process_booking_request(request):
    """Process a single booking request"""
    
    email = request.get('email')
    vehicle_id = request.get('vehicleID')
    start_time = request.get('startTime')
    end_time = request.get('endTime')
    
    if not all([email, vehicle_id, start_time, end_time]):
        logger.error("Missing required booking fields")
        send_booking_notification(email, None, 'failure', "Missing required booking information")
        return {
            'success': False,
            'message': 'Missing required booking information'
        }
    
    try:
        # Check for conflicts
        conflicts = check_booking_conflicts(vehicle_id, start_time, end_time)
        if conflicts:
            logger.info(f"Vehicle {vehicle_id} not available for requested time period")
            conflicting_booking = conflicts[0]
            failure_message = f"Vehicle is already booked from {conflicting_booking['startTime'][11:16]} to {conflicting_booking['endTime'][11:16]}"
            
            send_booking_notification(email, None, 'failure', failure_message)
            return {
                'success': False,
                'message': failure_message
            }
        
        # Generate a booking ID
        booking_id = f"{int(datetime.now().timestamp())}-{vehicle_id}"
        
        # Create the booking record
        booking_item = {
            'bookingID': booking_id,
            'vehicleID': vehicle_id,
            'startTime': start_time,
            'endTime': end_time,
            'email': email,
            'status': 'confirmed',
            'createdAt': datetime.now().isoformat()
        }
        
        # Save booking to DynamoDB
        bookings_table.put_item(Item=booking_item)
        
        # Send confirmation notification
        send_booking_notification(
            email,
            booking_id,
            'confirmation',
            f"Your booking has been confirmed",
            {
                'bookingID': booking_id,
                'vehicleID': vehicle_id,
                'startTime': start_time,
                'endTime': end_time
            }
        )
        
        logger.info(f"Booking confirmed: {booking_id}")
        return {
            'success': True,
            'bookingID': booking_id,
            'message': 'Booking confirmed'
        }
        
    except Exception as e:
        logger.error(f"Error processing booking: {str(e)}")
        send_booking_notification(email, None, 'failure', f"Booking failed: {str(e)}")
        return {
            'success': False,
            'message': f'Booking failed: {str(e)}'
        }

def check_booking_conflicts(vehicle_id, start_time, end_time):
    """Check if there are any booking conflicts for the given time period"""
    
    try:
        # Using the low-level client for more control over filter expressions
        dynamodb_client = boto3.client('dynamodb')
        
        response = dynamodb_client.query(
            TableName=bookings_table_name,
            IndexName='VehicleIDIndex',
            KeyConditionExpression='vehicleID = :vehicle_id',
            FilterExpression='status = :status AND endTime > :start_time AND startTime < :end_time',
            ExpressionAttributeValues={
                ':vehicle_id': {'S': vehicle_id},
                ':status': {'S': 'confirmed'},
                ':start_time': {'S': start_time},
                ':end_time': {'S': end_time}
            }
        )
        
        # Convert the DynamoDB response to Python dict format
        conflicts = []
        for item in response.get('Items', []):
            conflict = {}
            for key, value in item.items():
                if 'S' in value:
                    conflict[key] = value['S']
                elif 'N' in value:
                    conflict[key] = value['N']
                elif 'BOOL' in value:
                    conflict[key] = value['BOOL']
            conflicts.append(conflict)
            
        return conflicts
        
    except Exception as e:
        logger.error(f"Error checking booking conflicts: {str(e)}")
        raise

def send_booking_notification(email, booking_id, notification_type, message, additional_data=None):
    """Send booking notification using the notification handler Lambda"""
    
    if additional_data is None:
        additional_data = {}
    
    notification_event = {
        'notificationType': f'booking_{notification_type}',
        'email': email,
        'subject': f'DALScooter Booking {notification_type.title()}',
        'message': message,
        'additionalData': additional_data
    }
    
    try:
        if not notification_lambda_arn:
            logger.warning("NOTIFICATION_LAMBDA_ARN not configured, skipping notification")
            return
            
        # Invoke the notification handler Lambda
        response = lambda_client.invoke(
            FunctionName=notification_lambda_arn,
            InvocationType='Event',  # Asynchronous invocation
            Payload=json.dumps(notification_event)
        )
        logger.info(f"Notification Lambda invoked. Status: {response['StatusCode']}")
        
    except Exception as e:
        logger.error(f"Failed to send notification: {str(e)}")