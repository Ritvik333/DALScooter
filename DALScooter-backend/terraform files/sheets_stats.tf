data "archive_file" "sheets_stats_zip" {
  type        = "zip"
  source_dir  = "${path.module}/../lambda-functions/sheets_stats"
  output_path = "${path.module}/sheets_stats.zip"
}

resource "aws_lambda_function" "sheets_stats" {
  function_name = "DALScooterSheetsStats"
  filename      = data.archive_file.sheets_stats_zip.output_path
  source_code_hash = data.archive_file.sheets_stats_zip.output_base64sha256
  role          = "arn:aws:iam::959817979665:role/LabRole"
  handler       = "lambda_function.handler"
  runtime       = "python3.9"
  timeout       = 30
  memory_size   = 128

  tags = {
    Name        = "DALScooterSheetsStats"
    Environment = "dev"
    Module      = "DataVisualization"
  }
}

resource "aws_api_gateway_resource" "sheets_stats_resource" {
  rest_api_id = aws_api_gateway_rest_api.dalscooter_api.id
  parent_id   = aws_api_gateway_rest_api.dalscooter_api.root_resource_id
  path_part   = "sheets-stats"
}

resource "aws_api_gateway_method" "sheets_stats_method" {
  rest_api_id   = aws_api_gateway_rest_api.dalscooter_api.id
  resource_id   = aws_api_gateway_resource.sheets_stats_resource.id
  http_method   = "GET"
  authorization = "NONE"
}

resource "aws_api_gateway_integration" "sheets_stats_integration" {
  rest_api_id             = aws_api_gateway_rest_api.dalscooter_api.id
  resource_id             = aws_api_gateway_resource.sheets_stats_resource.id
  http_method             = aws_api_gateway_method.sheets_stats_method.http_method
  integration_http_method = "POST"
  type                    = "AWS_PROXY"
  uri                     = aws_lambda_function.sheets_stats.invoke_arn
}

# Add method response, integration response, and OPTIONS method as in previous tf files

resource "aws_lambda_permission" "allow_api_gateway_sheets_stats" {
  statement_id  = "AllowAPIGatewayInvokeSheetsStats"
  action        = "lambda:InvokeFunction"
  function_name = aws_lambda_function.sheets_stats.function_name
  principal     = "apigateway.amazonaws.com"
  source_arn    = "${aws_api_gateway_rest_api.dalscooter_api.execution_arn}/*/*"
}