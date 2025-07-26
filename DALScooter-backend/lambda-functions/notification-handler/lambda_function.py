import json
import boto3
import os
import logging
from datetime import datetime

# Set up logging
logger = logging.getLogger()
logger.setLevel(logging.INFO)

# Initialize AWS clients
sns = boto3.client('sns')
ses = boto3.client('ses')

def lambda_handler(event, context):
    """
    Handles sending notifications via SNS based on the event type
    
    Expected event structure:
    {
        "notificationType": "registration|login|booking_confirmation|booking_failure",
        "email": "user@example.com",
        "subject": "Notification Subject",
        "message": "Notification Message",
        "additionalData": {} // Optional additional data
    }
    """
    try:
        logger.info(f"Received event: {json.dumps(event)}")
        
        # Check if event is from SQS (batch processing)
        if 'Records' in event:
            responses = []
            for record in event['Records']:
                # Process SQS message
                if 'body' in record:
                    message_body = json.loads(record['body'])
                    
                    # If the message is from SNS, extract the actual message
                    if 'Message' in message_body:
                        actual_message = json.loads(message_body['Message'])
                    else:
                        actual_message = message_body
                        
                    response = process_notification(actual_message)
                    responses.append(response)
            
            return {
                'statusCode': 200,
                'body': json.dumps({'message': f'Processed {len(responses)} notifications', 'results': responses})
            }
        else:
            # Direct invocation
            response = process_notification(event)
            return {
                'statusCode': 200, 
                'body': json.dumps({'message': 'Notification sent successfully', 'result': response})
            }
            
    except Exception as e:
        logger.error(f"Error processing notification: {str(e)}")
        return {
            'statusCode': 500,
            'body': json.dumps({'message': 'Error processing notification', 'error': str(e)})
        }

def process_notification(event):
    """Process a single notification event"""
    
    notification_type = event.get('notificationType')
    email = event.get('email')
    subject = event.get('subject', f'DALScooter Notification: {notification_type}')
    message = event.get('message', 'No message provided')
    
    if not notification_type or not email:
        raise ValueError("Missing required fields: notificationType or email")
    
    # Get the appropriate SNS topic ARN based on notification type
    topic_arn = get_topic_arn(notification_type)
    
    # Format the message based on notification type
    formatted_message = format_message(notification_type, message, event.get('additionalData', {}))
    
    # Determine if we should send via SNS, SES, or both
    if notification_type in ['registration', 'login']:
        # These notifications should go directly to the user via email
        response = send_email(email, subject, formatted_message)
    else:
        # For booking confirmations/failures, publish to SNS topic
        response = sns.publish(
            TopicArn=topic_arn,
            Message=json.dumps({
                'notificationType': notification_type,
                'email': email,
                'subject': subject,
                'message': formatted_message,
                'timestamp': datetime.now().isoformat()
            }),
            MessageAttributes={
                'email': {
                    'DataType': 'String',
                    'StringValue': email
                },
                'notificationType': {
                    'DataType': 'String',
                    'StringValue': notification_type
                }
            }
        )
        
        # For important notifications, also send a direct email
        if notification_type in ['booking_confirmation', 'booking_failure']:
            email_response = send_email(email, subject, formatted_message)
            logger.info(f"Email sent to {email}. Response: {email_response}")
    
    logger.info(f"Notification of type {notification_type} sent to {email}")
    return response

def get_topic_arn(notification_type):
    """Get the appropriate SNS topic ARN based on notification type"""
    
    # Map notification types to environment variables containing the topic ARNs
    topic_mapping = {
        'registration': os.environ.get('REGISTRATION_TOPIC_ARN'),
        'login': os.environ.get('LOGIN_TOPIC_ARN'),
        'booking_confirmation': os.environ.get('BOOKING_TOPIC_ARN'),
        'booking_failure': os.environ.get('BOOKING_TOPIC_ARN')
    }
    
    topic_arn = topic_mapping.get(notification_type)
    
    if not topic_arn:
        # Fallback to a default topic if specific one is not found
        topic_arn = os.environ.get('DEFAULT_TOPIC_ARN')
        
    if not topic_arn:
        raise ValueError(f"No SNS topic ARN configured for notification type: {notification_type}")
        
    return topic_arn

def format_message(notification_type, message, additional_data):
    """Format the message based on notification type"""
    
    if notification_type in ['registration', 'login']:
        # For email notifications, format as HTML
        return format_email_html(notification_type, message, additional_data)
    
    # For SNS notifications, format as JSON
    base_message = {
        'message': message,
        'additionalData': additional_data
    }
    
    templates = {
        'registration': "Welcome to DALScooter! Your account has been successfully registered.",
        'login': "You have successfully logged in to your DALScooter account.",
        'booking_confirmation': "Your booking has been confirmed. Your booking reference code is: {}",
        'booking_failure': "We're sorry, but your booking could not be processed."
    }
    
    # Add a default message if one wasn't provided
    if message == 'No message provided':
        template = templates.get(notification_type, "DALScooter Notification")
        
        if notification_type == 'booking_confirmation' and 'bookingID' in additional_data:
            base_message['message'] = template.format(additional_data['bookingID'])
        else:
            base_message['message'] = template
    
    return json.dumps(base_message)

def format_email_html(notification_type, message, additional_data):
    """Format an HTML email based on notification type"""
    
    templates = {
        'registration': {
            'title': 'Welcome to DALScooter!',
            'content': 'Your account has been successfully registered. You can now log in to access all features.'
        },
        'login': {
            'title': 'New Login Detected',
            'content': 'You have successfully logged in to your DALScooter account.'
        },
        'booking_confirmation': {
            'title': 'Booking Confirmation',
            'content': 'Your booking has been confirmed. Details are below:'
        },
        'booking_failure': {
            'title': 'Booking Failed',
            'content': 'We\'re sorry, but your booking could not be processed.'
        }
    }
    
    template = templates.get(notification_type, {
        'title': 'DALScooter Notification',
        'content': message if message != 'No message provided' else 'Thank you for using DALScooter!'
    })
    
    # Override with provided message if available
    if message != 'No message provided':
        template['content'] = message
    
    # Add additional details section for booking confirmations
    additional_content = ""
    if notification_type == 'booking_confirmation' and additional_data:
        additional_content = "<h3>Booking Details:</h3><ul>"
        
        if 'bookingID' in additional_data:
            additional_content += f"<li><strong>Booking Reference:</strong> {additional_data['bookingID']}</li>"
            
        if 'vehicleID' in additional_data:
            additional_content += f"<li><strong>Vehicle ID:</strong> {additional_data['vehicleID']}</li>"
            
        if 'startTime' in additional_data:
            # Format the time to be more readable
            start_time = additional_data['startTime'].replace('T', ' ').replace('Z', '')
            additional_content += f"<li><strong>Start Time:</strong> {start_time}</li>"
            
        if 'endTime' in additional_data:
            # Format the time to be more readable
            end_time = additional_data['endTime'].replace('T', ' ').replace('Z', '')
            additional_content += f"<li><strong>End Time:</strong> {end_time}</li>"
            
        additional_content += "</ul>"
    
    # Build the HTML email
    html_body = f"""
    <!DOCTYPE html>
    <html>
    <head>
        <style>
            body {{ font-family: Arial, sans-serif; line-height: 1.6; color: #333; }}
            .container {{ max-width: 600px; margin: 0 auto; padding: 20px; }}
            .header {{ background-color: #4285f4; color: white; padding: 15px; text-align: center; }}
            .content {{ padding: 20px; background-color: #f9f9f9; }}
            .footer {{ text-align: center; padding: 10px; font-size: 12px; color: #777; }}
        </style>
    </head>
    <body>
        <div class="container">
            <div class="header">
                <h2>{template['title']}</h2>
            </div>
            <div class="content">
                <p>{template['content']}</p>
                {additional_content}
                <p>Thank you for choosing DALScooter!</p>
            </div>
            <div class="footer">
                <p>This is an automated message. Please do not reply to this email.</p>
                <p>&copy; {datetime.now().year} DALScooter. All rights reserved.</p>
            </div>
        </div>
    </body>
    </html>
    """
    
    return html_body

def send_email(to_email, subject, html_content):
    """Send an email using SES"""
    
    try:
        # Get the source email from environment variables, or use a default
        source_email = os.environ.get('FROM_EMAIL', 'noreply@dalscooter.example.com')
        
        response = ses.send_email(
            Source=source_email,
            Destination={
                'ToAddresses': [to_email]
            },
            Message={
                'Subject': {
                    'Data': subject
                },
                'Body': {
                    'Html': {
                        'Data': html_content
                    }
                }
            }
        )
        
        return {
            'success': True,
            'messageId': response['MessageId']
        }
        
    except Exception as e:
        logger.error(f"Error sending email: {str(e)}")
        
        # Verify if SES is set up correctly
        try:
            verified_emails = ses.list_verified_email_addresses()
            logger.info(f"Verified emails: {verified_emails}")
        except Exception as verify_error:
            logger.error(f"Error listing verified emails: {str(verify_error)}")
        
        # Return failure info but don't raise exception
        return {
            'success': False,
            'error': str(e)
        }