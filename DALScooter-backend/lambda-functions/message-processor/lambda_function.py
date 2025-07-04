import json
import boto3
import os
import random
from datetime import datetime
import logging

# Configure logging
logger = logging.getLogger()
logger.setLevel(logging.INFO)

# Initialize AWS clients
dynamodb = boto3.resource('dynamodb')
sns_client = boto3.client('sns')
ses_client = boto3.client('ses')

# Get environment variables
MESSAGE_TABLE_NAME = os.environ.get('MESSAGE_TABLE_NAME')
FRANCHISE_TABLE_NAME = os.environ.get('FRANCHISE_TABLE_NAME')
NOTIFICATION_TOPIC_ARN = os.environ.get('NOTIFICATION_TOPIC_ARN')
FROM_EMAIL = os.environ.get('FROM_EMAIL')

def lambda_handler(event, context):
    """
    Lambda function to process messages from SQS queue
    and forward them to a random franchise operator
    """
    try:
        logger.info("Received event: %s", json.dumps(event))
        
        # Process SQS records
        if 'Records' in event:
            for record in event['Records']:
                if 'body' in record:
                    # Parse the message body
                    if record.get('eventSource') == 'aws:sqs':
                        body = json.loads(record['body'])
                        
                        # If the message is from SNS, extract the actual message
                        if 'Message' in body:
                            message_payload = json.loads(body['Message'])
                        else:
                            message_payload = body
                        
                        # Process the customer concern
                        process_customer_concern(message_payload)
        
        return {
            'statusCode': 200,
            'body': json.dumps({'message': 'Messages processed successfully'})
        }
        
    except Exception as e:
        logger.error(f"Error processing messages: {str(e)}")
        return {
            'statusCode': 500,
            'body': json.dumps({'error': str(e)})
        }

def process_customer_concern(message):
    """Process a customer concern and assign it to a random franchise operator"""
    try:
        message_id = message.get('messageId')
        booking_reference = message.get('bookingReferenceCode')
        customer_id = message.get('customerId')
        concern_message = message.get('concernMessage')
        
        logger.info(f"Processing customer concern for booking: {booking_reference}")
        
        # Get a list of active franchise operators
        franchise_operators = get_active_franchise_operators()
        
        if not franchise_operators:
            logger.warning("No active franchise operators found")
            update_message_status(message_id, 'PENDING', 'No franchise operators available')
            return
        
        # Select a random franchise operator
        selected_operator = random.choice(franchise_operators)
        franchise_operator_id = selected_operator['franchiseOperatorId']
        
        logger.info(f"Selected franchise operator: {franchise_operator_id}")
        
        # Update the message in DynamoDB
        update_message_status(
            message_id, 
            'ASSIGNED', 
            f"Assigned to operator: {franchise_operator_id}",
            franchise_operator_id
        )
        
        # Notify the franchise operator
        notify_franchise_operator(
            selected_operator,
            message_id,
            booking_reference,
            customer_id,
            concern_message
        )
        
    except Exception as e:
        logger.error(f"Error processing customer concern: {str(e)}")
        if message_id:
            update_message_status(message_id, 'ERROR', str(e))

def get_active_franchise_operators():
    """Get a list of active franchise operators from DynamoDB"""
    try:
        table = dynamodb.Table(FRANCHISE_TABLE_NAME)
        response = table.scan(
            FilterExpression="userRole = :role AND userStatus = :status",
            ExpressionAttributeValues={
                ":role": "FRANCHISE_OPERATOR",
                ":status": "ACTIVE"
            }
        )
        
        return response.get('Items', [])
        
    except Exception as e:
        logger.error(f"Error getting franchise operators: {str(e)}")
        return []

def update_message_status(message_id, status, status_message, franchise_operator_id=None):
    """Update the status of a message in DynamoDB"""
    try:
        table = dynamodb.Table(MESSAGE_TABLE_NAME)
        
        update_expression = "SET #status = :status, statusMessage = :statusMessage"
        expression_attribute_names = {'#status': 'status'}
        expression_attribute_values = {
            ':status': status,
            ':statusMessage': status_message
        }
        
        if franchise_operator_id:
            update_expression += ", franchiseOperatorId = :franchiseOperatorId"
            expression_attribute_values[':franchiseOperatorId'] = franchise_operator_id
        
        table.update_item(
            Key={'messageId': message_id},
            UpdateExpression=update_expression,
            ExpressionAttributeNames=expression_attribute_names,
            ExpressionAttributeValues=expression_attribute_values
        )
        
        logger.info(f"Updated message status to {status}: {message_id}")
        
    except Exception as e:
        logger.error(f"Error updating message status: {str(e)}")

def notify_franchise_operator(operator, message_id, booking_reference, customer_id, concern_message):
    """Notify the franchise operator about the new customer concern"""
    try:
        # Publish notification to SNS
        notification_payload = {
            'messageId': message_id,
            'franchiseOperatorId': operator['franchiseOperatorId'],
            'franchiseOperatorEmail': operator.get('email', ''),
            'bookingReferenceCode': booking_reference,
            'customerId': customer_id,
            'concernMessage': concern_message,
            'notificationType': 'NEW_CUSTOMER_CONCERN',
            'timestamp': datetime.now().isoformat()
        }
        
        sns_client.publish(
            TopicArn=NOTIFICATION_TOPIC_ARN,
            Message=json.dumps(notification_payload),
            MessageAttributes={
                'NotificationType': {
                    'DataType': 'String',
                    'StringValue': 'NEW_CUSTOMER_CONCERN'
                }
            }
        )
        
        # If operator has email, send direct email notification
        if 'email' in operator and FROM_EMAIL:
            send_email_notification(
                operator['email'],
                message_id,
                booking_reference,
                concern_message
            )
        
        logger.info(f"Notification sent to franchise operator: {operator['franchiseOperatorId']}")
        
    except Exception as e:
        logger.error(f"Error sending notification: {str(e)}")

def send_email_notification(email, message_id, booking_reference, concern_message):
    """Send an email notification to the franchise operator"""
    try:
        subject = f"New Customer Concern - Booking {booking_reference}"
        body_html = f"""
        <html>
        <head></head>
        <body>
            <h2>New Customer Concern</h2>
            <p>A new customer concern has been assigned to you.</p>
            <ul>
                <li><strong>Message ID:</strong> {message_id}</li>
                <li><strong>Booking Reference:</strong> {booking_reference}</li>
                <li><strong>Customer Message:</strong> {concern_message}</li>
            </ul>
            <p>Please log in to the DALScooter admin portal to respond to this concern.</p>
        </body>
        </html>
        """
        
        ses_client.send_email(
            Source=FROM_EMAIL,
            Destination={'ToAddresses': [email]},
            Message={
                'Subject': {'Data': subject},
                'Body': {'Html': {'Data': body_html}}
            }
        )
        
        logger.info(f"Email notification sent to: {email}")
        
    except Exception as e:
        logger.error(f"Error sending email notification: {str(e)}")