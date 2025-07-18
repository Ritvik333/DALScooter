import json
import boto3
import uuid
import os
from decimal import Decimal

dynamodb = boto3.resource('dynamodb')
table = dynamodb.Table(os.environ['VEHICLE_TABLE'])

def lambda_handler(event, context):
    try:
        # Get email of the authenticated user (operator)
        operator_email = event['requestContext']['authorizer']['claims']['email']

        # Parse body with Decimal for float fields
        data = json.loads(event['body'], parse_float=Decimal)

        vehicle_id = str(uuid.uuid4())

        item = {
            "vehicleID": vehicle_id,
            "operatorID": operator_email,
            "type": data.get("type"),
            "accessCode": data.get("accessCode"),
            "batteryLife": data.get("batteryLife"),
            "heightAdjustable": data.get("heightAdjustable"),
            "hourlyRate": data.get("hourlyRate"),
            "discountCode": data.get("discountCode"),
        }

        table.put_item(Item=item)

        return {
            "statusCode": 200,
            "headers": {
                "Access-Control-Allow-Origin": "*",
                "Access-Control-Allow-Credentials": True
            },
            "body": json.dumps({
                "message": "Vehicle added successfully",
                "vehicleID": vehicle_id,
                "operatorID": operator_email
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
