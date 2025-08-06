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
  role             = "arn:aws:iam::101784748999:role/LabRole"
  handler          = "lambda_function.lambda_handler"
  runtime          = "python3.9"
  timeout          = 30
  source_code_hash = filebase64sha256("auth_handler.zip")

  environment {
    variables = {
      DYNAMODB_TABLE = aws_dynamodb_table.dalscooter_users.name
      USER_POOL_ID        = "us-east-1_HEWUlCpbQ"
      USER_POOL_CLIENT_ID = "1k0g35186fql2ksgc3j3db11k9"
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
  # schema {
  # name                     = "custom:sec_question"
  # attribute_data_type      = "String"
  # required                 = false
  # mutable                  = true
  # }

  # schema {
  #   name                     = "custom:sec_answer"
  #   attribute_data_type      = "String"
  #   required                 = false
  #   mutable                  = true
  # }

  lambda_config {
    define_auth_challenge           = aws_lambda_function.auth_handler_lambda.arn
    create_auth_challenge           = aws_lambda_function.auth_handler_lambda.arn
    verify_auth_challenge_response = aws_lambda_function.auth_handler_lambda.arn
  }
  
  lifecycle {
    ignore_changes = [schema]
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
  description = "API for DALScooter application"
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

  request_parameters = {
    "method.request.header.Content-Type" = true
  }
}

# API Gateway Method (OPTIONS /auth) for CORS Preflight
resource "aws_api_gateway_method" "options_method" {
  rest_api_id   = aws_api_gateway_rest_api.dalscooter_api.id
  resource_id   = aws_api_gateway_resource.auth_resource.id
  http_method   = "OPTIONS"
  authorization = "NONE"
}

# API Gateway Method Response (POST /auth - 200)
resource "aws_api_gateway_method_response" "auth_post_method_response_200" {
  rest_api_id = aws_api_gateway_rest_api.dalscooter_api.id
  resource_id = aws_api_gateway_resource.auth_resource.id
  http_method = aws_api_gateway_method.auth_post_method.http_method
  status_code = "200"

  response_parameters = {
    "method.response.header.Access-Control-Allow-Origin"  = true
    "method.response.header.Access-Control-Allow-Methods" = true
    "method.response.header.Access-Control-Allow-Headers" = true
  }

  depends_on = [aws_api_gateway_method.auth_post_method]
}

# API Gateway Method Response (OPTIONS /auth - 200)
resource "aws_api_gateway_method_response" "options_method_response_200" {
  rest_api_id = aws_api_gateway_rest_api.dalscooter_api.id
  resource_id = aws_api_gateway_resource.auth_resource.id
  http_method = aws_api_gateway_method.options_method.http_method
  status_code = "200"

  response_parameters = {
    "method.response.header.Access-Control-Allow-Origin"  = true
    "method.response.header.Access-Control-Allow-Methods" = true
    "method.response.header.Access-Control-Allow-Headers" = true
  }

  depends_on = [aws_api_gateway_method.options_method]
}

# API Gateway Integration with Lambda (POST /auth)
resource "aws_api_gateway_integration" "auth_lambda_integration" {
  rest_api_id             = aws_api_gateway_rest_api.dalscooter_api.id
  resource_id             = aws_api_gateway_resource.auth_resource.id
  http_method             = aws_api_gateway_method.auth_post_method.http_method
  integration_http_method = "POST"
  type                    = "AWS_PROXY"
  uri                     = aws_lambda_function.auth_handler_lambda.invoke_arn

  passthrough_behavior = "WHEN_NO_MATCH"

  depends_on = [aws_api_gateway_method.auth_post_method, aws_lambda_permission.api_gateway_invoke]
}

# API Gateway Integration (OPTIONS /auth) for CORS
resource "aws_api_gateway_integration" "options_integration" {
  rest_api_id = aws_api_gateway_rest_api.dalscooter_api.id
  resource_id = aws_api_gateway_resource.auth_resource.id
  http_method = aws_api_gateway_method.options_method.http_method
  type        = "MOCK"

  request_templates = {
    "application/json" = "{\"statusCode\": 200}"
  }

  passthrough_behavior = "WHEN_NO_MATCH"

  depends_on = [aws_api_gateway_method.options_method]
}

# API Gateway Integration Response (POST /auth - 200)
resource "aws_api_gateway_integration_response" "auth_integration_response_200" {
  rest_api_id = aws_api_gateway_rest_api.dalscooter_api.id
  resource_id = aws_api_gateway_resource.auth_resource.id
  http_method = aws_api_gateway_method.auth_post_method.http_method
  status_code = aws_api_gateway_method_response.auth_post_method_response_200.status_code

  response_parameters = {
    "method.response.header.Access-Control-Allow-Origin"  = "'*'"
    "method.response.header.Access-Control-Allow-Methods" = "'POST,OPTIONS'"
    "method.response.header.Access-Control-Allow-Headers" = "'Content-Type'"
  }

  depends_on = [aws_api_gateway_integration.auth_lambda_integration]
}

# API Gateway Integration Response (OPTIONS /auth - 200)
resource "aws_api_gateway_integration_response" "options_integration_response_200" {
  rest_api_id = aws_api_gateway_rest_api.dalscooter_api.id
  resource_id = aws_api_gateway_resource.auth_resource.id
  http_method = aws_api_gateway_method.options_method.http_method
  status_code = aws_api_gateway_method_response.options_method_response_200.status_code

  response_parameters = {
    "method.response.header.Access-Control-Allow-Origin"  = "'*'"
    "method.response.header.Access-Control-Allow-Methods" = "'POST,OPTIONS'"
    "method.response.header.Access-Control-Allow-Headers" = "'Content-Type'"
  }

  depends_on = [aws_api_gateway_integration.options_integration]
}

resource "aws_api_gateway_method_response" "auth_post_method_response_400" {
  rest_api_id = aws_api_gateway_rest_api.dalscooter_api.id
  resource_id = aws_api_gateway_resource.auth_resource.id
  http_method = "POST"
  status_code = "400"

  response_parameters = {
    "method.response.header.Access-Control-Allow-Origin"  = true
    "method.response.header.Access-Control-Allow-Methods" = true
    "method.response.header.Access-Control-Allow-Headers" = true
  }

  response_models = {
    "application/json" = "Empty"
  }
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
    aws_api_gateway_integration.auth_lambda_integration,
    aws_api_gateway_method.options_method,
    aws_api_gateway_integration.options_integration,
    aws_api_gateway_integration.add_vehicle_lambda_integration,
    aws_api_gateway_integration.add_vehicle_options_integration,
    aws_api_gateway_integration.get_vehicles_integration,
    aws_api_gateway_method.book_vehicle_method,
    aws_api_gateway_integration.book_vehicle_integration,
    aws_api_gateway_method.book_vehicle_options_method,
    aws_api_gateway_integration.book_vehicle_options_integration,
    aws_api_gateway_method.get_bookings_method,
    aws_api_gateway_integration.get_bookings_integration,
    aws_api_gateway_method.get_bookings_options_method,
    aws_api_gateway_integration.get_bookings_options_integration
  ]
}

# API Gateway Stage
resource "aws_api_gateway_stage" "dalscooter_api_stage" {
  rest_api_id   = aws_api_gateway_rest_api.dalscooter_api.id
  deployment_id = aws_api_gateway_deployment.dalscooter_api_deployment.id
  stage_name    = "prod"
}

resource "aws_dynamodb_table" "dalscooter_vehicles" {
  name         = "DALScooterVehicles"
  billing_mode = "PAY_PER_REQUEST"
  hash_key     = "vehicleID"

  attribute {
    name = "vehicleID"
    type = "S"
  }

  attribute {
    name = "type"
    type = "S"
  }

  attribute {
    name = "operatorID"
    type = "S"
  }

  global_secondary_index {
    name            = "TypeIndex"
    hash_key        = "type"
    projection_type = "ALL"
  }

  global_secondary_index {
    name            = "OperatorIndex"
    hash_key        = "operatorID"
    projection_type = "ALL"
  }
}

resource "aws_api_gateway_authorizer" "cognito_auth" {
  name                   = "DALScooterCognitoAuth"
  rest_api_id           = aws_api_gateway_rest_api.dalscooter_api.id
  identity_source       = "method.request.header.Authorization"
  type                  = "COGNITO_USER_POOLS"
  provider_arns         = [aws_cognito_user_pool.dalscooter_user_pool.arn]
}

# Lambda Function to Add Vehicle
resource "aws_lambda_function" "add_vehicle_lambda" {
  filename         = "add_vehicle_handler.zip" # Zip your add_vehicle_lambda.py
  function_name    = "DALScooterAddVehicle"
  role             = "arn:aws:iam::101784748999:role/LabRole"
  handler          = "lambda_function.lambda_handler"
  runtime          = "python3.9"
  timeout          = 30
  source_code_hash = filebase64sha256("add_vehicle_handler.zip")

  environment {
    variables = {
      VEHICLE_TABLE = aws_dynamodb_table.dalscooter_vehicles.name
      USER_TABLE = aws_dynamodb_table.dalscooter_users.name
    }
  }
}

# Lambda Permission for API Gateway (Add Vehicle)
resource "aws_lambda_permission" "api_gateway_invoke_add_vehicle" {
  statement_id  = "AllowAddVehicleInvoke"
  action        = "lambda:InvokeFunction"
  function_name = aws_lambda_function.add_vehicle_lambda.function_name
  principal     = "apigateway.amazonaws.com"
  source_arn    = "${aws_api_gateway_rest_api.dalscooter_api.execution_arn}/*/*"
}

# API Gateway Resource for /add-vehicle
resource "aws_api_gateway_resource" "add_vehicle_resource" {
  rest_api_id = aws_api_gateway_rest_api.dalscooter_api.id
  parent_id   = aws_api_gateway_rest_api.dalscooter_api.root_resource_id
  path_part   = "add-vehicle"
}

# POST /add-vehicle Method
resource "aws_api_gateway_method" "add_vehicle_post_method" {
  rest_api_id   = aws_api_gateway_rest_api.dalscooter_api.id
  resource_id   = aws_api_gateway_resource.add_vehicle_resource.id
  http_method   = "POST"
  authorization = "COGNITO_USER_POOLS"
  authorizer_id = aws_api_gateway_authorizer.cognito_auth.id

  request_parameters = {
    "method.request.header.Authorization" = true
    "method.request.header.Content-Type"  = true
  }
}

# OPTIONS /add-vehicle Method (CORS)
resource "aws_api_gateway_method" "add_vehicle_options_method" {
  rest_api_id   = aws_api_gateway_rest_api.dalscooter_api.id
  resource_id   = aws_api_gateway_resource.add_vehicle_resource.id
  http_method   = "OPTIONS"
  authorization = "NONE"
}

# POST Integration
resource "aws_api_gateway_integration" "add_vehicle_lambda_integration" {
  rest_api_id             = aws_api_gateway_rest_api.dalscooter_api.id
  resource_id             = aws_api_gateway_resource.add_vehicle_resource.id
  http_method             = aws_api_gateway_method.add_vehicle_post_method.http_method
  integration_http_method = "POST"
  type                    = "AWS_PROXY"
  uri                     = aws_lambda_function.add_vehicle_lambda.invoke_arn

  depends_on = [aws_lambda_permission.api_gateway_invoke_add_vehicle]
}

# OPTIONS Integration (Mock for CORS)
resource "aws_api_gateway_integration" "add_vehicle_options_integration" {
  rest_api_id = aws_api_gateway_rest_api.dalscooter_api.id
  resource_id = aws_api_gateway_resource.add_vehicle_resource.id
  http_method = aws_api_gateway_method.add_vehicle_options_method.http_method
  type        = "MOCK"

  request_templates = {
    "application/json" = "{\"statusCode\": 200}"
  }
}

# POST Method Response
resource "aws_api_gateway_method_response" "add_vehicle_post_response_200" {
  rest_api_id = aws_api_gateway_rest_api.dalscooter_api.id
  resource_id = aws_api_gateway_resource.add_vehicle_resource.id
  http_method = aws_api_gateway_method.add_vehicle_post_method.http_method
  status_code = "200"

  response_parameters = {
    "method.response.header.Access-Control-Allow-Origin"  = true
    "method.response.header.Access-Control-Allow-Methods" = true
    "method.response.header.Access-Control-Allow-Headers" = true
  }
}

# OPTIONS Method Response
resource "aws_api_gateway_method_response" "add_vehicle_options_response" {
  rest_api_id = aws_api_gateway_rest_api.dalscooter_api.id
  resource_id = aws_api_gateway_resource.add_vehicle_resource.id
  http_method = aws_api_gateway_method.add_vehicle_options_method.http_method
  status_code = "200"

  response_parameters = {
    "method.response.header.Access-Control-Allow-Origin"  = true
    "method.response.header.Access-Control-Allow-Methods" = true
    "method.response.header.Access-Control-Allow-Headers" = true
  }
}

# POST Integration Response
resource "aws_api_gateway_integration_response" "add_vehicle_integration_response_200" {
  rest_api_id = aws_api_gateway_rest_api.dalscooter_api.id
  resource_id = aws_api_gateway_resource.add_vehicle_resource.id
  http_method = aws_api_gateway_method.add_vehicle_post_method.http_method
  status_code = aws_api_gateway_method_response.add_vehicle_post_response_200.status_code

  response_parameters = {
    "method.response.header.Access-Control-Allow-Origin"  = "'*'"
    "method.response.header.Access-Control-Allow-Methods" = "'POST,OPTIONS'"
    "method.response.header.Access-Control-Allow-Headers" = "'Content-Type'"
  }
}

# OPTIONS Integration Response
resource "aws_api_gateway_integration_response" "add_vehicle_options_integration_response" {
  rest_api_id = aws_api_gateway_rest_api.dalscooter_api.id
  resource_id = aws_api_gateway_resource.add_vehicle_resource.id
  http_method = aws_api_gateway_method.add_vehicle_options_method.http_method
  status_code = aws_api_gateway_method_response.add_vehicle_options_response.status_code

  response_parameters = {
    "method.response.header.Access-Control-Allow-Origin"  = "'*'"
    "method.response.header.Access-Control-Allow-Methods" = "'POST,OPTIONS'"
    "method.response.header.Access-Control-Allow-Headers" = "'Content-Type,Authorization'"
  }
}

# Output
output "add_vehicle_api_url" {
  description = "API Gateway endpoint URL for /add-vehicle"
  value       = "${aws_api_gateway_stage.dalscooter_api_stage.invoke_url}/add-vehicle"
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

