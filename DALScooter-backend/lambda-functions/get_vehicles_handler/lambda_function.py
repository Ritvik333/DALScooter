import json
import boto3
import os
from boto3.dynamodb.conditions import Key

def handler(event, context):
    table_name = os.environ.get("TABLE_NAME")
    if not table_name:
        return {
            "statusCode": 500,
            "body": json.dumps({"error": "TABLE_NAME environment variable not set"})
        }

    dynamodb = boto3.resource('dynamodb')
    table = dynamodb.Table(table_name)

    try:
        response = table.scan()
        items = response.get("Items", [])
        return {
            "statusCode": 200,
            "headers": {
                # "Content-Type": "application/json",
                # "Access-Control-Allow-Origin": "*"
                'Access-Control-Allow-Origin': '*',  # Adjust for production
                'Access-Control-Allow-Methods': 'GET,OPTIONS',
                'Access-Control-Allow-Headers': 'Content-Type,Authorization'
            },
            "body": json.dumps(items)
        }
    except Exception as e:
        return {
            "statusCode": 500,
            "headers": {
                # "Access-Control-Allow-Origin": "*"
                'Access-Control-Allow-Origin': '*',
                'Access-Control-Allow-Methods': 'GET,OPTIONS',
                'Access-Control-Allow-Headers': 'Content-Type,Authorization'
            },
            "body": json.dumps({"error": str(e)})
        }
