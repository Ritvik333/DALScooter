import json
import uuid
import boto3
import os
import logging
from datetime import datetime

logger = logging.getLogger()
logger.setLevel(logging.INFO)

dynamodb = boto3.resource('dynamodb')
feedback_table_name = os.environ['FEEDBACK_DYNAMODB_TABLE']
feedback_table = dynamodb.Table(feedback_table_name)

def lambda_handler(event, context):
    logger.info(f"Received event: {json.dumps(event)}")
    
    try:
        body = json.loads(event['body'])
        customer_id = body.get('customerId')
        booking_reference_code = body.get('bookingReferenceCode')
        feedback_message = body.get('feedbackMessage')
        contact_email = body.get('contactEmail')

        if not all([customer_id, booking_reference_code, feedback_message, contact_email]):
            return {
                'statusCode': 400,
                'body': json.dumps({'message': 'All fields are required'})
            }

        feedback_id = str(uuid.uuid4())
        item = {
            'feedbackId': feedback_id,
            'customerId': customer_id,
            'bookingReferenceCode': booking_reference_code,
            'feedbackMessage': feedback_message,
            'contactEmail': contact_email,
            'timestamp': datetime.utcnow().isoformat() + 'Z',
            'status': 'submitted'
        }
        feedback_table.put_item(Item=item)

        response = {
            'success': True,
            'feedbackId': feedback_id,
            'message': 'Feedback submitted successfully',
            'timestamp': datetime.utcnow().isoformat() + 'Z'
        }

        return {
            'statusCode': 200,
            'headers': {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*',
                'Access-Control-Allow-Methods': 'POST,OPTIONS',
                'Access-Control-Allow-Headers': 'Content-Type,Authorization'
            },
            'body': json.dumps(response)
        }

    except Exception as e:
        logger.error(f"Error processing request: {str(e)}")
        return {
            'statusCode': 500,
            'body': json.dumps({'message': 'Internal server error', 'error': str(e)})
        }