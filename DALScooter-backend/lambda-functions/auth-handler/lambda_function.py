import json
import boto3
import os
import hashlib
import random
import string
from botocore.exceptions import ClientError
import datetime

# Initialize AWS Cognito, DynamoDB, and SNS clients
cognito = boto3.client('cognito-idp')
dynamodb = boto3.resource('dynamodb')
table = dynamodb.Table(os.environ['DYNAMODB_TABLE'])
sns_client = boto3.client('sns')

def lambda_handler(event, context):
    # Handle Cognito Lambda triggers
    if 'triggerSource' in event:
        if event['triggerSource'] == 'DefineAuthChallenge_Authentication':
            return define_auth_challenge(event)
        elif event['triggerSource'] == 'CreateAuthChallenge_Authentication':
            return create_auth_challenge(event)
        elif event['triggerSource'] == 'VerifyAuthChallengeResponse_Authentication':
            return verify_auth_challenge_response(event)
        elif event['triggerSource'] == 'PostConfirmation_ConfirmSignUp':
            return post_confirmation_handler(event)
        else:
            return {
                'statusCode': 400,
                'body': json.dumps({'message': 'Unsupported trigger source'})
            }
    # Handle API Gateway requests
    else:
        return api_gateway_handler(event, context)

def api_gateway_handler(event, context):
    try:
        body = json.loads(event['body'])
        action = body.get('action', 'login')
        user_pool_id = os.environ['USER_POOL_ID']
        client_id = os.environ['USER_POOL_CLIENT_ID']

        if action == 'signup':
            email = body.get('email')
            password = body.get('password')
            name = body.get('name')
            role = body.get('role', 'Customer')
            security_question = body.get('security_question')
            security_answer = body.get('security_answer')
            otp = body.get('otp')

            if not email or not password:
                return {
                    'statusCode': 400,
                    'body': json.dumps({'message': 'Missing email or password'})
                }

            if otp:
                cognito.confirm_sign_up(
                    ClientId=client_id,
                    Username=email,
                    ConfirmationCode=otp
                )
                # logger.info(f"Subscribed email {email} to topic {topic_arn}")
                user_data = table.get_item(Key={'userID': email}).get('Item', {})
                topic_arn = user_data.get('topicArn')
                if not topic_arn:
                    return {
                        'statusCode': 400,
                        'headers': {
                            "Access-Control-Allow-Origin": "*",
                            "Access-Control-Allow-Headers": "Content-Type, Authorization",
                            "Access-Control-Allow-Methods": "POST, OPTIONS"
                        },
                        'body': json.dumps({'message': 'Topic ARN not found. Subscription may not be set up.'})
                    }
                # Send a welcome email via SNS
                welcome_message = f"Welcome to DALScooter, {name}! Your account is now active. This is a test email from your notification topic."
                sns_client.publish(
                    TopicArn=topic_arn,
                    Message=welcome_message,
                    Subject="Welcome to DALScooter"
                )
                return {
                    'statusCode': 200,
                    'headers': {
                        "Access-Control-Allow-Origin": "*",
                        "Access-Control-Allow-Headers": "Content-Type, Authorization",
                        "Access-Control-Allow-Methods": "POST, OPTIONS"
                    },
                    'body': json.dumps({'message': 'Registration and email verification successful.'})
                }

            # Register user with Cognito
            response = cognito.sign_up(
                ClientId=client_id,
                Username=email,
                Password=password,
                UserAttributes=[
                    {'Name': 'email', 'Value': email},
                    {'Name': 'custom:custom:role', 'Value': role},
                    {'Name': 'name', 'Value': name}
                ]
            )

            # Hash and store security answer in DynamoDB with name and role
            if security_question and security_answer:
                hashed_answer = hashlib.sha256(security_answer.encode()).hexdigest()
                table.put_item(
                    Item={
                        'userID': email,
                        'name': name,
                        'role': role,
                        'securityQuestion': security_question,
                        'hashedAnswer': hashed_answer,
                        'validated': False,
                        'cipherPlain': None,
                        'cipherShift': None,
                        'cipherValidated': False
                    }
                )
                # Manually create SNS topic after OTP verification
                topic_name = f"DALScooter-Notifications-{email.replace('@', '-').replace('.', '-')}"
                response = sns_client.create_topic(Name=topic_name)
                topic_arn = response['TopicArn']
                # logger.info(f"Created SNS topic: {topic_arn} for email: {email}")
                
                # Store topic ARN in DynamoDB
                table.update_item(
                    Key={'userID': email},
                    UpdateExpression='SET topicArn = :arn',
                    ExpressionAttributeValues={':arn': topic_arn}
                )

                sns_client.subscribe(
                    TopicArn=topic_arn,
                    Protocol='email',
                    Endpoint=email
                )

            return {
                'statusCode': 200,
                'headers': {
                    "Access-Control-Allow-Origin": "*",
                    "Access-Control-Allow-Headers": "Content-Type, Authorization",
                    "Access-Control-Allow-Methods": "POST, OPTIONS"
                },
                'body': json.dumps({'message': 'Registration successful. OTP sent to email. Provide OTP to verify and confirm subscription to SNS topic!'})
            }

        elif action == 'login':
            email = body.get('email')
            password = body.get('password')

            if not email or not password:
                return {
                    'statusCode': 400,
                    'body': json.dumps({'message': 'Missing email or password'})
                }

            response = cognito.initiate_auth(
                ClientId=client_id,
                AuthFlow='CUSTOM_AUTH',
                AuthParameters={'USERNAME': email, 'PASSWORD': password}
            )

            if 'AuthenticationResult' in response:
                id_token = response['AuthenticationResult']['IdToken']
                access_token = response['AuthenticationResult']['AccessToken']
                user_response = table.get_item(Key={'userID': email}).get('Item', {})
                role = user_response.get('role', 'customer')
                topic_arn = user_response.get('topicArn')
                if not topic_arn:
                    return {
                        'statusCode': 400,
                        'headers': {
                            "Access-Control-Allow-Origin": "*",
                            "Access-Control-Allow-Headers": "Content-Type, Authorization",
                            "Access-Control-Allow-Methods": "POST, OPTIONS"
                        },
                        'body': json.dumps({'message': 'Topic ARN not found. Subscription may not be set up.'})
                    }
                # Send a welcome email via SNS
                welcome_message = f"Hello {user_response.get('name', 'User')}! You have successfully logged into DALScooter at {datetime.datetime.utcnow().strftime('%Y-%m-%d %H:%M:%S UTC')}. If this was not you, contact support immediately."
                sns_client.publish(
                    TopicArn=topic_arn,
                    Message=welcome_message,
                    Subject="Welcome to DALScooter"
                )
                return {
                    'statusCode': 200,
                    'headers': {
                        "Access-Control-Allow-Origin": "*",
                        "Access-Control-Allow-Headers": "Content-Type, Authorization",
                        "Access-Control-Allow-Methods": "POST, OPTIONS"
                    },
                    'body': json.dumps({'message': 'Login successful', 'idToken': id_token, 'AccessToken': access_token, 'role': role})
                }
            
            user_response = table.get_item(Key={'userID': email})
            security_question = user_response.get('Item', {}).get('securityQuestion')

            if not security_question:
                return {
                    'statusCode': 400,
                    'headers': {
                        'Access-Control-Allow-Origin': '*',
                        'Access-Control-Allow-Headers': 'Content-Type,Authorization',
                        'Access-Control-Allow-Methods': 'POST,OPTIONS'
                    },
                    'body': json.dumps({'message': 'Security question not found for user'})
                }
            return {
                'statusCode': 201,
                'headers': {
                    "Access-Control-Allow-Origin": "*",
                    "Access-Control-Allow-Headers": "Content-Type, Authorization",
                    "Access-Control-Allow-Methods": "POST, OPTIONS"
                },
                'body': json.dumps({'message': 'Authentication challenge required', 'session': response['Session'], 'securityQuestion': security_question})
            }

        elif action == 'respond_to_challenge':
            email = body.get('email')
            session = body.get('session')
            answer = body.get('answer')

            if not email or not session or not answer:
                return {
                    'statusCode': 400,
                    'headers': {
                        "Access-Control-Allow-Origin": "*",
                        "Access-Control-Allow-Headers": "Content-Type, Authorization",
                        "Access-Control-Allow-Methods": "POST, OPTIONS"
                    },
                    'body': json.dumps({'message': 'Missing email, session, or answer'})
                }

            response = cognito.respond_to_auth_challenge(
                ClientId=client_id,
                ChallengeName='CUSTOM_CHALLENGE',
                Session=session,
                ChallengeResponses={'USERNAME': email, 'ANSWER': answer}
            )

            if 'AuthenticationResult' in response:
                id_token = response['AuthenticationResult']['IdToken']
                access_token = response['AuthenticationResult']['AccessToken']
                user_response = table.get_item(Key={'userID': email}).get('Item', {})
                role = user_response.get('role', 'customer')
                topic_arn = user_response.get('topicArn')
                if not topic_arn:
                    return {
                        'statusCode': 400,
                        'headers': {
                            "Access-Control-Allow-Origin": "*",
                            "Access-Control-Allow-Headers": "Content-Type, Authorization",
                            "Access-Control-Allow-Methods": "POST, OPTIONS"
                        },
                        'body': json.dumps({'message': 'Topic ARN not found. Subscription may not be set up.'})
                    }
                # Send a welcome email via SNS
                welcome_message = f"Hello {user_response.get('name', 'User')}! You have successfully logged into DALScooter at {datetime.datetime.utcnow().strftime('%Y-%m-%d %H:%M:%S UTC')}. If this was not you, contact support immediately."
                sns_client.publish(
                    TopicArn=topic_arn,
                    Message=welcome_message,
                    Subject="Welcome to DALScooter"
                )
                return {
                    'statusCode': 200,
                    'headers': {
                        "Access-Control-Allow-Origin": "*",
                        "Access-Control-Allow-Headers": "Content-Type, Authorization",
                        "Access-Control-Allow-Methods": "POST, OPTIONS"
                    },
                    'body': json.dumps({'message': 'Login successful', 'idToken': id_token, 'AccessToken': access_token, 'role': role})
                }
            elif 'ChallengeName' in response:
                challenge_params = response.get('ChallengeParameters', {})
                return {
                    'statusCode': 201,
                    'headers': {
                        "Access-Control-Allow-Origin": "*",
                        "Access-Control-Allow-Headers": "Content-Type, Authorization",
                        "Access-Control-Allow-Methods": "POST, OPTIONS"
                    },
                    'body': json.dumps({
                        'message': 'Authentication challenge required',
                        'challenge': challenge_params.get('type', 'security_question'),
                        'cipherText': challenge_params.get('cipherText'),
                        'session': response['Session']
                    })
                }
            else:
                return {
                    'statusCode': 401,
                    'body': json.dumps({'message': 'Authentication failed'})
                }

        elif action == 'change_password':
            email = body.get('email')
            old_password = body.get('oldPassword')
            new_password = body.get('newPassword')
            session = body.get('session')

            if not email or not old_password or not new_password or not session:
                return {
                    'statusCode': 400,
                    'body': json.dumps({'message': 'Missing email, oldPassword, newPassword, or session'})
                }

            response = cognito.respond_to_auth_challenge(
                ClientId=client_id,
                ChallengeName='NEW_PASSWORD_REQUIRED',
                Session=session,
                ChallengeResponses={'USERNAME': email, 'NEW_PASSWORD': new_password}
            )

            id_token = response['AuthenticationResult']['IdToken']
            return {
                'statusCode': 200,
                'body': json.dumps({'message': 'Password changed successfully', 'idToken': id_token})
            }

        elif action == 'logout':
            email = body.get('email')
            access_token = body.get('accessToken')

            if not email or not access_token:
                logger.error("Missing email or accessToken")
                return {
                    'statusCode': 400,
                    'body': json.dumps({'message': 'Missing email or accessToken'})
                }

            cognito.global_sign_out(AccessToken=access_token)
            table.update_item(
                Key={'userID': email},
                UpdateExpression='SET validated = :val, cipherValidated = :val',
                ExpressionAttributeValues={':val': False}
            )
            return {
                'statusCode': 200,
                'headers': {
                    "Access-Control-Allow-Origin": "*",
                    "Access-Control-Allow-Headers": "Content-Type, Authorization",
                    "Access-Control-Allow-Methods": "POST, OPTIONS"
                },
                'body': json.dumps({'message': 'Logout successful. All sessions invalidated.'})
            }

        else:
            return {
                'statusCode': 400,
                'body': json.dumps({'message': 'Invalid action'})
            }

    except ClientError as e:
        error_message = e.response['Error']['Message']
        return {
            'statusCode': 500,
            'body': json.dumps({'message': 'Internal server error', 'error': error_message})
        }
    except Exception as e:
        return {
            'statusCode': 500,
            'body': json.dumps({'message': 'Internal server error', 'error': str(e)})
        }

def generate_caesar_challenge():
    shift = 1
    text = ''.join(random.choices(string.ascii_lowercase, k=5))
    cipher = ''.join(chr(((ord(c) - 97 + shift) % 26) + 97) for c in text)
    return text, cipher, shift

def define_auth_challenge(event):
    email = event['request']['userAttributes']['email']
    item = table.get_item(Key={'userID': email}).get('Item')
    
    if item and not item.get('validated', False):
        event['response']['challengeName'] = 'CUSTOM_CHALLENGE'
        event['response']['issueTokens'] = False
        event['response']['failAuthentication'] = False
    elif item and not item.get('cipherValidated', False):
        event['response']['challengeName'] = 'CUSTOM_CHALLENGE'
        event['response']['issueTokens'] = False
        event['response']['failAuthentication'] = False
    else:
        event['response']['challengeName'] = 'PASSWORD_VERIFIER'
        event['response']['issueTokens'] = True
        event['response']['failAuthentication'] = False
    
    return event

def create_auth_challenge(event):
    email = event['request']['userAttributes']['email']
    item = table.get_item(Key={'userID': email}).get('Item')
    
    if item and not item.get('validated', False):
        event['response']['publicChallengeParameters'] = {'securityQuestion': item['securityQuestion']}
        event['response']['privateChallengeParameters'] = {'hashedAnswer': item['hashedAnswer']}
    elif item and not item.get('cipherValidated', False):
        plain, ciphered, shift = generate_caesar_challenge()
        table.update_item(
            Key={'userID': email},
            UpdateExpression='SET cipherPlain = :plain, cipherShift = :shift',
            ExpressionAttributeValues={':plain': plain, ':shift': shift}
        )
        event['response']['publicChallengeParameters'] = {'type': 'cipher', 'cipherText': ciphered}
        event['response']['privateChallengeParameters'] = {'expectedAnswer': plain}

    event['response']['challengeMetadata'] = 'SECURITY_CHALLENGE'
    return event

def verify_auth_challenge_response(event):
    email = event['request']['userAttributes']['email']
    user_answer = event['request']['challengeAnswer']
    item = table.get_item(Key={'userID': email}).get('Item')
    
    if item and not item.get('validated', False):
        hashed_input = hashlib.sha256(user_answer.encode()).hexdigest()
        if hashed_input == item['hashedAnswer']:
            table.update_item(
                Key={'userID': email},
                UpdateExpression='SET validated = :val',
                ExpressionAttributeValues={':val': True}
            )
            event['response']['answerCorrect'] = True
        else:
            event['response']['answerCorrect'] = False
    elif item and not item.get('cipherValidated', False):
        if user_answer.lower() == item['cipherPlain']:
            table.update_item(
                Key={'userID': email},
                UpdateExpression='SET cipherValidated = :val',
                ExpressionAttributeValues={':val': True}
            )
            event['response']['answerCorrect'] = True
        else:
            event['response']['answerCorrect'] = False
    return event

def post_confirmation_handler(event):
    """Create a user-specific SNS topic after email confirmation"""
    try:
        email = event['request']['userAttributes']['email']
        topic_name = f"DALScooter-Notifications-{email.replace('@', '-').replace('.', '-')}"
        response = sns_client.create_topic(Name=topic_name)
        topic_arn = response['TopicArn']
        logger.info(f"Created SNS topic: {topic_arn} for email: {email}")
        
        # Store topic ARN in DynamoDB (optional, for reference)
        table.update_item(
            Key={'userID': email},
            UpdateExpression='SET topicArn = :arn',
            ExpressionAttributeValues={':arn': topic_arn}
        )
        
        return event
    except ClientError as e:
        logger.error(f"Error creating SNS topic for {email}: {str(e)}")
        raise
    except Exception as e:
        logger.error(f"Unexpected error in post_confirmation_handler: {str(e)}")
        raise