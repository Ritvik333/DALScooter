# Use the same LabRole ARN defined in bot-functions.tf
#locals {
#  lab_role_arn = "arn:aws:iam::802805047192:role/LabRole"
#}

# Lex Chat Lambda Function
resource "aws_lambda_function" "lex_chat_handler" {
  filename      = "lex_chat_handler.zip"
  function_name = "lex-chat-handler"
  role          = local.lab_role_arn
  handler       = "lambda_function.lambda_handler"
  runtime       = "python3.9"
  timeout       = 30
  memory_size   = 256

  environment {
    variables = {
      LEX_BOT_ID       = "S63TU5WQQB"
      LEX_BOT_ALIAS_ID = "TSTALIASID"
      LEX_BOT_REGION   = "ca-central-1"
      BOOKINGS_TABLE   = "DALScooterBookings"
      SUPPORT_TABLE    = "DALScooterSupportTickets"
    }
  }
}

# API Gateway Resource for Lex Chat
resource "aws_api_gateway_resource" "lex_chat" {
  rest_api_id = aws_api_gateway_rest_api.dalscooter_api.id
  parent_id   = aws_api_gateway_rest_api.dalscooter_api.root_resource_id
  path_part   = "lex-chat"
}

# API Gateway Methods
resource "aws_api_gateway_method" "lex_chat_post" {
  rest_api_id   = aws_api_gateway_rest_api.dalscooter_api.id
  resource_id   = aws_api_gateway_resource.lex_chat.id
  http_method   = "POST"
  authorization = "NONE"
}

resource "aws_api_gateway_method" "lex_chat_options" {
  rest_api_id   = aws_api_gateway_rest_api.dalscooter_api.id
  resource_id   = aws_api_gateway_resource.lex_chat.id
  http_method   = "OPTIONS"
  authorization = "NONE"
}

# API Gateway Integrations
resource "aws_api_gateway_integration" "lex_chat_integration" {
  rest_api_id             = aws_api_gateway_rest_api.dalscooter_api.id
  resource_id             = aws_api_gateway_resource.lex_chat.id
  http_method             = aws_api_gateway_method.lex_chat_post.http_method
  integration_http_method = "POST"
  type                    = "AWS_PROXY"
  uri                     = aws_lambda_function.lex_chat_handler.invoke_arn
}

resource "aws_api_gateway_integration" "lex_chat_options_integration" {
  rest_api_id = aws_api_gateway_rest_api.dalscooter_api.id
  resource_id = aws_api_gateway_resource.lex_chat.id
  http_method = aws_api_gateway_method.lex_chat_options.http_method
  type        = "MOCK"
  
  request_templates = {
    "application/json" = jsonencode({ statusCode = 200 })
  }
}

# API Gateway Method Responses
resource "aws_api_gateway_method_response" "lex_chat_200" {
  rest_api_id = aws_api_gateway_rest_api.dalscooter_api.id
  resource_id = aws_api_gateway_resource.lex_chat.id
  http_method = aws_api_gateway_method.lex_chat_post.http_method
  status_code = "200"

  response_parameters = {
    "method.response.header.Access-Control-Allow-Origin"  = true
    "method.response.header.Access-Control-Allow-Headers" = true
    "method.response.header.Access-Control-Allow-Methods" = true
  }
}

resource "aws_api_gateway_method_response" "lex_chat_options_200" {
  rest_api_id = aws_api_gateway_rest_api.dalscooter_api.id
  resource_id = aws_api_gateway_resource.lex_chat.id
  http_method = aws_api_gateway_method.lex_chat_options.http_method
  status_code = "200"

  response_parameters = {
    "method.response.header.Access-Control-Allow-Origin"  = true
    "method.response.header.Access-Control-Allow-Headers" = true
    "method.response.header.Access-Control-Allow-Methods" = true
  }
}

# API Gateway Integration Responses
resource "aws_api_gateway_integration_response" "lex_chat_options_integration_response" {
  rest_api_id = aws_api_gateway_rest_api.dalscooter_api.id
  resource_id = aws_api_gateway_resource.lex_chat.id
  http_method = aws_api_gateway_method.lex_chat_options.http_method
  status_code = aws_api_gateway_method_response.lex_chat_options_200.status_code

  response_parameters = {
    "method.response.header.Access-Control-Allow-Origin"  = "'*'"
    "method.response.header.Access-Control-Allow-Headers" = "'Content-Type'"
    "method.response.header.Access-Control-Allow-Methods" = "'POST, OPTIONS'"
  }
}

# API Gateway Deployment
resource "aws_api_gateway_deployment" "deployment" {
  rest_api_id = aws_api_gateway_rest_api.dalscooter_api.id

  depends_on = [
    aws_api_gateway_integration.lex_chat_integration,
    aws_api_gateway_integration.lex_chat_options_integration
  ]
}

# API Gateway Stage
resource "aws_api_gateway_stage" "prod" {
  stage_name    = "prod"
  rest_api_id   = aws_api_gateway_rest_api.dalscooter_api.id
  deployment_id = aws_api_gateway_deployment.deployment.id
}

# Lambda Permission for API Gateway
resource "aws_lambda_permission" "lex_chat_api_gateway" {
  statement_id  = "AllowExecutionFromAPIGateway"
  action        = "lambda:InvokeFunction"
  function_name = aws_lambda_function.lex_chat_handler.function_name
  principal     = "apigateway.amazonaws.com"
  source_arn    = "${aws_api_gateway_rest_api.dalscooter_api.execution_arn}/*/*"
}

# Lambda Permissions for Lex Bot to invoke business logic functions
resource "aws_lambda_permission" "booking_lookup_lex" {
  statement_id  = "AllowExecutionFromLex"
  action        = "lambda:InvokeFunction"
  function_name = aws_lambda_function.booking_lookup_handler.function_name
  principal     = "lex.amazonaws.com"
  source_arn    = "arn:aws:lex:ca-central-1:195190325820:bot-alias/S63TU5WQQB/TSTALIASID"
}

resource "aws_lambda_permission" "customer_support_lex" {
  statement_id  = "AllowExecutionFromLex"
  action        = "lambda:InvokeFunction"
  function_name = aws_lambda_function.customer_support_handler.function_name
  principal     = "lex.amazonaws.com"
  source_arn    = "arn:aws:lex:ca-central-1:195190325820:bot-alias/S63TU5WQQB/TSTALIASID"
}

resource "aws_lambda_permission" "navigation_help_lex" {
  statement_id  = "AllowExecutionFromLex"
  action        = "lambda:InvokeFunction"
  function_name = aws_lambda_function.navigation_help_handler.function_name
  principal     = "lex.amazonaws.com"
  source_arn    = "arn:aws:lex:ca-central-1:195190325820:bot-alias/S63TU5WQQB/TSTALIASID"
}

# Outputs for Lex Chat Integration
output "lex_chat_api_url" {
  description = "API Gateway URL for Lex Chat endpoint"
  value       = "${aws_api_gateway_stage.prod.invoke_url}/lex-chat"
}

output "lex_chat_lambda_arn" {
  description = "ARN of the Lex Chat Lambda function"
  value       = aws_lambda_function.lex_chat_handler.arn
}

output "lex_chat_lambda_name" {
  description = "Name of the Lex Chat Lambda function"
  value       = aws_lambda_function.lex_chat_handler.function_name
}