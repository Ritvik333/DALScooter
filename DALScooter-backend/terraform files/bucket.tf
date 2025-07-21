resource "aws_s3_bucket" "vehicle_images" {
  bucket = "dalscooter-vehicle-images-${random_id.bucket_suffix.hex}"
  acl    = "private"

  versioning {
    enabled = true
  }

  tags = {
    Name        = "DALScooterVehicleImages"
    Environment = "prod"
  }
}

resource "random_id" "bucket_suffix" {
  byte_length = 8
}

resource "aws_s3_bucket_cors_configuration" "vehicle_images_cors" {
  bucket = aws_s3_bucket.vehicle_images.id

  cors_rule {
    allowed_headers = ["*"]
    allowed_methods = ["GET", "PUT", "POST"]
    allowed_origins = ["http://localhost:3000"]
    max_age_seconds = 3000
  }
}