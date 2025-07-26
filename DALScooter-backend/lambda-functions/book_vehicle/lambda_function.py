import json
import boto3
import os
from datetime import datetime

# Initialize AWS clients
dynamodb = boto3.client('dynamodb')
sqs = boto3.client('sqs')

def handler(event, context):
    try:
        body = json.loads(event.get('body', '{}'))
        vehicle_id = body.get('vehicleID')
        start_time = body.get('startTime')
        end_time = body.get('endTime')
        email = body.get('email')

        # Validate input
        if not all([vehicle_id, start_time, end_time, email]):
            return {
                'statusCode': 400,
                'headers': {
                    'Access-Control-Allow-Origin': '*',
                    'Access-Control-Allow-Headers': 'Content-Type,Authorization,X-Amz-Date,X-Api-Key,X-Amz-Security-Token',
                    'Access-Control-Allow-Methods': 'POST,OPTIONS'
                },
                'body': json.dumps({'message': 'Missing required fields'})
            }

        start = datetime.fromisoformat(start_time.replace('Z', '+00:00'))
        end = datetime.fromisoformat(end_time.replace('Z', '+00:00'))
        if end <= start:
            return {
                'statusCode': 400,
                'headers': {
                    'Access-Control-Allow-Origin': '*',
                    'Access-Control-Allow-Headers': 'Content-Type,Authorization,X-Amz-Date,X-Api-Key,X-Amz-Security-Token',
                    'Access-Control-Allow-Methods': 'POST,OPTIONS'
                },
                'body': json.dumps({'message': 'End time must be after start time'})
            }

        # Instead of directly saving to DynamoDB, send to SQS queue
        # Get SQS queue URL from environment variable
        booking_queue_url = os.environ.get('BOOKING_QUEUE_URL')
        if not booking_queue_url:
            # Fallback to direct DynamoDB operation if queue URL is not configured
            return process_booking_directly(vehicle_id, start_time, end_time, email)
        
        # Create booking request message
        booking_request = {
            'vehicleID': vehicle_id,
            'startTime': start_time,
            'endTime': end_time,
            'email': email,
            'requestTime': datetime.now().isoformat()
        }
        
        # Send booking request to SQS queue
        response = sqs.send_message(
            QueueUrl=booking_queue_url,
            MessageBody=json.dumps(booking_request),
            MessageAttributes={
                'vehicleID': {
                    'DataType': 'String',
                    'StringValue': vehicle_id
                },
                'email': {
                    'DataType': 'String',
                    'StringValue': email
                }
            }
        )
        
        return {
            'statusCode': 202,
            'headers': {
                'Access-Control-Allow-Origin': '*',
                'Access-Control-Allow-Headers': 'Content-Type,Authorization,X-Amz-Date,X-Api-Key,X-Amz-Security-Token',
                'Access-Control-Allow-Methods': 'POST,OPTIONS'
            },
            'body': json.dumps({
                'message': 'Booking request submitted and will be processed shortly',
                'requestId': response['MessageId']
            })
        }

    except Exception as e:
        print(f"Error: {str(e)}")
        return {
            'statusCode': 500,
            'headers': {
                'Access-Control-Allow-Origin': '*',
                'Access-Control-Allow-Headers': 'Content-Type,Authorization,X-Amz-Date,X-Api-Key,X-Amz-Security-Token',
                'Access-Control-Allow-Methods': 'POST,OPTIONS'
            },
            'body': json.dumps({'message': 'Internal server error'})
        }

def process_booking_directly(vehicle_id, start_time, end_time, email):
    """Fallback function to process booking directly with DynamoDB (original logic)"""
    
    # Check for conflicts
    response = dynamodb.query(
        TableName=os.environ['TABLE_NAME'],
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

    if response.get('Items'):
        conflicting_booking = response['Items'][0]
        return {
            'statusCode': 409,
            'headers': {
                'Access-Control-Allow-Origin': '*',
                'Access-Control-Allow-Headers': 'Content-Type,Authorization,X-Amz-Date,X-Api-Key,X-Amz-Security-Token',
                'Access-Control-Allow-Methods': 'POST,OPTIONS'
            },
            'body': json.dumps({
                'message': f"Vehicle is already booked from {conflicting_booking['startTime']['S'][11:16]} to {conflicting_booking['endTime']['S'][11:16]}"
            })
        }

    # Save the booking
    booking_id = f"{int(datetime.now().timestamp())}-{vehicle_id}"
    dynamodb.put_item(
        TableName=os.environ['TABLE_NAME'],
        Item={
            'bookingID': {'S': booking_id},
            'vehicleID': {'S': vehicle_id},
            'startTime': {'S': start_time},
            'endTime': {'S': end_time},
            'email': {'S': email},
            'status': {'S': 'confirmed'},
            'createdAt': {'S': datetime.now().isoformat()}
        }
    )

    return {
        'statusCode': 200,
        'headers': {
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Headers': 'Content-Type,Authorization,X-Amz-Date,X-Api-Key,X-Amz-Security-Token',
            'Access-Control-Allow-Methods': 'POST,OPTIONS'
        },
        'body': json.dumps({'message': 'Booking successful', 'bookingID': booking_id})
    }