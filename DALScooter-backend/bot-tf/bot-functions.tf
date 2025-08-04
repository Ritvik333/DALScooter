# Define LabRole ARN (hardcoded since we can't query IAM)
locals {
  lab_role_arn = "arn:aws:iam::802805047192:role/LabRole"
}

# DynamoDB Table for Support Tickets
resource "aws_dynamodb_table" "support_tickets" {
  name         = "DALScooterSupportTickets"
  billing_mode = "PAY_PER_REQUEST"
  hash_key     = "ticketId"

  attribute {
    name = "ticketId"
    type = "S"
  }

  attribute {
    name = "userId"
    type = "S"
  }

  attribute {
    name = "status"
    type = "S"
  }

  global_secondary_index {
    name            = "UserIdIndex"
    hash_key        = "userId"
    projection_type = "ALL"
  }

  global_secondary_index {
    name            = "StatusIndex"
    hash_key        = "status"
    projection_type = "ALL"
  }
}

# Booking Lookup Lambda Function
resource "aws_lambda_function" "booking_lookup_handler" {
  filename      = "booking_lookup_handler.zip"
  function_name = "booking-lookup-handler"
  role          = local.lab_role_arn
  handler       = "lambda_function.lambda_handler"
  runtime       = "python3.9"
  timeout       = 30
  memory_size   = 256
}

# Customer Support Lambda Function
resource "aws_lambda_function" "customer_support_handler" {
  filename      = "customer_support_handler.zip"
  function_name = "customer-support-handler"
  role          = local.lab_role_arn
  handler       = "lambda_function.lambda_handler"
  runtime       = "python3.9"
  timeout       = 30
  memory_size   = 256
}

# Navigation Help Lambda Function
resource "aws_lambda_function" "navigation_help_handler" {
  filename      = "navigation_help_handler.zip"
  function_name = "navigation-help-handler"
  role          = local.lab_role_arn
  handler       = "lambda_function.lambda_handler"
  runtime       = "python3.9"
  timeout       = 30
  memory_size   = 256
}

# Outputs for Bot Functions
output "booking_lookup_lambda_arn" {
  description = "ARN of the Booking Lookup Lambda function"
  value       = aws_lambda_function.booking_lookup_handler.arn
}

output "customer_support_lambda_arn" {
  description = "ARN of the Customer Support Lambda function"
  value       = aws_lambda_function.customer_support_handler.arn
}

output "navigation_help_lambda_arn" {
  description = "ARN of the Navigation Help Lambda function"
  value       = aws_lambda_function.navigation_help_handler.arn
}

output "support_tickets_table_name" {
  description = "Name of the Support Tickets DynamoDB table"
  value       = aws_dynamodb_table.support_tickets.name
}