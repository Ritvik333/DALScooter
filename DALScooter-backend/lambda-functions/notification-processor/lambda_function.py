import json
import logging
import boto3
import os

# Configure logging
logger = logging.getLogger()
logger.setLevel(logging.INFO)

# Initialize clients
sns_client = boto3.client('sns')
dynamodb = boto3.resource('dynamodb')
table = dynamodb.Table(os.environ['DYNAMODB_TABLE'])

def lambda_handler(event, context):
    """
    Lambda function to process SNS notifications and publish to user-specific topic
    """
    try:
        logger.info("Received event: %s", json.dumps(event))
        
        for record in event['Records']:
            if record['EventSource'] == 'aws:sns':
                # Get franchiseOperatorId from MessageAttributes
                franchise_operator_email = record['Sns']['MessageAttributes'].get('franchiseOperatorId', {}).get('Value')
                
                if not franchise_operator_email:
                    logger.warning("No franchiseOperatorId in MessageAttributes")
                    continue
                
                logger.info(f"Processing notification for email: {franchise_operator_email}")
                process_notification(record['Sns']['Message'], franchise_operator_email)
        
        return {
            'statusCode': 200,
            'body': json.dumps({'message': 'Notifications processed successfully'})
        }
        
    except Exception as e:
        logger.error(f"Error processing notifications: {str(e)}")
        return {
            'statusCode': 500,
            'body': json.dumps({'error': str(e)})
        }

def process_notification(message, franchise_operator_email):
    """Process the notification and publish to the user-specific topic"""
    try:
        # Use the raw message as is since it's plain text
        booking_reference = None
        concern_message = message  # Default to the entire message if parsing fails
        
        # Attempt to extract booking reference and concern from the message (basic parsing)
        lines = message.split('\n')
        for line in lines:
            if 'Booking Reference:' in line:
                booking_reference = line.replace('Booking Reference:', '').strip()
            elif 'Concern:' in line:
                concern_message = line.replace('Concern:', '').strip()
        
        # Retrieve the topic ARN from DynamoDB
        response = table.get_item(Key={'userID': franchise_operator_email})
        item = response.get('Item')
        if not item or 'topicArn' not in item:
            logger.error(f"No topic ARN found for email: {franchise_operator_email}")
            return
        
        topic_arn = item['topicArn']
        readable_message = f"New Customer Concern for Booking {booking_reference or 'N/A'}:\nConcern: {concern_message}"
        
        sns_client.publish(
            TopicArn=topic_arn,
            Message=readable_message,
            Subject="New Customer Concern"
        )
        
        logger.info(f"Notification published to {topic_arn} for {franchise_operator_email}")
        
    except Exception as e:
        logger.error(f"Error processing notification for {franchise_operator_email}: {str(e)}")