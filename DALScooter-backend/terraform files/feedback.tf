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

# API Gateway method for submit-feedback
resource "aws_api_gateway_method" "submit_feedback_method" {
  rest_api_id   = aws_api_gateway_rest_api.dalscooter_api.id
  resource_id   = aws_api_gateway_resource.submit_feedback.id
  http_method   = "POST"
  authorization = "NONE"

  request_parameters = {
    "method.request.header.Authorization" = true
  }
}

# API Gateway integration for submit-feedback
resource "aws_api_gateway_integration" "submit_feedback_integration" {
  rest_api_id             = aws_api_gateway_rest_api.dalscooter_api.id
  resource_id             = aws_api_gateway_resource.submit_feedback.id
  http_method             = aws_api_gateway_method.submit_feedback_method.http_method
  integration_http_method = "POST"
  type                    = "AWS_PROXY"
  uri                     = aws_lambda_function.submit_feedback.invoke_arn
}

# Lambda permission for API Gateway to invoke the function
resource "aws_lambda_permission" "allow_api_gateway_submit_feedback" {
  statement_id  = "AllowAPIGatewayInvokeSubmitFeedback"
  action        = "lambda:InvokeFunction"
  function_name = aws_lambda_function.submit_feedback.function_name
  principal     = "apigateway.amazonaws.com"
  source_arn    = "${aws_api_gateway_rest_api.dalscooter_api.execution_arn}/*/*"
}