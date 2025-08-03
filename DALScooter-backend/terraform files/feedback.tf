# Archive the Lambda function code
data "archive_file" "submit_feedback_zip" {
  type        = "zip"
  source_dir  = "${path.module}/../lambda-functions/submit_feedback"
  output_path = "${path.module}/submit_feedback.zip"
}

# Lambda function for submitting feedback
resource "aws_lambda_function" "submit_feedback" {
  function_name = "DALScooter-SubmitFeedback"
  filename      = data.archive_file.submit_feedback_zip.output_path
  source_code_hash = data.archive_file.submit_feedback_zip.output_base64sha256
  role          = "arn:aws:iam::101784748999:role/LabRole"
  handler       = "lambda_function.lambda_handler"
  runtime       = "python3.9"
  timeout       = 30
  memory_size   = 128

  environment {
    variables = {
      FEEDBACK_DYNAMODB_TABLE = aws_dynamodb_table.feedback_table.name
    }
  }

  tags = {
    Name        = "DALScooter-SubmitFeedback"
    Environment = "dev"
    Module      = "Feedback"
  }
}

# DynamoDB table for feedback
resource "aws_dynamodb_table" "feedback_table" {
  name           = "DALScooter-FeedbackTable"
  billing_mode   = "PAY_PER_REQUEST"  # On-demand billing
  hash_key       = "feedbackId"

  attribute {
    name = "feedbackId"
    type = "S"  # String
  }

  tags = {
    Name        = "DALScooter-FeedbackTable"
    Environment = "dev"
    Module      = "Feedback"
  }
}

# API Gateway resource for submit-feedback endpoint
resource "aws_api_gateway_resource" "submit_feedback" {
  rest_api_id = aws_api_gateway_rest_api.dalscooter_api.id
  parent_id   = aws_api_gateway_rest_api.dalscooter_api.root_resource_id
  path_part   = "submit-feedback"
}

# API Gateway method for submit-feedback (POST)
resource "aws_api_gateway_method" "submit_feedback_method" {
  rest_api_id   = aws_api_gateway_rest_api.dalscooter_api.id
  resource_id   = aws_api_gateway_resource.submit_feedback.id
  http_method   = "POST"
  authorization = "NONE"
}

# API Gateway method for OPTIONS (CORS preflight)
resource "aws_api_gateway_method" "submit_feedback_options_method" {
  rest_api_id   = aws_api_gateway_rest_api.dalscooter_api.id
  resource_id   = aws_api_gateway_resource.submit_feedback.id
  http_method   = "OPTIONS"
  authorization = "NONE"
}

# API Gateway integration for submit-feedback (POST)
resource "aws_api_gateway_integration" "submit_feedback_integration" {
  rest_api_id             = aws_api_gateway_rest_api.dalscooter_api.id
  resource_id             = aws_api_gateway_resource.submit_feedback.id
  http_method             = aws_api_gateway_method.submit_feedback_method.http_method
  integration_http_method = "POST"
  type                    = "AWS_PROXY"
  uri                     = aws_lambda_function.submit_feedback.invoke_arn
}

# API Gateway integration for OPTIONS (CORS)
resource "aws_api_gateway_integration" "submit_feedback_options_integration" {
  rest_api_id = aws_api_gateway_rest_api.dalscooter_api.id
  resource_id = aws_api_gateway_resource.submit_feedback.id
  http_method = aws_api_gateway_method.submit_feedback_options_method.http_method
  type        = "MOCK"

  request_templates = {
    "application/json" = "{\"statusCode\": 200}"
  }

  passthrough_behavior = "WHEN_NO_MATCH"  # Ensures the mock integration processes the request

  # Response configuration is handled via method response and integration response
}

# API Gateway method response for OPTIONS
resource "aws_api_gateway_method_response" "submit_feedback_options_response_200" {
  rest_api_id = aws_api_gateway_rest_api.dalscooter_api.id
  resource_id = aws_api_gateway_resource.submit_feedback.id
  http_method = aws_api_gateway_method.submit_feedback_options_method.http_method
  status_code = "200"

  response_parameters = {
    "method.response.header.Access-Control-Allow-Origin"  = true
    "method.response.header.Access-Control-Allow-Methods" = true
    "method.response.header.Access-Control-Allow-Headers" = true
  }

  response_models = {
    "application/json" = "Empty"
  }
}

# API Gateway integration response for OPTIONS
resource "aws_api_gateway_integration_response" "submit_feedback_options_integration_response_200" {
  rest_api_id = aws_api_gateway_rest_api.dalscooter_api.id
  resource_id = aws_api_gateway_resource.submit_feedback.id
  http_method = aws_api_gateway_method.submit_feedback_options_method.http_method
  status_code = aws_api_gateway_method_response.submit_feedback_options_response_200.status_code

  response_parameters = {
    "method.response.header.Access-Control-Allow-Origin"  = "'*'"
    "method.response.header.Access-Control-Allow-Methods" = "'POST,OPTIONS'"
    "method.response.header.Access-Control-Allow-Headers" = "'Content-Type,Authorization,X-Amz-Date,X-Api-Key,X-Amz-Security-Token'"
  }

  depends_on = [aws_api_gateway_integration.submit_feedback_options_integration]
}

# API Gateway method response for POST
resource "aws_api_gateway_method_response" "submit_feedback_response_200" {
  rest_api_id = aws_api_gateway_rest_api.dalscooter_api.id
  resource_id = aws_api_gateway_resource.submit_feedback.id
  http_method = aws_api_gateway_method.submit_feedback_method.http_method
  status_code = "200"

  response_parameters = {
    "method.response.header.Access-Control-Allow-Origin"  = true
    "method.response.header.Access-Control-Allow-Methods" = true
    "method.response.header.Access-Control-Allow-Headers" = true
  }

  response_models = {
    "application/json" = "Empty"
  }
}

# API Gateway integration response for POST
resource "aws_api_gateway_integration_response" "submit_feedback_integration_response_200" {
  rest_api_id = aws_api_gateway_rest_api.dalscooter_api.id
  resource_id = aws_api_gateway_resource.submit_feedback.id
  http_method = aws_api_gateway_method.submit_feedback_method.http_method
  status_code = aws_api_gateway_method_response.submit_feedback_response_200.status_code

  response_parameters = {
    "method.response.header.Access-Control-Allow-Origin"  = "'*'"
    "method.response.header.Access-Control-Allow-Methods" = "'POST,OPTIONS'"
    "method.response.header.Access-Control-Allow-Headers" = "'Content-Type,Authorization,X-Amz-Date,X-Api-Key,X-Amz-Security-Token'"
  }

  depends_on = [aws_api_gateway_integration.submit_feedback_integration]
}

# API Gateway method response for POST (Error case, e.g., 400 or 500)
resource "aws_api_gateway_method_response" "submit_feedback_response_400" {
  rest_api_id = aws_api_gateway_rest_api.dalscooter_api.id
  resource_id = aws_api_gateway_resource.submit_feedback.id
  http_method = aws_api_gateway_method.submit_feedback_method.http_method
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

resource "aws_api_gateway_integration_response" "submit_feedback_integration_response_400" {
  rest_api_id = aws_api_gateway_rest_api.dalscooter_api.id
  resource_id = aws_api_gateway_resource.submit_feedback.id
  http_method = aws_api_gateway_method.submit_feedback_method.http_method
  status_code = aws_api_gateway_method_response.submit_feedback_response_400.status_code
  selection_pattern = ".*(400|Bad Request).*"

  response_parameters = {
    "method.response.header.Access-Control-Allow-Origin"  = "'*'"
    "method.response.header.Access-Control-Allow-Methods" = "'POST,OPTIONS'"
    "method.response.header.Access-Control-Allow-Headers" = "'Content-Type,Authorization,X-Amz-Date,X-Api-Key,X-Amz-Security-Token'"
  }

  depends_on = [aws_api_gateway_integration.submit_feedback_integration]
}

# API Gateway deployment (no specific stage name, relies on default behavior)
resource "aws_api_gateway_deployment" "submit_feedback_deployment" {
  depends_on = [
    aws_api_gateway_integration.submit_feedback_integration,
    aws_api_gateway_integration.submit_feedback_options_integration
  ]
  rest_api_id = aws_api_gateway_rest_api.dalscooter_api.id
  # No stage_name to mimic the reference configuration's deployment style
}

# Lambda permission for API Gateway to invoke the function
resource "aws_lambda_permission" "allow_api_gateway_submit_feedback" {
  statement_id  = "AllowAPIGatewayInvokeSubmitFeedback"
  action        = "lambda:InvokeFunction"
  function_name = aws_lambda_function.submit_feedback.function_name
  principal     = "apigateway.amazonaws.com"
  source_arn    = "${aws_api_gateway_rest_api.dalscooter_api.execution_arn}/*/submit-feedback"
}