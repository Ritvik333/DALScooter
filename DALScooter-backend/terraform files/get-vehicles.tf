resource "aws_lambda_function" "get_vehicles" {
  function_name = "DALScooterGetVehicles"
  handler       = "lambda_function.handler"
  runtime       = "python3.12"
  role          = "arn:aws:iam::101784748999:role/LabRole"
  filename      = "get_vehicles_handler.zip"
  timeout       = 10

  environment {
    variables = {
      TABLE_NAME = aws_dynamodb_table.dalscooter_vehicles.name
    }
  }
}

resource "aws_api_gateway_resource" "get_vehicles_resource" {
  rest_api_id = aws_api_gateway_rest_api.dalscooter_api.id
  parent_id   = aws_api_gateway_rest_api.dalscooter_api.root_resource_id
  path_part   = "get-vehicles"
}

resource "aws_api_gateway_method" "get_vehicles_method" {
  rest_api_id   = aws_api_gateway_rest_api.dalscooter_api.id
  resource_id   = aws_api_gateway_resource.get_vehicles_resource.id
  http_method   = "GET"
  authorization = "NONE"
}

resource "aws_api_gateway_integration" "get_vehicles_integration" {
  rest_api_id             = aws_api_gateway_rest_api.dalscooter_api.id
  resource_id             = aws_api_gateway_resource.get_vehicles_resource.id
  http_method             = aws_api_gateway_method.get_vehicles_method.http_method
  integration_http_method = "POST"
  type                    = "AWS_PROXY"
  uri                     = aws_lambda_function.get_vehicles.invoke_arn
}

resource "aws_api_gateway_method_response" "get_vehicles_response_200" {
  rest_api_id = aws_api_gateway_rest_api.dalscooter_api.id
  resource_id = aws_api_gateway_resource.get_vehicles_resource.id
  http_method = aws_api_gateway_method.get_vehicles_method.http_method
  status_code = "200"
  response_parameters = {
    "method.response.header.Access-Control-Allow-Origin"  = true
    "method.response.header.Access-Control-Allow-Methods" = true
    "method.response.header.Access-Control-Allow-Headers" = true
  }
}

resource "aws_api_gateway_integration_response" "get_vehicles_integration_response_200" {
  rest_api_id = aws_api_gateway_rest_api.dalscooter_api.id
  resource_id = aws_api_gateway_resource.get_vehicles_resource.id
  http_method = aws_api_gateway_method.get_vehicles_method.http_method
  status_code = aws_api_gateway_method_response.get_vehicles_response_200.status_code
  response_parameters = {
    "method.response.header.Access-Control-Allow-Origin"  = "'*'"  # or "'http://localhost:3000'"
    "method.response.header.Access-Control-Allow-Methods" = "'GET,OPTIONS'"
    "method.response.header.Access-Control-Allow-Headers" = "'Content-Type,Authorization,X-Amz-Date,X-Api-Key,X-Amz-Security-Token'"
  }
  depends_on = [aws_api_gateway_integration.get_vehicles_integration]
}

resource "aws_api_gateway_method" "get_vehicles_options_method" {
  rest_api_id   = aws_api_gateway_rest_api.dalscooter_api.id
  resource_id   = aws_api_gateway_resource.get_vehicles_resource.id
  http_method   = "OPTIONS"
  authorization = "NONE"
}

resource "aws_api_gateway_integration" "get_vehicles_options_integration" {
  rest_api_id = aws_api_gateway_rest_api.dalscooter_api.id
  resource_id = aws_api_gateway_resource.get_vehicles_resource.id
  http_method = aws_api_gateway_method.get_vehicles_options_method.http_method
  type        = "MOCK"
  request_templates = {
    "application/json" = "{\"statusCode\": 200}"
  }
}

resource "aws_api_gateway_method_response" "get_vehicles_options_response_200" {
  rest_api_id = aws_api_gateway_rest_api.dalscooter_api.id
  resource_id = aws_api_gateway_resource.get_vehicles_resource.id
  http_method = aws_api_gateway_method.get_vehicles_options_method.http_method
  status_code = "200"
  response_parameters = {
    "method.response.header.Access-Control-Allow-Origin"  = true
    "method.response.header.Access-Control-Allow-Methods" = true
    "method.response.header.Access-Control-Allow-Headers" = true
  }
}

resource "aws_api_gateway_integration_response" "get_vehicles_options_integration_response_200" {
  rest_api_id = aws_api_gateway_rest_api.dalscooter_api.id
  resource_id = aws_api_gateway_resource.get_vehicles_resource.id
  http_method = aws_api_gateway_method.get_vehicles_options_method.http_method
  status_code = aws_api_gateway_method_response.get_vehicles_options_response_200.status_code
  response_parameters = {
    "method.response.header.Access-Control-Allow-Origin"  = "'*'"  # or "'http://localhost:3000'"
    "method.response.header.Access-Control-Allow-Methods" = "'GET,OPTIONS'"
    "method.response.header.Access-Control-Allow-Headers" = "'Content-Type,Authorization,X-Amz-Date,X-Api-Key,X-Amz-Security-Token'"
  }
  depends_on = [aws_api_gateway_integration.get_vehicles_options_integration]
}

resource "aws_lambda_permission" "apigw_get_vehicles" {
  statement_id  = "AllowAPIGatewayInvokeGetVehicles"
  action        = "lambda:InvokeFunction"
  function_name = aws_lambda_function.get_vehicles.function_name
  principal     = "apigateway.amazonaws.com"
  source_arn    = "${aws_api_gateway_rest_api.dalscooter_api.execution_arn}/*/*"
}