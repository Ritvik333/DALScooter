# Reference LabRole dynamically using data source
data "aws_iam_role" "lab_role_notification" {
  name = "LabRole"
}

# -----------------------------------------------------
# SNS Topics for Notifications
# -----------------------------------------------------
resource "aws_sns_topic" "registration_notification_topic" {
  name = "DALScooter-Registration-Notifications"
  
  tags = {
    Name        = "DALScooter-Registration-Notifications"
    Environment = "dev"
    Module      = "Notification"
  }
}

resource "aws_sns_topic" "login_notification_topic" {
  name = "DALScooter-Login-Notifications"
  
  tags = {
    Name        = "DALScooter-Login-Notifications"
    Environment = "dev"
    Module      = "Notification"
  }
}

resource "aws_sns_topic" "booking_notification_topic" {
  name = "DALScooter-Booking-Notifications"
  
  tags = {
    Name        = "DALScooter-Booking-Notifications"
    Environment = "dev"
    Module      = "Notification"
  }
}

# -----------------------------------------------------
# SQS Queue for Booking Requests
# -----------------------------------------------------
# Dead Letter Queue for Booking Requests
resource "aws_sqs_queue" "booking_request_dlq" {
  name                      = "DALScooter-BookingRequest-DLQ"
  message_retention_seconds = 1209600  # 14 days
  
  tags = {
    Name        = "DALScooter-BookingRequest-DLQ"
    Environment = "dev"
    Module      = "Notification"
  }
}

# Main Queue with DLQ
resource "aws_sqs_queue" "booking_request_queue" {
  name                      = "DALScooter-BookingRequest"
  delay_seconds             = 0
  max_message_size          = 262144  # 256 KB
  message_retention_seconds = 86400   # 24 hours
  receive_wait_time_seconds = 10
  visibility_timeout_seconds = 120
  
  redrive_policy = jsonencode({
    deadLetterTargetArn = aws_sqs_queue.booking_request_dlq.arn
    maxReceiveCount     = 5
  })
  
  tags = {
    Name        = "DALScooter-BookingRequest"
    Environment = "dev"
    Module      = "Notification"
  }
  
  depends_on = [aws_sqs_queue.booking_request_dlq]
}

# -----------------------------------------------------
# Lambda Functions
# -----------------------------------------------------

# Create zip files for Lambda functions
data "archive_file" "notification_handler_zip" {
  type        = "zip"
  source_dir  = "${path.module}/../lambda-functions/notification-handler"
  output_path = "${path.module}/notification_handler.zip"
}

data "archive_file" "booking_processor_zip" {
  type        = "zip"
  source_dir  = "${path.module}/../lambda-functions/booking-processor"
  output_path = "${path.module}/booking_processor.zip"
}

# Notification Handler Lambda
resource "aws_lambda_function" "notification_handler" {
  function_name    = "DALScooter-NotificationHandler"
  filename         = data.archive_file.notification_handler_zip.output_path
  source_code_hash = data.archive_file.notification_handler_zip.output_base64sha256
  role             = data.aws_iam_role.lab_role_notification.arn
  handler          = "lambda_function.lambda_handler"
  runtime          = "python3.9"
  timeout          = 30
  memory_size      = 128

  environment {
    variables = {
      REGISTRATION_TOPIC_ARN = aws_sns_topic.registration_notification_topic.arn
      LOGIN_TOPIC_ARN        = aws_sns_topic.login_notification_topic.arn
      BOOKING_TOPIC_ARN      = aws_sns_topic.booking_notification_topic.arn
      DEFAULT_TOPIC_ARN      = aws_sns_topic.booking_notification_topic.arn
      FROM_EMAIL             = "noreply@dalscooter.example.com" # Update with a valid email
    }
  }

  tags = {
    Name        = "DALScooter-NotificationHandler"
    Environment = "dev"
    Module      = "Notification"
  }
}

# Booking Processor Lambda
resource "aws_lambda_function" "booking_processor" {
  function_name    = "DALScooter-BookingProcessor"
  filename         = data.archive_file.booking_processor_zip.output_path
  source_code_hash = data.archive_file.booking_processor_zip.output_base64sha256
  role             = data.aws_iam_role.lab_role_notification.arn
  handler          = "lambda_function.lambda_handler"
  runtime          = "python3.9"
  timeout          = 60
  memory_size      = 128

  environment {
    variables = {
      BOOKINGS_TABLE         = "DALScooterBookings" # Reference to existing DynamoDB table
      NOTIFICATION_LAMBDA_ARN = aws_lambda_function.notification_handler.arn
    }
  }

  tags = {
    Name        = "DALScooter-BookingProcessor"
    Environment = "dev"
    Module      = "Notification"
  }
}

# -----------------------------------------------------
# Lambda Event Source Mapping
# -----------------------------------------------------
resource "aws_lambda_event_source_mapping" "sqs_to_booking_processor" {
  event_source_arn = aws_sqs_queue.booking_request_queue.arn
  function_name    = aws_lambda_function.booking_processor.function_name
  batch_size       = 10
  enabled          = true
}

# -----------------------------------------------------
# Lambda Permissions
# -----------------------------------------------------
resource "aws_lambda_permission" "notification_handler_permission" {
  statement_id  = "AllowExecutionFromOtherLambdas"
  action        = "lambda:InvokeFunction"
  function_name = aws_lambda_function.notification_handler.function_name
  principal     = "lambda.amazonaws.com"
}

resource "aws_lambda_permission" "booking_processor_sqs_permission" {
  statement_id  = "AllowExecutionFromSQS"
  action        = "lambda:InvokeFunction"
  function_name = aws_lambda_function.booking_processor.function_name
  principal     = "sqs.amazonaws.com"
  source_arn    = aws_sqs_queue.booking_request_queue.arn
}

# -----------------------------------------------------
# Outputs
# -----------------------------------------------------
output "registration_topic_arn" {
  description = "ARN of the registration notification SNS topic"
  value       = aws_sns_topic.registration_notification_topic.arn
}

output "login_topic_arn" {
  description = "ARN of the login notification SNS topic"
  value       = aws_sns_topic.login_notification_topic.arn
}

output "booking_topic_arn" {
  description = "ARN of the booking notification SNS topic"
  value       = aws_sns_topic.booking_notification_topic.arn
}

output "booking_queue_url" {
  description = "URL of the booking request SQS queue"
  value       = aws_sqs_queue.booking_request_queue.url
}

output "notification_handler_arn" {
  description = "ARN of the notification handler Lambda function"
  value       = aws_lambda_function.notification_handler.arn
}

output "booking_processor_arn" {
  description = "ARN of the booking processor Lambda function"
  value       = aws_lambda_function.booking_processor.arn
}

# Important environment variables that need to be manually added
output "auth_handler_env_vars" {
  description = "Environment variables that need to be MANUALLY added to auth_handler Lambda"
  value = {
    NOTIFICATION_LAMBDA_ARN = aws_lambda_function.notification_handler.arn
  }
}

output "book_vehicle_env_vars" {
  description = "Environment variables that need to be MANUALLY added to book_vehicle Lambda"
  value = {
    BOOKING_QUEUE_URL = aws_sqs_queue.booking_request_queue.url
  }
}