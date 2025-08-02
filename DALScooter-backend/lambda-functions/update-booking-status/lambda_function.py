import json
import boto3
import os

dynamodb = boto3.resource('dynamodb')
bookings_table = dynamodb.Table(os.environ['TABLE_NAME'])
sns = boto3.client('sns')

def handler(event, context):
    try:
        body = json.loads(event.get('body', '{}'))
        booking_id = body.get('bookingID')
        action = body.get('action').lower()

        if not booking_id or action not in ['accept', 'deny']:
            return {
                'statusCode': 400,
                'headers': {
                    'Access-Control-Allow-Origin': '*',
                    'Access-Control-Allow-Headers': 'Content-Type,Authorization,X-Amz-Date,X-Api-Key,X-Amz-Security-Token',
                    'Access-Control-Allow-Methods': 'POST,OPTIONS'
                },
                'body': json.dumps({'error': 'bookingID and valid action (accept/deny) are required'})
            }

        new_status = 'confirmed' if action == 'accept' else 'denied'
        bookings_table.update_item(
            Key={'bookingID': booking_id},
            UpdateExpression='SET #status = :status',
            ExpressionAttributeNames={'#status': 'status'},
            ExpressionAttributeValues={':status': new_status}
        )

        # Optional: Notify user via SNS (e.g., using email from booking)
        booking = bookings_table.get_item(Key={'bookingID': booking_id}).get('Item', {})
        if booking and 'email' in booking:
            sns.publish(
                TopicArn=os.environ['OPERATOR_TOPIC_ARN'],
                Message=f'Your booking {booking_id} has been {new_status}.',
                Subject=f'Booking {booking_id} Update'
            )

        return {
            'statusCode': 200,
            'headers': {
                'Access-Control-Allow-Origin': '*',
                'Access-Control-Allow-Headers': 'Content-Type,Authorization,X-Amz-Date,X-Api-Key,X-Amz-Security-Token',
                'Access-Control-Allow-Methods': 'POST,OPTIONS'
            },
            'body': json.dumps({'message': f'Booking {booking_id} {new_status} successfully'})
        }
    except Exception as e:
        return {
            'statusCode': 500,
            'headers': {
                'Access-Control-Allow-Origin': '*',
                'Access-Control-Allow-Headers': 'Content-Type,Authorization,X-Amz-Date,X-Api-Key,X-Amz-Security-Token',
                'Access-Control-Allow-Methods': 'POST,OPTIONS'
            },
            'body': json.dumps({'error': str(e)})
        }