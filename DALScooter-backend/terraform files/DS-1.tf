provider "aws" {
  region = "us-east-1"
}

# DynamoDB Table for User Details
resource "aws_dynamodb_table" "dalscooter_users" {
  name         = "DALScooterUsers"
  billing_mode = "PAY_PER_REQUEST"
  hash_key     = "userID"

  attribute {
    name = "userID"
    type = "S"
  }
}

# Lambda Function for Auth Handler (NO cycle-inducing env vars)
resource "aws_lambda_function" "auth_handler_lambda" {
  filename         = "auth_handler.zip"
  function_name    = "DALScooterAuthHandler"
  role             = "arn:aws:iam::802805047192:role/LabRole"
  handler          = "lambda_function.lambda_handler"
  runtime          = "python3.9"
  timeout          = 30
  source_code_hash = filebase64sha256("auth_handler.zip")

  environment {
    variables = {
      DYNAMODB_TABLE = aws_dynamodb_table.dalscooter_users.name
      # USER_POOL_ID and CLIENT_ID intentionally omitted to avoid dependency cycle
    }
  }
}

# Cognito User Pool
resource "aws_cognito_user_pool" "dalscooter_user_pool" {
  name                     = "DALScooterUserPool"
  username_attributes      = ["email"]
  auto_verified_attributes = ["email"]
  mfa_configuration        = "OFF"

  password_policy {
    minimum_length    = 8
    require_lowercase = true
    require_numbers   = true
    require_symbols   = false
    require_uppercase = true
  }

  schema {
    name                     = "email"
    attribute_data_type      = "String"
    required                 = true
    mutable                  = true
  }

  schema {
    name                     = "custom:role"
    attribute_data_type      = "String"
    required                 = false
    mutable                  = true
    developer_only_attribute = false
  }

  lambda_config {
    define_auth_challenge           = aws_lambda_function.auth_handler_lambda.arn
    create_auth_challenge           = aws_lambda_function.auth_handler_lambda.arn
    verify_auth_challenge_response = aws_lambda_function.auth_handler_lambda.arn
  }
}

# Cognito User Pool Client
resource "aws_cognito_user_pool_client" "dalscooter_app_client" {
  name            = "DALScooterAppClient"
  user_pool_id    = aws_cognito_user_pool.dalscooter_user_pool.id
  generate_secret = false

  explicit_auth_flows = [
    "ALLOW_CUSTOM_AUTH",
    "ALLOW_USER_PASSWORD_AUTH",
    "ALLOW_REFRESH_TOKEN_AUTH"
  ]
}

# Lambda permission for Cognito
resource "aws_lambda_permission" "cognito_invoke" {
  statement_id  = "AllowCognitoInvoke"
  action        = "lambda:InvokeFunction"
  function_name = aws_lambda_function.auth_handler_lambda.function_name
  principal     = "cognito-idp.amazonaws.com"
  source_arn    = aws_cognito_user_pool.dalscooter_user_pool.arn
}

# API Gateway REST API
resource "aws_api_gateway_rest_api" "dalscooter_api" {
  name        = "DALScooterAPI"
  description = "API for DALScooter Authentication"
}

# API Gateway Resource (/auth)
resource "aws_api_gateway_resource" "auth_resource" {
  rest_api_id = aws_api_gateway_rest_api.dalscooter_api.id
  parent_id   = aws_api_gateway_rest_api.dalscooter_api.root_resource_id
  path_part   = "auth"
}

# API Gateway Method (POST /auth)
resource "aws_api_gateway_method" "auth_post_method" {
  rest_api_id   = aws_api_gateway_rest_api.dalscooter_api.id
  resource_id   = aws_api_gateway_resource.auth_resource.id
  http_method   = "POST"
  authorization = "NONE"
}

# API Gateway Integration with Lambda
resource "aws_api_gateway_integration" "auth_lambda_integration" {
  rest_api_id             = aws_api_gateway_rest_api.dalscooter_api.id
  resource_id             = aws_api_gateway_resource.auth_resource.id
  http_method             = aws_api_gateway_method.auth_post_method.http_method
  integration_http_method = "POST"
  type                    = "AWS_PROXY"
  uri                     = aws_lambda_function.auth_handler_lambda.invoke_arn
}

# Lambda Permission for API Gateway
resource "aws_lambda_permission" "api_gateway_invoke" {
  statement_id  = "AllowAPIGatewayInvoke"
  action        = "lambda:InvokeFunction"
  function_name = aws_lambda_function.auth_handler_lambda.function_name
  principal     = "apigateway.amazonaws.com"
  source_arn    = "${aws_api_gateway_rest_api.dalscooter_api.execution_arn}/*/*"
}

# API Gateway Deployment
resource "aws_api_gateway_deployment" "dalscooter_api_deployment" {
  rest_api_id = aws_api_gateway_rest_api.dalscooter_api.id

  depends_on = [
    aws_api_gateway_method.auth_post_method,
    aws_api_gateway_integration.auth_lambda_integration
  ]
}

# API Gateway Stage
resource "aws_api_gateway_stage" "dalscooter_api_stage" {
  rest_api_id   = aws_api_gateway_rest_api.dalscooter_api.id
  deployment_id = aws_api_gateway_deployment.dalscooter_api_deployment.id
  stage_name    = "prod"
}

# Outputs
output "user_pool_id" {
  description = "ID of the Cognito User Pool"
  value       = aws_cognito_user_pool.dalscooter_user_pool.id
}

output "user_pool_client_id" {
  description = "ID of the Cognito User Pool Client"
  value       = aws_cognito_user_pool_client.dalscooter_app_client.id
}

output "dynamodb_table_name" {
  description = "Name of the DynamoDB Table"
  value       = aws_dynamodb_table.dalscooter_users.name
}

output "auth_handler_lambda_arn" {
  description = "ARN of the Auth Handler Lambda Function"
  value       = aws_lambda_function.auth_handler_lambda.arn
}

output "api_gateway_endpoint" {
  description = "API Gateway endpoint URL for /auth"
  value       = "${aws_api_gateway_stage.dalscooter_api_stage.invoke_url}/auth"
}
