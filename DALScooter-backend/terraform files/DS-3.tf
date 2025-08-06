# DS-3.tf - Message Passing Module Infrastructure

# Set the AWS provider with region
#provider "aws" {
  #region = "us-east-1"  # Use us-east-1 for Learner's Lab
#}

# -----------------------------------------------------
# Data source to get LabRole ARN
# -----------------------------------------------------
data "aws_iam_role" "lab_role" {
  name = "LabRole"
}

# -----------------------------------------------------
# DynamoDB - Message Table
# -----------------------------------------------------
resource "aws_dynamodb_table" "dalscooter_messages" {
  name           = "DALScooter-Messages"
  billing_mode   = "PAY_PER_REQUEST"
  hash_key       = "messageId"
  
  attribute {
    name = "messageId"
    type = "S"
  }
  
  attribute {
    name = "customerId"
    type = "S"
  }
  
  attribute {
    name = "bookingReferenceCode"
    type = "S"
  }
  
  global_secondary_index {
    name               = "CustomerIdIndex"
    hash_key           = "customerId"
    projection_type    = "ALL"
    read_capacity      = 5
    write_capacity     = 5
  }
  
  global_secondary_index {
    name               = "BookingReferenceIndex"
    hash_key           = "bookingReferenceCode"
    projection_type    = "ALL"
    read_capacity      = 5
    write_capacity     = 5
  }
  
  tags = {
    Name        = "DALScooter-Messages"
    Environment = "dev"
    Module      = "Message-Passing"
  }
}

# -----------------------------------------------------
# SNS - Customer Concern Topic
# -----------------------------------------------------
resource "aws_sns_topic" "customer_concerns" {
  name = "DALScooter-CustomerConcerns"
  
  tags = {
    Name        = "DALScooter-CustomerConcerns"
    Environment = "dev"
    Module      = "Message-Passing"
  }
}

# -----------------------------------------------------
# SNS - Notifications Topic
# -----------------------------------------------------
resource "aws_sns_topic" "notifications" {
  name = "DALScooter-Notifications"
  
  tags = {
    Name        = "DALScooter-Notifications"
    Environment = "dev"
    Module      = "Message-Passing"
  }
}

# -----------------------------------------------------
# SQS - Message Processing Queue
# -----------------------------------------------------
# Dead Letter Queue for Message Processing
resource "aws_sqs_queue" "message_processing_dlq" {
  name                      = "DALScooter-MessageProcessing-DLQ"
  message_retention_seconds = 1209600  # 14 days
  
  tags = {
    Name        = "DALScooter-MessageProcessing-DLQ"
    Environment = "dev"
    Module      = "Message-Passing"
  }
}

# Main Queue with DLQ
resource "aws_sqs_queue" "message_processing_with_dlq" {
  name                      = "DALScooter-MessageProcessing"
  delay_seconds             = 0
  max_message_size          = 262144  # 256 KB
  message_retention_seconds = 86400   # 24 hours
  receive_wait_time_seconds = 10
  visibility_timeout_seconds = 120
  
  redrive_policy = jsonencode({
    deadLetterTargetArn = aws_sqs_queue.message_processing_dlq.arn
    maxReceiveCount     = 5
  })
  
  tags = {
    Name        = "DALScooter-MessageProcessing"
    Environment = "dev"
    Module      = "Message-Passing"
  }
  
  depends_on = [aws_sqs_queue.message_processing_dlq]
}

# SQS Queue Policy to receive data from SNS
resource "aws_sqs_queue_policy" "message_processing_policy" {
  queue_url = aws_sqs_queue.message_processing_with_dlq.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Principal = {
          Service = "sns.amazonaws.com"
        }
        Action = "sqs:SendMessage"
        Resource = aws_sqs_queue.message_processing_with_dlq.arn
        Condition = {
          ArnEquals = {
            "aws:SourceArn" = aws_sns_topic.customer_concerns.arn
          }
        }
      }
    ]
  })
}

# -----------------------------------------------------
# SNS Subscription to SQS
# -----------------------------------------------------
resource "aws_sns_topic_subscription" "customer_concerns_to_sqs" {
  topic_arn = aws_sns_topic.customer_concerns.arn
  protocol  = "sqs"
  endpoint  = aws_sqs_queue.message_processing_with_dlq.arn
}

# -----------------------------------------------------
# Lambda Functions
# -----------------------------------------------------

# Create zip files for Lambda functions
data "archive_file" "message_publisher_zip" {
  type        = "zip"
  source_dir  = "${path.module}/../lambda-functions/message-publisher"
  output_path = "${path.module}/message_publisher.zip"
}

data "archive_file" "message_processor_zip" {
  type        = "zip"
  source_dir  = "${path.module}/../lambda-functions/message-processor"
  output_path = "${path.module}/message_processor.zip"
}

# Message Publisher Lambda
resource "aws_lambda_function" "message_publisher" {
  function_name    = "DALScooter-MessagePublisher"
  filename         = data.archive_file.message_publisher_zip.output_path
  source_code_hash = data.archive_file.message_publisher_zip.output_base64sha256
  role             = data.aws_iam_role.lab_role.arn
  handler          = "lambda_function.lambda_handler"
  runtime          = "python3.9"
  timeout          = 30
  memory_size      = 128

  environment {
    variables = {
      SNS_TOPIC_ARN     = aws_sns_topic.customer_concerns.arn
      MESSAGE_TABLE_NAME = aws_dynamodb_table.dalscooter_messages.name
    }
  }

  tags = {
    Name        = "DALScooter-MessagePublisher"
    Environment = "dev"
    Module      = "Message-Passing"
  }
}

# Message Processor Lambda
resource "aws_lambda_function" "message_processor" {
  function_name    = "DALScooter-MessageProcessor"
  filename         = data.archive_file.message_processor_zip.output_path
  source_code_hash = data.archive_file.message_processor_zip.output_base64sha256
  role             = data.aws_iam_role.lab_role.arn
  handler          = "lambda_function.lambda_handler"
  runtime          = "python3.9"
  timeout          = 60
  memory_size      = 128

  environment {
    variables = {
      MESSAGE_TABLE_NAME   = aws_dynamodb_table.dalscooter_messages.name
      FRANCHISE_TABLE_NAME = aws_dynamodb_table.dalscooter_users.name  # This table should be created in Module 1
      NOTIFICATION_TOPIC_ARN = aws_sns_topic.notifications.arn
      FROM_EMAIL           = "noreply@dalscooter.example.com"  # Update with a valid email
      BOOKING_TABLE_NAME   = aws_dynamodb_table.dalscooter_bookings.name
      VEHICLE_TABLE_NAME   = aws_dynamodb_table.dalscooter_vehicles.name
    }
  }

  tags = {
    Name        = "DALScooter-MessageProcessor"
    Environment = "dev"
    Module      = "Message-Passing"
  }
}

# -----------------------------------------------------
# Lambda Event Source Mapping
# -----------------------------------------------------
resource "aws_lambda_event_source_mapping" "sqs_to_message_processor" {
  event_source_arn = aws_sqs_queue.message_processing_with_dlq.arn
  function_name    = aws_lambda_function.message_processor.function_name
  batch_size       = 10
  enabled          = true
}

# -----------------------------------------------------
# API Gateway for Message Publisher (Using DS-1 API Gateway)
# -----------------------------------------------------
resource "aws_api_gateway_resource" "concerns" {
  rest_api_id = aws_api_gateway_rest_api.dalscooter_api.id
  parent_id   = aws_api_gateway_rest_api.dalscooter_api.root_resource_id
  path_part   = "concerns"
}

resource "aws_api_gateway_method" "post_concern" {
  rest_api_id   = aws_api_gateway_rest_api.dalscooter_api.id
  resource_id   = aws_api_gateway_resource.concerns.id
  http_method   = "POST"
  authorization = "NONE"  # Change to "COGNITO_USER_POOLS" when integrating with Auth module

  request_parameters = {
    "method.request.header.Content-Type" = true
  }
}

resource "aws_api_gateway_method" "concerns_options_method" {
  rest_api_id   = aws_api_gateway_rest_api.dalscooter_api.id
  resource_id   = aws_api_gateway_resource.concerns.id
  http_method   = "OPTIONS"
  authorization = "NONE"
}

resource "aws_api_gateway_integration" "lambda_integration" {
  rest_api_id = aws_api_gateway_rest_api.dalscooter_api.id
  resource_id = aws_api_gateway_resource.concerns.id
  http_method = aws_api_gateway_method.post_concern.http_method

  integration_http_method = "POST"
  type                    = "AWS_PROXY"
  uri                     = aws_lambda_function.message_publisher.invoke_arn
}

resource "aws_api_gateway_integration" "concerns_options_integration" {
  rest_api_id = aws_api_gateway_rest_api.dalscooter_api.id
  resource_id = aws_api_gateway_resource.concerns.id
  http_method = aws_api_gateway_method.concerns_options_method.http_method
  type        = "MOCK"

  request_templates = {
    "application/json" = "{\"statusCode\": 200}"
  }
}

resource "aws_api_gateway_method_response" "post_concern_response_200" {
  rest_api_id = aws_api_gateway_rest_api.dalscooter_api.id
  resource_id = aws_api_gateway_resource.concerns.id
  http_method = aws_api_gateway_method.post_concern.http_method
  status_code = "200"

  response_parameters = {
    "method.response.header.Access-Control-Allow-Origin"  = true
    "method.response.header.Access-Control-Allow-Methods" = true
    "method.response.header.Access-Control-Allow-Headers" = true
  }
}

resource "aws_api_gateway_method_response" "concerns_options_response_200" {
  rest_api_id = aws_api_gateway_rest_api.dalscooter_api.id
  resource_id = aws_api_gateway_resource.concerns.id
  http_method = aws_api_gateway_method.concerns_options_method.http_method
  status_code = "200"

  response_parameters = {
    "method.response.header.Access-Control-Allow-Origin"  = true
    "method.response.header.Access-Control-Allow-Methods" = true
    "method.response.header.Access-Control-Allow-Headers" = true
  }
}

resource "aws_api_gateway_integration_response" "post_concern_integration_response_200" {
  rest_api_id = aws_api_gateway_rest_api.dalscooter_api.id
  resource_id = aws_api_gateway_resource.concerns.id
  http_method = aws_api_gateway_method.post_concern.http_method
  status_code = aws_api_gateway_method_response.post_concern_response_200.status_code

  response_parameters = {
    "method.response.header.Access-Control-Allow-Origin"  = "'*'"
    "method.response.header.Access-Control-Allow-Methods" = "'POST,OPTIONS'"
    "method.response.header.Access-Control-Allow-Headers" = "'Content-Type,Authorization'"
  }

  depends_on = [aws_api_gateway_integration.lambda_integration]
}

resource "aws_api_gateway_integration_response" "concerns_options_integration_response_200" {
  rest_api_id = aws_api_gateway_rest_api.dalscooter_api.id
  resource_id = aws_api_gateway_resource.concerns.id
  http_method = aws_api_gateway_method.concerns_options_method.http_method
  status_code = aws_api_gateway_method_response.concerns_options_response_200.status_code

  response_parameters = {
    "method.response.header.Access-Control-Allow-Origin"  = "'*'"
    "method.response.header.Access-Control-Allow-Methods" = "'POST,OPTIONS'"
    "method.response.header.Access-Control-Allow-Headers" = "'Content-Type,Authorization'"
  }

  depends_on = [aws_api_gateway_integration.concerns_options_integration]
}

resource "aws_lambda_permission" "api_gateway_lambda" {
  statement_id  = "AllowExecutionFromAPIGateway"
  action        = "lambda:InvokeFunction"
  function_name = aws_lambda_function.message_publisher.function_name
  principal     = "apigateway.amazonaws.com"
  source_arn    = "${aws_api_gateway_rest_api.dalscooter_api.execution_arn}/*/*"
}

# Update the existing API Gateway deployment to include the new /concerns endpoint
resource "aws_api_gateway_deployment" "api_deployment" {
  rest_api_id = aws_api_gateway_rest_api.dalscooter_api.id

  depends_on = [
    aws_api_gateway_integration.lambda_integration,
    aws_api_gateway_integration.concerns_options_integration,
    aws_api_gateway_rest_api.dalscooter_api
  ]

  lifecycle {
    create_before_destroy = true
  }
}

data "archive_file" "notification_processor_zip" {
  type        = "zip"
  source_dir  = "${path.module}/../lambda-functions/notification-processor"
  output_path = "${path.module}/notification_processor.zip"
}

# Notification Processor Lambda
resource "aws_lambda_function" "notification_processor" {
  function_name    = "DALScooter-NotificationProcessor"
  filename         = data.archive_file.notification_processor_zip.output_path
  source_code_hash = data.archive_file.notification_processor_zip.output_base64sha256
  role             = data.aws_iam_role.lab_role.arn
  handler          = "lambda_function.lambda_handler"
  runtime          = "python3.9"
  timeout          = 30
  memory_size      = 128

  environment {
    variables = {
      NOTIFICATION_TOPIC_ARN = aws_sns_topic.notifications.arn
      DYNAMODB_TABLE = aws_dynamodb_table.dalscooter_users.name
    }
  }

  tags = {
    Name        = "DALScooter-NotificationProcessor"
    Environment = "dev"
    Module      = "Message-Passing"
  }
}

# -----------------------------------------------------
# SNS Subscription for Notification Processor
# -----------------------------------------------------
resource "aws_sns_topic_subscription" "notifications_to_processor" {
  topic_arn = aws_sns_topic.notifications.arn
  protocol  = "lambda"
  endpoint  = aws_lambda_function.notification_processor.arn
}

# -----------------------------------------------------
# Lambda Permission for SNS to Invoke Notification Processor
# -----------------------------------------------------
resource "aws_lambda_permission" "allow_sns_to_call_notification_processor" {
  statement_id  = "AllowExecutionFromSNS"
  action        = "lambda:InvokeFunction"
  function_name = aws_lambda_function.notification_processor.function_name
  principal     = "sns.amazonaws.com"
  source_arn    = aws_sns_topic.notifications.arn
}
# Since DS-1.tf already defines a 'prod' stage, we don't create a new stage
# Instead, we rely on the existing stage from DS-1.tf

# -----------------------------------------------------
# Outputs
# -----------------------------------------------------
output "api_gateway_url" {
  value = "${aws_api_gateway_stage.dalscooter_api_stage.invoke_url}/concerns"
  description = "URL for the Message API concerns endpoint"
}

output "customer_concerns_topic_arn" {
  value = aws_sns_topic.customer_concerns.arn
  description = "ARN of the Customer Concerns SNS Topic"
}

output "notifications_topic_arn" {
  value = aws_sns_topic.notifications.arn
  description = "ARN of the Notifications SNS Topic"
}

output "message_table_name" {
  value = aws_dynamodb_table.dalscooter_messages.name
  description = "Name of the Messages DynamoDB Table"
}