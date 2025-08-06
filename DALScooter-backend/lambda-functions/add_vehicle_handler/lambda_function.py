import json
import boto3
import uuid
import os
from decimal import Decimal

# Initialize AWS clients
dynamodb = boto3.resource('dynamodb')
vehicle_table = dynamodb.Table(os.environ['VEHICLE_TABLE'])
user_table = dynamodb.Table(os.environ['USER_TABLE'])  # Assuming USER_TABLE env variable for dalusers

def lambda_handler(event, context):
    try:
        # Get email of the authenticated user (operator)
        operator_email = event['requestContext']['authorizer']['claims']['email']

        # Fetch franchise name from dalusers table using operator email
        user_response = user_table.get_item(Key={'userID': operator_email})
        franchise_name = user_response.get('Item', {}).get('name', 'Unknown Franchise')

        # Parse body with Decimal for float fields
        data = json.loads(event['body'], parse_float=Decimal)

        vehicle_id = str(uuid.uuid4())

        item = {
            "vehicleID": vehicle_id,
            "operatorID": operator_email,
            "franchiseName": franchise_name,  # Add franchise name to item
            "type": data.get("type"),
            "accessCode": data.get("accessCode"),
            "batteryLife": data.get("batteryLife"),
            "heightAdjustable": data.get("heightAdjustable"),
            "hourlyRate": data.get("hourlyRate"),
            "discountCode": data.get("discountCode"),
        }

        vehicle_table.put_item(Item=item)

        return {
            "statusCode": 200,
            "headers": {
                "Access-Control-Allow-Origin": "*",
                "Access-Control-Allow-Credentials": True
            },
            "body": json.dumps({
                "message": "Vehicle added successfully",
                "vehicleID": vehicle_id,
                "operatorID": operator_email,
                "franchiseName": franchise_name  # Include in response
            })
        }

    except Exception as e:
        return {
            "statusCode": 500,
            "headers": {
                "Access-Control-Allow-Origin": "*",
                "Access-Control-Allow-Credentials": True
            },
            "body": json.dumps({"error": str(e)})
        }