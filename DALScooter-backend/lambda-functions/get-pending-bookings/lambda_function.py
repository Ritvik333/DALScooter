import json
import boto3
import os

dynamodb = boto3.resource('dynamodb')
bookings_table = dynamodb.Table(os.environ['TABLE_NAME'])
vehicles_table = dynamodb.Table(os.environ['VEHICLES_TABLE_NAME'])

def handler(event, context):
    try:
        email = event['queryStringParameters'].get('email')
        if not email:
            return {
                'statusCode': 400,
                'headers': {
                    'Access-Control-Allow-Origin': '*',
                    'Access-Control-Allow-Headers': 'Content-Type,Authorization,X-Amz-Date,X-Api-Key,X-Amz-Security-Token',
                    'Access-Control-Allow-Methods': 'GET,OPTIONS'
                },
                'body': json.dumps({'error': 'Email parameter is required'})
            }

        # Fetch vehicles managed by the operator
        vehicles_response = vehicles_table.scan(
            FilterExpression='op_email = :email',
            ExpressionAttributeValues={':email': email}
        )
        operator_vehicle_ids = [item['vehicleID'] for item in vehicles_response.get('Items', [])]

        if not operator_vehicle_ids:
            return {
                'statusCode': 200,
                'headers': {
                    'Access-Control-Allow-Origin': '*',
                    'Access-Control-Allow-Headers': 'Content-Type,Authorization,X-Amz-Date,X-Api-Key,X-Amz-Security-Token',
                    'Access-Control-Allow-Methods': 'GET,OPTIONS'
                },
                'body': json.dumps([])
            }

        # Fetch pending bookings for those vehicles
        bookings_response = bookings_table.scan(
            FilterExpression='vehicleID IN ({}) AND #status = :status'.format(', '.join(':' + str(i) for i in range(len(operator_vehicle_ids)))),
            ExpressionAttributeNames={'#status': 'status'},
            ExpressionAttributeValues={':status': 'pending', **{f':{i}': vid for i, vid in enumerate(operator_vehicle_ids)}}
        )
        pending_bookings = bookings_response.get('Items', [])

        return {
            'statusCode': 200,
            'headers': {
                'Access-Control-Allow-Origin': '*',
                'Access-Control-Allow-Headers': 'Content-Type,Authorization,X-Amz-Date,X-Api-Key,X-Amz-Security-Token',
                'Access-Control-Allow-Methods': 'GET,OPTIONS'
            },
            'body': json.dumps(pending_bookings)
        }
    except Exception as e:
        return {
            'statusCode': 500,
            'headers': {
                'Access-Control-Allow-Origin': '*',
                'Access-Control-Allow-Headers': 'Content-Type,Authorization,X-Amz-Date,X-Api-Key,X-Amz-Security-Token',
                'Access-Control-Allow-Methods': 'GET,OPTIONS'
            },
            'body': json.dumps({'error': str(e)})
        }