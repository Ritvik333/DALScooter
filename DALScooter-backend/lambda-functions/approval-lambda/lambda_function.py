import json
import boto3
import os

dynamodb = boto3.client('dynamodb')
sns = boto3.client('sns')

def handler(event, context):
    for record in event['Records']:
        try:
            message = json.loads(record['body'])
            booking_id = message['bookingID']
            vehicle_id = message['vehicleID']
            start_time = message['startTime']
            end_time = message['endTime']
            email = message['email']

            operator_message = f"New booking request for vehicle {vehicle_id} (ID: {booking_id}) from {start_time} to {end_time} by {email}. Approve or reject via app."
            sns.publish(
                TopicArn=os.environ['OPERATOR_TOPIC_ARN'],
                Message=operator_message,
                Subject='eBike Booking Approval Required'
            )
            print(f"Notified operator for booking {booking_id}")

        except Exception as e:
            print(f"Error processing booking {booking_id}: {str(e)}")
            continue

    return {
        'statusCode': 200,
        'body': json.dumps({'message': 'Booking requests processed'})
    }