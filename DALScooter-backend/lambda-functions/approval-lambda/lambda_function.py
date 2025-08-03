import json
import boto3
import os

# Initialize DynamoDB resource and SNS client
dynamodb_resource = boto3.resource('dynamodb')
sns = boto3.client('sns')
users_table = dynamodb_resource.Table(os.environ['USER_DYNAMODB_TABLE'])
vehicles_table = dynamodb_resource.Table(os.environ['VEHICLES_DYNAMODB_TABLE'])  # Add vehicles table env var

def handler(event, context):
    for record in event['Records']:
        current_booking_id = None  # Default value to avoid UnboundLocalError
        try:
            message = json.loads(record['body'])
            print(f"Raw message: {message}")  # Debug the raw SNS message
            # Extract the nested booking request from the Message field
            booking_data = json.loads(message['Message'])
            print(f"Booking data: {booking_data}")  # Debug the parsed booking data

            current_booking_id = booking_data.get('bookingID')
            vehicle_id = booking_data.get('vehicleID')
            start_time = booking_data.get('startTime')
            end_time = booking_data.get('endTime')
            email = booking_data.get('email')

            if not all([current_booking_id, vehicle_id, start_time, end_time, email]):
                raise ValueError("Missing required fields in booking request")

            # Fetch operator email from vehicles table
            vehicles_response = vehicles_table.get_item(Key={'vehicleID': vehicle_id})
            op_email = vehicles_response.get('Item', {}).get('operatorID')  # Assuming op_email is an attribute
            if not op_email:
                raise ValueError(f"No operator email found for vehicle {vehicle_id}")

            # Fetch topic ARN from users table using operator email
            user_response = users_table.get_item(Key={'userID': op_email}).get('Item', {})
            topic_arn = user_response.get('topicArn')
            if not topic_arn:
                raise ValueError(f"No topic ARN found for operator {op_email}")

            # Send notification to operator
            operator_message = f"New booking request for vehicle {vehicle_id} (ID: {current_booking_id}) from {start_time} to {end_time} by {email}. Approve or reject via app."
            sns.publish(
                TopicArn=topic_arn,
                Message=operator_message,
                Subject="Booking Request"
            )
            print(f"Notified operator for booking {current_booking_id}")

        except Exception as e:
            print(f"Error processing booking {current_booking_id or 'unknown'}: {str(e)}")
            continue

    return {
        'statusCode': 200,
        'body': json.dumps({'message': 'Booking requests processed'})
    }