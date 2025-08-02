data "archive_file" "export_to_sheets_zip" {
  type        = "zip"
  source_dir  = "${path.module}/../lambda-functions/export_to_sheets"
  output_path = "${path.module}/export_to_sheets.zip"
}

resource "aws_lambda_function" "export_to_sheets" {
  function_name = "DALScooterExportToSheets"
  filename      = data.archive_file.export_to_sheets_zip.output_path
  source_code_hash = data.archive_file.export_to_sheets_zip.output_base64sha256
  role          = "arn:aws:iam::959817979665:role/LabRole"
  handler       = "lambda_function.handler"
  runtime       = "python3.9"
  timeout       = 30
  memory_size   = 128

  tags = {
    Name        = "DALScooterExportToSheets"
    Environment = "dev"
    Module      = "DataVisualization"
  }
}

resource "aws_lambda_permission" "allow_invoke_export_to_sheets" {
  statement_id  = "AllowInvocationExportToSheets"
  action        = "lambda:InvokeFunction"
  function_name = aws_lambda_function.export_to_sheets.function_name
  principal     = "apigateway.amazonaws.com"  # Optional, if triggered via API
  source_arn    = "${aws_api_gateway_rest_api.dalscooter_api.execution_arn}/*/*"
}