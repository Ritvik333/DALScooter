# sns.tf
resource "aws_sns_topic" "booking_requests" {
  name = "DALScooterBookingRequests"
}

resource "aws_sns_topic_policy" "booking_requests_policy" {
  arn    = aws_sns_topic.booking_requests.arn
  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect    = "Allow"
        Principal = "*"
        Action    = "sns:Publish"
        Resource  = aws_sns_topic.booking_requests.arn
        Condition = {
          ArnLike = {
            "aws:SourceArn" = "${aws_lambda_function.book_vehicle.arn}"
          }
        }
      }
    ]
  })
}

# sqs.tf
resource "aws_sqs_queue" "booking_queue" {
  name                       = "DALScooterBookingQueue"
  visibility_timeout_seconds = 30
  message_retention_seconds  = 345600 # 4 days
  delay_seconds              = 0
  receive_wait_time_seconds  = 10

  redrive_policy = jsonencode({
    deadLetterTargetArn = aws_sqs_queue.dlq.arn
    maxReceiveCount     = 3 # Number of retries before moving to DLQ
  })

  tags = {
    Name = "DALScooterBookingQueue"
  }
}

# Dead Letter Queue
resource "aws_sqs_queue" "dlq" {
  name                       = "DALScooterBookingDLQ"
  visibility_timeout_seconds = 30
  message_retention_seconds  = 1209600 # 14 days (longer retention for investigation)
  delay_seconds              = 0
  receive_wait_time_seconds  = 0

  tags = {
    Name = "DALScooterBookingDLQ"
  }
}

resource "aws_sns_topic_subscription" "booking_queue_subscription" {
  topic_arn = aws_sns_topic.booking_requests.arn
  protocol  = "sqs"
  endpoint  = aws_sqs_queue.booking_queue.arn
}

resource "aws_sqs_queue_policy" "booking_queue_policy" {
  queue_url = aws_sqs_queue.booking_queue.id
  policy    = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect    = "Allow"
        Principal = "*"
        Action    = "sqs:SendMessage"
        Resource  = aws_sqs_queue.booking_queue.arn
        Condition = {
          ArnEquals = {
            "aws:SourceArn" = aws_sns_topic.booking_requests.arn
          }
        }
      }
    ]
  })
}

# lambda_approval.tf
data "archive_file" "approval_zip" {
  type        = "zip"
  source_dir  = "${path.module}/../lambda-functions/approval-lambda"
  output_path = "${path.module}/approval_lambda.zip"
}

resource "aws_lambda_function" "approve_booking" {
  function_name = "DALScooterApproveBooking"
  handler       = "lambda_function.handler"
  runtime       = "python3.12"
  role          = "arn:aws:iam::101784748999:role/LabRole" # Using existing LabRole
  filename      = data.archive_file.approval_zip.output_path
  timeout       = 10

  environment {
    variables = {
      TABLE_NAME       = aws_dynamodb_table.dalscooter_bookings.name
      OPERATOR_TOPIC_ARN = aws_sns_topic.booking_requests.arn # Reuse for simplicity
      USER_DYNAMODB_TABLE = aws_dynamodb_table.dalscooter_users.name
      VEHICLES_DYNAMODB_TABLE = aws_dynamodb_table.dalscooter_vehicles.name
    }
  }

  tags = {
    Name = "DALScooterApproveBooking"
  }
}

resource "aws_lambda_event_source_mapping" "sqs_trigger" {
  event_source_arn = aws_sqs_queue.booking_queue.arn
  function_name    = aws_lambda_function.approve_booking.arn
  batch_size       = 10
}

# New Lambda for fetching pending bookings
data "archive_file" "get_pending_bookings_zip" {
  type        = "zip"
  source_dir  = "${path.module}/../lambda-functions/get-pending-bookings"
  output_path = "${path.module}/get_pending_bookings_lambda.zip"
}

resource "aws_lambda_function" "get_pending_bookings" {
  function_name = "DALScooterGetPendingBookings"
  handler       = "lambda_function.handler"
  runtime       = "python3.12"
  role          = "arn:aws:iam::101784748999:role/LabRole" # Using existing LabRole
  filename      = data.archive_file.get_pending_bookings_zip.output_path
  timeout       = 10

  environment {
    variables = {
      TABLE_NAME           = aws_dynamodb_table.dalscooter_bookings.name
      VEHICLES_TABLE_NAME  = aws_dynamodb_table.dalscooter_vehicles.name # Assuming vehicles table exists
    }
  }

  tags = {
    Name = "DALScooterGetPendingBookings"
  }
}

# New Lambda for updating booking status
data "archive_file" "update_booking_status_zip" {
  type        = "zip"
  source_dir  = "${path.module}/../lambda-functions/update-booking-status"
  output_path = "${path.module}/update_booking_status_lambda.zip"
}

resource "aws_lambda_function" "update_booking_status" {
  function_name = "DALScooterUpdateBookingStatus"
  handler       = "lambda_function.handler"
  runtime       = "python3.12"
  role          = "arn:aws:iam::101784748999:role/LabRole" # Using existing LabRole
  filename      = data.archive_file.update_booking_status_zip.output_path
  timeout       = 10

  environment {
    variables = {
      TABLE_NAME          = aws_dynamodb_table.dalscooter_bookings.name
      OPERATOR_TOPIC_ARN  = aws_sns_topic.booking_requests.arn # For notifications if needed
      USERS_TABLE_NAME    = aws_dynamodb_table.dalscooter_users.name
    }
  }

  tags = {
    Name = "DALScooterUpdateBookingStatus"
  }
}

# API Gateway Resources
resource "aws_api_gateway_resource" "get_pending_bookings_resource" {
  rest_api_id = aws_api_gateway_rest_api.dalscooter_api.id
  parent_id   = aws_api_gateway_rest_api.dalscooter_api.root_resource_id
  path_part   = "get-pending-bookings"
}

resource "aws_api_gateway_resource" "update_booking_status_resource" {
  rest_api_id = aws_api_gateway_rest_api.dalscooter_api.id
  parent_id   = aws_api_gateway_rest_api.dalscooter_api.root_resource_id
  path_part   = "update-booking-status"
}

# API Gateway Methods and Integrations for get-pending-bookings
resource "aws_api_gateway_method" "get_pending_bookings_method" {
  rest_api_id   = aws_api_gateway_rest_api.dalscooter_api.id
  resource_id   = aws_api_gateway_resource.get_pending_bookings_resource.id
  http_method   = "GET"
  authorization = "NONE"

  request_parameters = {
    "method.request.querystring.email" = true # Require email parameter
  }
}

resource "aws_api_gateway_integration" "get_pending_bookings_integration" {
  rest_api_id             = aws_api_gateway_rest_api.dalscooter_api.id
  resource_id             = aws_api_gateway_resource.get_pending_bookings_resource.id
  http_method             = aws_api_gateway_method.get_pending_bookings_method.http_method
  integration_http_method = "POST"
  type                    = "AWS_PROXY"
  uri                     = aws_lambda_function.get_pending_bookings.invoke_arn
}

resource "aws_api_gateway_method" "get_pending_bookings_options_method" {
  rest_api_id   = aws_api_gateway_rest_api.dalscooter_api.id
  resource_id   = aws_api_gateway_resource.get_pending_bookings_resource.id
  http_method   = "OPTIONS"
  authorization = "NONE"
}

resource "aws_api_gateway_integration" "get_pending_bookings_options_integration" {
  rest_api_id             = aws_api_gateway_rest_api.dalscooter_api.id
  resource_id             = aws_api_gateway_resource.get_pending_bookings_resource.id
  http_method             = aws_api_gateway_method.get_pending_bookings_options_method.http_method
  type                    = "MOCK"
  request_templates       = {
    "application/json" = "{\"statusCode\": 200}"
  }
  passthrough_behavior    = "WHEN_NO_MATCH"
}

resource "aws_api_gateway_method_response" "get_pending_bookings_options_response_200" {
  rest_api_id   = aws_api_gateway_rest_api.dalscooter_api.id
  resource_id   = aws_api_gateway_resource.get_pending_bookings_resource.id
  http_method   = aws_api_gateway_method.get_pending_bookings_options_method.http_method
  status_code   = "200"
  response_parameters = {
    "method.response.header.Access-Control-Allow-Origin" = true
    "method.response.header.Access-Control-Allow-Methods" = true
    "method.response.header.Access-Control-Allow-Headers" = true
  }
  response_models = {
    "application/json" = "Empty"
  }
}

resource "aws_api_gateway_integration_response" "get_pending_bookings_options_integration_response_200" {
  rest_api_id   = aws_api_gateway_rest_api.dalscooter_api.id
  resource_id   = aws_api_gateway_resource.get_pending_bookings_resource.id
  http_method   = aws_api_gateway_method.get_pending_bookings_options_method.http_method
  status_code   = aws_api_gateway_method_response.get_pending_bookings_options_response_200.status_code
  response_parameters = {
    "method.response.header.Access-Control-Allow-Origin" = "'*'"
    "method.response.header.Access-Control-Allow-Methods" = "'GET,OPTIONS'"
    "method.response.header.Access-Control-Allow-Headers" = "'Content-Type,Authorization,X-Amz-Date,X-Api-Key,X-Amz-Security-Token'"
  }
  depends_on = [aws_api_gateway_integration.get_pending_bookings_options_integration]
}

resource "aws_api_gateway_method_response" "get_pending_bookings_response_200" {
  rest_api_id   = aws_api_gateway_rest_api.dalscooter_api.id
  resource_id   = aws_api_gateway_resource.get_pending_bookings_resource.id
  http_method   = aws_api_gateway_method.get_pending_bookings_method.http_method
  status_code   = "200"
  response_parameters = {
    "method.response.header.Access-Control-Allow-Origin" = true
    "method.response.header.Access-Control-Allow-Methods" = true
    "method.response.header.Access-Control-Allow-Headers" = true
  }
  response_models = {
    "application/json" = "Empty"
  }
}

resource "aws_api_gateway_integration_response" "get_pending_bookings_integration_response_200" {
  rest_api_id   = aws_api_gateway_rest_api.dalscooter_api.id
  resource_id   = aws_api_gateway_resource.get_pending_bookings_resource.id
  http_method   = aws_api_gateway_method.get_pending_bookings_method.http_method
  status_code   = aws_api_gateway_method_response.get_pending_bookings_response_200.status_code
  response_parameters = {
    "method.response.header.Access-Control-Allow-Origin" = "'*'"
    "method.response.header.Access-Control-Allow-Methods" = "'GET,OPTIONS'"
    "method.response.header.Access-Control-Allow-Headers" = "'Content-Type,Authorization,X-Amz-Date,X-Api-Key,X-Amz-Security-Token'"
  }
  depends_on = [aws_api_gateway_integration.get_pending_bookings_integration]
}

# API Gateway Methods and Integrations for update-booking-status
resource "aws_api_gateway_method" "update_booking_status_method" {
  rest_api_id   = aws_api_gateway_rest_api.dalscooter_api.id
  resource_id   = aws_api_gateway_resource.update_booking_status_resource.id
  http_method   = "POST"
  authorization = "NONE"
}

resource "aws_api_gateway_integration" "update_booking_status_integration" {
  rest_api_id             = aws_api_gateway_rest_api.dalscooter_api.id
  resource_id             = aws_api_gateway_resource.update_booking_status_resource.id
  http_method             = aws_api_gateway_method.update_booking_status_method.http_method
  integration_http_method = "POST"
  type                    = "AWS_PROXY"
  uri                     = aws_lambda_function.update_booking_status.invoke_arn
}

resource "aws_api_gateway_method" "update_booking_status_options_method" {
  rest_api_id   = aws_api_gateway_rest_api.dalscooter_api.id
  resource_id   = aws_api_gateway_resource.update_booking_status_resource.id
  http_method   = "OPTIONS"
  authorization = "NONE"
}

resource "aws_api_gateway_integration" "update_booking_status_options_integration" {
  rest_api_id             = aws_api_gateway_rest_api.dalscooter_api.id
  resource_id             = aws_api_gateway_resource.update_booking_status_resource.id
  http_method             = aws_api_gateway_method.update_booking_status_options_method.http_method
  type                    = "MOCK"
  request_templates       = {
    "application/json" = "{\"statusCode\": 200}"
  }
  passthrough_behavior    = "WHEN_NO_MATCH"
}

resource "aws_api_gateway_method_response" "update_booking_status_options_response_200" {
  rest_api_id   = aws_api_gateway_rest_api.dalscooter_api.id
  resource_id   = aws_api_gateway_resource.update_booking_status_resource.id
  http_method   = aws_api_gateway_method.update_booking_status_options_method.http_method
  status_code   = "200"
  response_parameters = {
    "method.response.header.Access-Control-Allow-Origin" = true
    "method.response.header.Access-Control-Allow-Methods" = true
    "method.response.header.Access-Control-Allow-Headers" = true
  }
  response_models = {
    "application/json" = "Empty"
  }
}

resource "aws_api_gateway_integration_response" "update_booking_status_options_integration_response_200" {
  rest_api_id   = aws_api_gateway_rest_api.dalscooter_api.id
  resource_id   = aws_api_gateway_resource.update_booking_status_resource.id
  http_method   = aws_api_gateway_method.update_booking_status_options_method.http_method
  status_code   = aws_api_gateway_method_response.update_booking_status_options_response_200.status_code
  response_parameters = {
    "method.response.header.Access-Control-Allow-Origin" = "'*'"
    "method.response.header.Access-Control-Allow-Methods" = "'POST,OPTIONS'"
    "method.response.header.Access-Control-Allow-Headers" = "'Content-Type,Authorization,X-Amz-Date,X-Api-Key,X-Amz-Security-Token'"
  }
  depends_on = [aws_api_gateway_integration.update_booking_status_options_integration]
}

resource "aws_api_gateway_method_response" "update_booking_status_response_200" {
  rest_api_id   = aws_api_gateway_rest_api.dalscooter_api.id
  resource_id   = aws_api_gateway_resource.update_booking_status_resource.id
  http_method   = aws_api_gateway_method.update_booking_status_method.http_method
  status_code   = "200"
  response_parameters = {
    "method.response.header.Access-Control-Allow-Origin" = true
    "method.response.header.Access-Control-Allow-Methods" = true
    "method.response.header.Access-Control-Allow-Headers" = true
  }
  response_models = {
    "application/json" = "Empty"
  }
}

resource "aws_api_gateway_integration_response" "update_booking_status_integration_response_200" {
  rest_api_id   = aws_api_gateway_rest_api.dalscooter_api.id
  resource_id   = aws_api_gateway_resource.update_booking_status_resource.id
  http_method   = aws_api_gateway_method.update_booking_status_method.http_method
  status_code   = aws_api_gateway_method_response.update_booking_status_response_200.status_code
  response_parameters = {
    "method.response.header.Access-Control-Allow-Origin" = "'*'"
    "method.response.header.Access-Control-Allow-Methods" = "'POST,OPTIONS'"
    "method.response.header.Access-Control-Allow-Headers" = "'Content-Type,Authorization,X-Amz-Date,X-Api-Key,X-Amz-Security-Token'"
  }
  depends_on = [aws_api_gateway_integration.update_booking_status_integration]
}

# Lambda Permissions
resource "aws_lambda_permission" "allow_api_gateway_get_pending_bookings" {
  statement_id  = "AllowAPIGatewayInvokeGetPendingBookings"
  action        = "lambda:InvokeFunction"
  function_name = aws_lambda_function.get_pending_bookings.function_name
  principal     = "apigateway.amazonaws.com"
  source_arn    = "${aws_api_gateway_rest_api.dalscooter_api.execution_arn}/*/get-pending-bookings"
}

resource "aws_lambda_permission" "allow_api_gateway_update_booking_status" {
  statement_id  = "AllowAPIGatewayInvokeUpdateBookingStatus"
  action        = "lambda:InvokeFunction"
  function_name = aws_lambda_function.update_booking_status.function_name
  principal     = "apigateway.amazonaws.com"
  source_arn    = "${aws_api_gateway_rest_api.dalscooter_api.execution_arn}/*/update-booking-status"
}