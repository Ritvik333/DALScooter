import json
import boto3
import os
from botocore.exceptions import ClientError

# Initialize AWS Cognito client
cognito = boto3.client('cognito-idp')

def lambda_handler(event, context):
    try:
        body = json.loads(event['body'])
        action = body.get('action', 'login')
        user_pool_id = os.environ['USER_POOL_ID']
        client_id = os.environ['USER_POOL_CLIENT_ID']

        if action == 'signup':
            email = body.get('email')
            password = body.get('password')
            role = body.get('role', 'Registered Customer')
            otp = body.get('otp')  # Add OTP field for verification

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
                return {
                    'statusCode': 200,
                    'body': json.dumps({'message': 'Registration and email verification successful.'})
                }
            # Register user with Cognito
            response = cognito.sign_up(
                ClientId=client_id,
                Username=email,
                Password=password,
                UserAttributes=[
                    {'Name': 'email', 'Value': email},
                    {'Name': 'custom:custom:role', 'Value': role}
                ]
            )

            return {
                'statusCode': 200,
                'body': json.dumps({'message': 'Registration successful. OTP sent to email. Provide OTP to verify.'})
            }

        elif action == 'login':
            email = body.get('email')
            password = body.get('password')

            if not email or not password:
                return {
                    'statusCode': 400,
                    'body': json.dumps({'message': 'Missing email or password'})
                }

            # Initiate authentication with Cognito
            response = cognito.initiate_auth(
                ClientId=client_id,
                AuthFlow='USER_PASSWORD_AUTH',
                AuthParameters={'USERNAME': email, 'PASSWORD': password}
            )

            # Handle NEW_PASSWORD_REQUIRED challenge
            if 'ChallengeName' in response and response['ChallengeName'] == 'NEW_PASSWORD_REQUIRED':
                # Automatically set a new password (for testing only)
                new_password = "AutoSetPassword123!"  # Change this to a secure default
                cognito.respond_to_auth_challenge(
                    ClientId=client_id,
                    ChallengeName='NEW_PASSWORD_REQUIRED',
                    Session=response['Session'],
                    ChallengeResponses={
                        'USERNAME': email,
                        'NEW_PASSWORD': new_password
                    }
                )
                # Re-authenticate with the new password
                response = cognito.initiate_auth(
                    ClientId=client_id,
                    AuthFlow='USER_PASSWORD_AUTH',
                    AuthParameters={'USERNAME': email, 'PASSWORD': new_password}
                )

            # Authentication successful, return ID token
            id_token = response['AuthenticationResult']['IdToken']
            return {
                'statusCode': 200,
                'body': json.dumps({'message': 'Login successful', 'idToken': id_token})
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

            # Respond to NEW_PASSWORD_REQUIRED challenge
            response = cognito.respond_to_auth_challenge(
                ClientId=client_id,
                ChallengeName='NEW_PASSWORD_REQUIRED',
                Session=session,
                ChallengeResponses={
                    'USERNAME': email,
                    'NEW_PASSWORD': new_password
                }
            )

            # Authentication successful after new password
            id_token = response['AuthenticationResult']['IdToken']
            return {
                'statusCode': 200,
                'body': json.dumps({'message': 'Password changed successfully', 'idToken': id_token})
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