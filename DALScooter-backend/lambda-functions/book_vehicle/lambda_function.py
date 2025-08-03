import json
import boto3
import os
from datetime import datetime
import random
import string

dynamodb = boto3.client('dynamodb')
sns = boto3.client('sns')

def generate_booking_id():
    characters = string.ascii_uppercase + string.digits
    return ''.join(random.choice(characters) for _ in range(6))

def check_booking_id_unique(booking_id, table_name):
    response = dynamodb.get_item(
        TableName=table_name,
        Key={'bookingID': {'S': booking_id}}
    )
    return 'Item' not in response

def handler(event, context):
    try:
        body = json.loads(event.get('body', '{}'))
        vehicle_id = body.get('vehicleID')
        start_time = body.get('startTime')
        end_time = body.get('endTime')
        email = body.get('email')

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

        response = dynamodb.query(
            TableName=os.environ['TABLE_NAME'],
            IndexName='VehicleIDIndex',
            KeyConditionExpression='vehicleID = :vehicle_id',
            FilterExpression='#status = :status AND endTime > :start_time AND startTime < :end_time',
            ExpressionAttributeNames={'#status': 'status'},
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

        max_attempts = 10
        for _ in range(max_attempts):
            booking_id = generate_booking_id()
            if check_booking_id_unique(booking_id, os.environ['TABLE_NAME']):
                break
        else:
            return {
                'statusCode': 500,
                'headers': {
                    'Access-Control-Allow-Origin': '*',
                    'Access-Control-Allow-Headers': 'Content-Type,Authorization,X-Amz-Date,X-Api-Key,X-Amz-Security-Token',
                    'Access-Control-Allow-Methods': 'POST,OPTIONS'
                },
                'body': json.dumps({'message': 'Failed to generate unique booking ID'})
            }

        dynamodb.put_item(
            TableName=os.environ['TABLE_NAME'],
            Item={
                'bookingID': {'S': booking_id},
                'vehicleID': {'S': vehicle_id},
                'startTime': {'S': start_time},
                'endTime': {'S': end_time},
                'email': {'S': email},
                'status': {'S': 'pending'},
                'createdAt': {'S': datetime.now().isoformat()}
            }
        )

        booking_request = {
            'bookingID': booking_id,
            'vehicleID': vehicle_id,
            'startTime': start_time,
            'endTime': end_time,
            'email': email,
            'status': 'pending'
        }
        sns.publish(
            TopicArn=os.environ['SNS_TOPIC_ARN'],
            Message=json.dumps(booking_request),
            Subject='New eBike Booking Request'
        )
        print(f"Published booking request {booking_id} to SNS topic")

        return {
            'statusCode': 200,
            'headers': {
                'Access-Control-Allow-Origin': '*',
                'Access-Control-Allow-Headers': 'Content-Type,Authorization,X-Amz-Date,X-Api-Key,X-Amz-Security-Token',
                'Access-Control-Allow-Methods': 'POST,OPTIONS'
            },
            'body': json.dumps({'message': 'Booking request submitted for approval', 'bookingID': booking_id})
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