# DynamoDB Table for Bookings
resource "aws_dynamodb_table" "dalscooter_bookings" {
  name           = "DALScooterBookings"
  billing_mode   = "PAY_PER_REQUEST"
  hash_key       = "bookingID"

  attribute {
    name = "bookingID"
    type = "S"
  }

  attribute {
    name = "vehicleID"
    type = "S"
  }

  global_secondary_index {
    name               = "VehicleIDIndex"
    hash_key           = "vehicleID"
    projection_type    = "ALL"
    read_capacity      = 0
    write_capacity     = 0
  }

  tags = {
    Name = "DALScooterBookings"
  }
}

# Lambda Function for Book Vehicle
resource "aws_lambda_function" "book_vehicle" {
  function_name = "DALScooterBookVehicle"
  handler       = "lambda_function.handler"
  runtime       = "python3.12"
  role          = "arn:aws:iam::959817979665:role/LabRole"
  filename      = "book_vehicle_handler.zip"
  timeout       = 10

  environment {
    variables = {
      TABLE_NAME = aws_dynamodb_table.dalscooter_bookings.name
    }
  }
}

# Lambda Function for Get Bookings
resource "aws_lambda_function" "get_bookings" {
  function_name = "DALScooterGetBookings"
  handler       = "lambda_function.handler"
  runtime       = "python3.12"
  role          = "arn:aws:iam::959817979665:role/LabRole"
  filename      = "book_vehicle_handler.zip"
  timeout       = 10

  environment {
    variables = {
      TABLE_NAME = aws_dynamodb_table.dalscooter_bookings.name
    }
  }
}

# API Gateway Resources
resource "aws_api_gateway_resource" "book_vehicle_resource" {
  rest_api_id = aws_api_gateway_rest_api.dalscooter_api.id
  parent_id   = aws_api_gateway_rest_api.dalscooter_api.root_resource_id
  path_part   = "book-vehicle"
}

resource "aws_api_gateway_resource" "get_bookings_resource" {
  rest_api_id = aws_api_gateway_rest_api.dalscooter_api.id
  parent_id   = aws_api_gateway_rest_api.dalscooter_api.root_resource_id
  path_part   = "get-bookings"
}

# Book Vehicle Method and Integration
resource "aws_api_gateway_method" "book_vehicle_method" {
  rest_api_id   = aws_api_gateway_rest_api.dalscooter_api.id
  resource_id   = aws_api_gateway_resource.book_vehicle_resource.id
  http_method   = "POST"
  authorization = "NONE"
}

resource "aws_api_gateway_integration" "book_vehicle_integration" {
  rest_api_id             = aws_api_gateway_rest_api.dalscooter_api.id
  resource_id             = aws_api_gateway_resource.book_vehicle_resource.id
  http_method             = aws_api_gateway_method.book_vehicle_method.http_method
  integration_http_method = "POST"
  type                    = "AWS_PROXY"
  uri                     = aws_lambda_function.book_vehicle.invoke_arn
}

resource "aws_api_gateway_method_response" "book_vehicle_response_200" {
  rest_api_id = aws_api_gateway_rest_api.dalscooter_api.id
  resource_id = aws_api_gateway_resource.book_vehicle_resource.id
  http_method = aws_api_gateway_method.book_vehicle_method.http_method
  status_code = "200"
  response_parameters = {
    "method.response.header.Access-Control-Allow-Origin"  = true
    "method.response.header.Access-Control-Allow-Methods" = true
    "method.response.header.Access-Control-Allow-Headers" = true
  }
}

resource "aws_api_gateway_method_response" "book_vehicle_response_409" {
  rest_api_id = aws_api_gateway_rest_api.dalscooter_api.id
  resource_id = aws_api_gateway_resource.book_vehicle_resource.id
  http_method = aws_api_gateway_method.book_vehicle_method.http_method
  status_code = "409"
  response_parameters = {
    "method.response.header.Access-Control-Allow-Origin"  = true
    "method.response.header.Access-Control-Allow-Methods" = true
    "method.response.header.Access-Control-Allow-Headers" = true
  }
}

resource "aws_api_gateway_integration_response" "book_vehicle_integration_response_200" {
  rest_api_id = aws_api_gateway_rest_api.dalscooter_api.id
  resource_id = aws_api_gateway_resource.book_vehicle_resource.id
  http_method = aws_api_gateway_method.book_vehicle_method.http_method
  status_code = aws_api_gateway_method_response.book_vehicle_response_200.status_code
  response_parameters = {
    "method.response.header.Access-Control-Allow-Origin"  = "'*'"
    "method.response.header.Access-Control-Allow-Methods" = "'POST,OPTIONS'"
    "method.response.header.Access-Control-Allow-Headers" = "'Content-Type,Authorization,X-Amz-Date,X-Api-Key,X-Amz-Security-Token'"
  }
  depends_on = [aws_api_gateway_integration.book_vehicle_integration]
}

resource "aws_api_gateway_integration_response" "book_vehicle_integration_response_409" {
  rest_api_id = aws_api_gateway_rest_api.dalscooter_api.id
  resource_id = aws_api_gateway_resource.book_vehicle_resource.id
  http_method = aws_api_gateway_method.book_vehicle_method.http_method
  status_code = aws_api_gateway_method_response.book_vehicle_response_409.status_code
  selection_pattern = ".*conflict.*"
  response_parameters = {
    "method.response.header.Access-Control-Allow-Origin"  = "'*'"
    "method.response.header.Access-Control-Allow-Methods" = "'POST,OPTIONS'"
    "method.response.header.Access-Control-Allow-Headers" = "'Content-Type,Authorization,X-Amz-Date,X-Api-Key,X-Amz-Security-Token'"
  }
  depends_on = [aws_api_gateway_integration.book_vehicle_integration]
}

# Get Bookings Method and Integration
resource "aws_api_gateway_method" "get_bookings_method" {
  rest_api_id   = aws_api_gateway_rest_api.dalscooter_api.id
  resource_id   = aws_api_gateway_resource.get_bookings_resource.id
  http_method   = "GET"
  authorization = "NONE"  # Optional: Add Cognito if needed
  request_parameters = {
    "method.request.querystring.email" = true  # Enable email as a required query parameter
  }
}

resource "aws_api_gateway_integration" "get_bookings_integration" {
  rest_api_id             = aws_api_gateway_rest_api.dalscooter_api.id
  resource_id             = aws_api_gateway_resource.get_bookings_resource.id
  http_method             = aws_api_gateway_method.get_bookings_method.http_method
  integration_http_method = "POST"
  type                    = "AWS_PROXY"
  uri                     = aws_lambda_function.get_bookings.invoke_arn
}

resource "aws_api_gateway_method_response" "get_bookings_response_200" {
  rest_api_id = aws_api_gateway_rest_api.dalscooter_api.id
  resource_id = aws_api_gateway_resource.get_bookings_resource.id
  http_method = aws_api_gateway_method.get_bookings_method.http_method
  status_code = "200"
  response_parameters = {
    "method.response.header.Access-Control-Allow-Origin"  = true
    "method.response.header.Access-Control-Allow-Methods" = true
    "method.response.header.Access-Control-Allow-Headers" = true
  }
}

resource "aws_api_gateway_integration_response" "get_bookings_integration_response_200" {
  rest_api_id = aws_api_gateway_rest_api.dalscooter_api.id
  resource_id = aws_api_gateway_resource.get_bookings_resource.id
  http_method = aws_api_gateway_method.get_bookings_method.http_method
  status_code = aws_api_gateway_method_response.get_bookings_response_200.status_code
  response_parameters = {
    "method.response.header.Access-Control-Allow-Origin"  = "'*'"
    "method.response.header.Access-Control-Allow-Methods" = "'GET,OPTIONS'"
    "method.response.header.Access-Control-Allow-Headers" = "'Content-Type,Authorization,X-Amz-Date,X-Api-Key,X-Amz-Security-Token'"
  }
  depends_on = [aws_api_gateway_integration.get_bookings_integration]
}

# OPTIONS Methods for CORS
resource "aws_api_gateway_method" "book_vehicle_options_method" {
  rest_api_id   = aws_api_gateway_rest_api.dalscooter_api.id
  resource_id   = aws_api_gateway_resource.book_vehicle_resource.id
  http_method   = "OPTIONS"
  authorization = "NONE"
}

resource "aws_api_gateway_integration" "book_vehicle_options_integration" {
  rest_api_id = aws_api_gateway_rest_api.dalscooter_api.id
  resource_id = aws_api_gateway_resource.book_vehicle_resource.id
  http_method = aws_api_gateway_method.book_vehicle_options_method.http_method
  type        = "MOCK"
  request_templates = {
    "application/json" = "{\"statusCode\": 200}"
  }
}

resource "aws_api_gateway_method_response" "book_vehicle_options_response_200" {
  rest_api_id = aws_api_gateway_rest_api.dalscooter_api.id
  resource_id = aws_api_gateway_resource.book_vehicle_resource.id
  http_method = aws_api_gateway_method.book_vehicle_options_method.http_method
  status_code = "200"
  response_parameters = {
    "method.response.header.Access-Control-Allow-Origin"  = true
    "method.response.header.Access-Control-Allow-Methods" = true
    "method.response.header.Access-Control-Allow-Headers" = true
  }
}

resource "aws_api_gateway_integration_response" "book_vehicle_options_integration_response_200" {
  rest_api_id = aws_api_gateway_rest_api.dalscooter_api.id
  resource_id = aws_api_gateway_resource.book_vehicle_resource.id
  http_method = aws_api_gateway_method.book_vehicle_options_method.http_method
  status_code = aws_api_gateway_method_response.book_vehicle_options_response_200.status_code
  response_parameters = {
    "method.response.header.Access-Control-Allow-Origin"  = "'*'"
    "method.response.header.Access-Control-Allow-Methods" = "'POST,OPTIONS'"
    "method.response.header.Access-Control-Allow-Headers" = "'Content-Type,Authorization,X-Amz-Date,X-Api-Key,X-Amz-Security-Token'"
  }
  depends_on = [aws_api_gateway_integration.book_vehicle_options_integration]
}

resource "aws_api_gateway_method" "get_bookings_options_method" {
  rest_api_id   = aws_api_gateway_rest_api.dalscooter_api.id
  resource_id   = aws_api_gateway_resource.get_bookings_resource.id
  http_method   = "OPTIONS"
  authorization = "NONE"
}

resource "aws_api_gateway_integration" "get_bookings_options_integration" {
  rest_api_id = aws_api_gateway_rest_api.dalscooter_api.id
  resource_id = aws_api_gateway_resource.get_bookings_resource.id
  http_method = aws_api_gateway_method.get_bookings_options_method.http_method
  type        = "MOCK"
  request_templates = {
    "application/json" = "{\"statusCode\": 200}"
  }
}

resource "aws_api_gateway_method_response" "get_bookings_options_response_200" {
  rest_api_id = aws_api_gateway_rest_api.dalscooter_api.id
  resource_id = aws_api_gateway_resource.get_bookings_resource.id
  http_method = aws_api_gateway_method.get_bookings_options_method.http_method
  status_code = "200"
  response_parameters = {
    "method.response.header.Access-Control-Allow-Origin"  = true
    "method.response.header.Access-Control-Allow-Methods" = true
    "method.response.header.Access-Control-Allow-Headers" = true
  }
}

resource "aws_api_gateway_integration_response" "get_bookings_options_integration_response_200" {
  rest_api_id = aws_api_gateway_rest_api.dalscooter_api.id
  resource_id = aws_api_gateway_resource.get_bookings_resource.id
  http_method = aws_api_gateway_method.get_bookings_options_method.http_method
  status_code = aws_api_gateway_method_response.get_bookings_options_response_200.status_code
  response_parameters = {
    "method.response.header.Access-Control-Allow-Origin"  = "'*'"
    "method.response.header.Access-Control-Allow-Methods" = "'GET,OPTIONS'"
    "method.response.header.Access-Control-Allow-Headers" = "'Content-Type,Authorization,X-Amz-Date,X-Api-Key,X-Amz-Security-Token'"
  }
  depends_on = [aws_api_gateway_integration.get_bookings_options_integration]
}

# Lambda Permissions
resource "aws_lambda_permission" "apigw_book_vehicle" {
  statement_id  = "AllowAPIGatewayInvokeBookVehicle"
  action        = "lambda:InvokeFunction"
  function_name = aws_lambda_function.book_vehicle.function_name
  principal     = "apigateway.amazonaws.com"
  source_arn    = "${aws_api_gateway_rest_api.dalscooter_api.execution_arn}/*/*"
}

resource "aws_lambda_permission" "apigw_get_bookings" {
  statement_id  = "AllowAPIGatewayInvokeGetBookings"
  action        = "lambda:InvokeFunction"
  function_name = aws_lambda_function.get_bookings.function_name
  principal     = "apigateway.amazonaws.com"
  source_arn    = "${aws_api_gateway_rest_api.dalscooter_api.execution_arn}/*/*"
}