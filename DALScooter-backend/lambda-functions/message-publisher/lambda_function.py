import json
import boto3
import uuid
import os
from datetime import datetime
import logging

# Configure logging
logger = logging.getLogger()
logger.setLevel(logging.INFO)

# Initialize AWS clients
sns_client = boto3.client('sns')
dynamodb = boto3.resource('dynamodb')

# Get environment variables
SNS_TOPIC_ARN = os.environ.get('SNS_TOPIC_ARN')
MESSAGE_TABLE_NAME = os.environ.get('MESSAGE_TABLE_NAME')

def lambda_handler(event, context):
    """
    Lambda function to publish customer concerns to SNS topic
    
    Expected event format:
    {
        "customerId": "customer123",
        "bookingReferenceCode": "BOOK123",
        "concernMessage": "My scooter battery died early.",
        "contactEmail": "customer@example.com"
    }
    """
    try:
        logger.info("Received event: %s", json.dumps(event))
        
        # Check if the event is from API Gateway
        if 'body' in event:
            # Parse the request body
            if isinstance(event['body'], str):
                body = json.loads(event['body'])
            else:
                body = event['body']
        else:
            body = event
        
        # Validate required fields
        required_fields = ['customerId', 'bookingReferenceCode', 'concernMessage']
        for field in required_fields:
            if field not in body:
                logger.error(f"Missing required field: {field}")
                return {
                    'statusCode': 400,
                    'headers': {'Content-Type': 'application/json'},
                    'body': json.dumps({'error': f"Missing required field: {field}"})
                }
        
        # Generate unique message ID
        message_id = str(uuid.uuid4())
        timestamp = datetime.now().isoformat()
        
        # Create message payload
        message_payload = {
            'messageId': message_id,
            'customerId': body['customerId'],
            'bookingReferenceCode': body['bookingReferenceCode'],
            'concernMessage': body['concernMessage'],
            'contactEmail': body.get('contactEmail', ''),
            'timestamp': timestamp,
            'status': 'SUBMITTED'
        }
        
        # Publish message to SNS topic
        logger.info(f"Publishing message to SNS topic: {SNS_TOPIC_ARN}")
        response = sns_client.publish(
            TopicArn=SNS_TOPIC_ARN,
            Message=json.dumps(message_payload),
            MessageAttributes={
                'MessageType': {
                    'DataType': 'String',
                    'StringValue': 'CustomerConcern'
                }
            }
        )
        
        # Log message to DynamoDB
        table = dynamodb.Table(MESSAGE_TABLE_NAME)
        table.put_item(Item={
            'messageId': message_id,
            'customerId': body['customerId'],
            'bookingReferenceCode': body['bookingReferenceCode'],
            'concernMessage': body['concernMessage'],
            'contactEmail': body.get('contactEmail', ''),
            'timestamp': timestamp,
            'status': 'SUBMITTED',
            'messageType': 'CUSTOMER_TO_FRANCHISE',
            'franchiseOperatorId': None,
            'responseMessage': None,
            'responseTimestamp': None
        })
        
        logger.info(f"Message published successfully with MessageId: {response['MessageId']}")
        
        return {
            'statusCode': 200,
            'headers': {
                'Access-Control-Allow-Origin': '*',
                'Access-Control-Allow-Headers': 'Content-Type,Authorization',
                'Access-Control-Allow-Methods': 'POST,OPTIONS'
            },
            'body': json.dumps({
                'success': True,
                'messageId': message_id,
                'message': 'Concern submitted successfully',
                'timestamp': timestamp
            })
        }
        
    except Exception as e:
        logger.error(f"Error processing request: {str(e)}")
        return {
            'statusCode': 500,
            'headers': {'Content-Type': 'application/json'},
            'body': json.dumps({
                'success': False,
                'error': str(e)
            })
        }