import json
import boto3
import os
import secrets
import string

cognito_client = boto3.client('cognito-idp')
dynamodb = boto3.client('dynamodb')

def generate_temp_password(length=12):
    """Generate a random temporary password meeting Cognito requirements."""
    characters = string.ascii_letters + string.digits + string.punctuation
    password = ''.join(secrets.choice(characters) for _ in range(length))
    # Ensure password meets Cognito policy (uppercase, lowercase, number, symbol)
    if not (any(c.isupper() for c in password) and
            any(c.islower() for c in password) and
            any(c.isdigit() for c in password) and
            any(c in string.punctuation for c in password)):
        return generate_temp_password(length)  # Retry if requirements not met
    return password

def lambda_handler(event, context):
    body = json.loads(event.get('body', '{}'))
    action = body.get('action')
    email = body.get('email')
    password = body.get('password')
    role = body.get('role')
    old_password = body.get('oldPassword')
    new_password = body.get('newPassword')
    user_pool_id = os.environ['USER_POOL_ID']
    table_name = os.environ['DYNAMODB_TABLE']

    # Input validation
    if not action or not email:
        return {
            'statusCode': 400,
            'body': json.dumps({'message': 'Missing required fields: action and email'})
        }

    try:
        if action == 'signup':
            if not role or role not in ['Customer', 'Franchise']:
                return {
                    'statusCode': 400,
                    'body': json.dumps({'message': 'Invalid or missing role'})
                }

            # Generate temporary password
            temp_password = generate_temp_password()

            # Create user in Cognito
            response = cognito_client.admin_create_user(
                UserPoolId=user_pool_id,
                Username=email,
                TemporaryPassword=temp_password,
                UserAttributes=[
                    {'Name': 'email', 'Value': email},
                    {'Name': 'role', 'Value': role},
                    {'Name': 'email_verified', 'Value': 'true'}  # Auto-verify for simplicity
                ],
                MessageAction='SUPPRESS'  # Suppress default welcome email
            )

            # Store user details in DynamoDB
            dynamodb.put_item(
                TableName=table_name,
                Item={
                    'userID': {'S': email},
                    'email': {'S': email},
                    'role': {'S': role}
                }
            )

            return {
                'statusCode': 200,
                'body': json.dumps({
                    'message': 'User registered successfully',
                    'temporaryPassword': temp_password  # Return temp password for testing
                })
            }

        elif action == 'login':
            if not password:
                return {
                    'statusCode': 400,
                    'body': json.dumps({'message': 'Missing password'})
                }

            # Authenticate user
            response = cognito_client.admin_initiate_auth(
                UserPoolId=user_pool_id,
                ClientId=os.environ['USER_POOL_CLIENT_ID'],  # Set in environment or pass in event
                AuthFlow='ADMIN_USER_PASSWORD_AUTH',
                AuthParameters={
                    'USERNAME': email,
                    'PASSWORD': password
                }
            )

            return {
                'statusCode': 200,
                'body': json.dumps({
                    'message': 'Login successful',
                    'accessToken': response['AuthenticationResult']['AccessToken']
                })
            }

        elif action == 'change_password':
            if not old_password or not new_password:
                return {
                    'statusCode': 400,
                    'body': json.dumps({'message': 'Missing oldPassword or newPassword'})
                }

            # Initiate auth to verify old password
            auth_response = cognito_client.admin_initiate_auth(
                UserPoolId=user_pool_id,
                ClientId=os.environ['USER_POOL_CLIENT_ID'],
                AuthFlow='ADMIN_USER_PASSWORD_AUTH',
                AuthParameters={
                    'USERNAME': email,
                    'PASSWORD': old_password
                }
            )

            # If auth succeeds, update password
            cognito_client.admin_set_user_password(
                UserPoolId=user_pool_id,
                Username=email,
                Password=new_password,
                Permanent=True
            )

            return {
                'statusCode': 200,
                'body': json.dumps({'message': 'Password changed successfully'})
            }

        else:
            return {
                'statusCode': 400,
                'body': json.dumps({'message': 'Invalid action'})
            }

    except cognito_client.exceptions.UserNotFoundException:
        return {
            'statusCode': 404,
            'body': json.dumps({'message': 'User not found'})
        }
    except cognito_client.exceptions.NotAuthorizedException:
        return {
            'statusCode': 401,
            'body': json.dumps({'message': 'Incorrect username or password'})
        }
    except cognito_client.exceptions.UsernameExistsException:
        return {
            'statusCode': 400,
            'body': json.dumps({'message': 'User already exists'})
        }
    except Exception as e:
        return {
            'statusCode': 500,
            'body': json.dumps({'message': 'Internal server error', 'error': str(e)})
        }