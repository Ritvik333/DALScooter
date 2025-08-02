import os
import json
import boto3
from decimal import Decimal
from botocore.exceptions import ClientError
from google.cloud import language_v1

# Initialize S3 and other clients
s3_client = boto3.client('s3')
dynamodb = boto3.resource('dynamodb')

# Download the JSON file from S3 to /tmp
bucket_name = 'dalscooter-vehicle-images-eab8dd1b0fadbd67'  # Replace with your bucket name
object_key = 'service-account-key.json'      # Replace with your object key
local_path = '/tmp/service-account-key.json'

s3_client.download_file(bucket_name, object_key, local_path)

# Helper function to convert Decimal to float/int for JSON serialization
def decimal_to_json_serializable(obj):
    if isinstance(obj, Decimal):
        if obj % 1 == 0:
            return int(obj)
        return float(obj)
    raise TypeError(f"Object of type {type(obj)} is not JSON serializable")

def analyze_sentiment(text):
    client = language_v1.LanguageServiceClient.from_service_account_json(local_path)
    document = language_v1.Document(content=text, type_=language_v1.Document.Type.PLAIN_TEXT)
    response = client.analyze_sentiment(request={"document": document})
    return response.document_sentiment.score, response.document_sentiment.magnitude

def handler(event, context):
    try:
        vehicles_table = dynamodb.Table('DALScooterVehicles')
        bookings_table = dynamodb.Table('DALScooterBookings')
        feedback_table = dynamodb.Table('DALScooter-FeedbackTable')

        vehicles_response = vehicles_table.scan()
        vehicles = vehicles_response.get('Items', [])

        bookings_response = bookings_table.scan()
        bookings = bookings_response.get('Items', [])
        print("Fetched bookings:", bookings)

        feedback_response = feedback_table.scan()
        feedbacks = feedback_response.get('Items', [])
        print("Fetched feedbacks:", feedbacks)

        booking_to_vehicle_map = {}
        for booking in bookings:
            booking_to_vehicle_map[booking.get('bookingID')] = booking.get('vehicleID')

        for vehicle in vehicles:
            vehicle_feedbacks = [
                {
                    'message': f['feedbackMessage'],
                    'timestamp': f['timestamp']
                } for f in feedbacks if f.get('bookingReferenceCode') in booking_to_vehicle_map and booking_to_vehicle_map[f.get('bookingReferenceCode')] == vehicle.get('vehicleID')
            ]
            total_score = 0.0
            total_magnitude = 0.0
            feedback_with_sentiment = []
            for feedback in vehicle_feedbacks:
                score, magnitude = analyze_sentiment(feedback['message'])
                feedback_with_sentiment.append({
                    'message': feedback['message'],
                    'timestamp': feedback['timestamp'],
                    'sentiment_score': score,
                    'sentiment_magnitude': magnitude
                })
                total_score += score
                total_magnitude += magnitude
            vehicle['feedbacks'] = feedback_with_sentiment
            vehicle['overall_sentiment'] = {
                'average_score': total_score / len(vehicle_feedbacks) if vehicle_feedbacks else 0.0,
                'total_magnitude': total_magnitude if vehicle_feedbacks else 0.0
            }

        body = json.dumps(vehicles, default=decimal_to_json_serializable)

        return {
            'statusCode': 200,
            'headers': {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*',
                'Access-Control-Allow-Methods': 'GET,OPTIONS',
                'Access-Control-Allow-Headers': 'Content-Type'
            },
            'body': body
        }

    except ClientError as e:
        return {
            'statusCode': 500,
            'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
            'body': json.dumps({'error': f"DynamoDB error: {str(e)}"})
        }
    except Exception as e:
        return {
            'statusCode': 500,
            'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
            'body': json.dumps({'error': f"Internal server error: {str(e)}"})
        }