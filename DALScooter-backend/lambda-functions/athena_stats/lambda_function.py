import json
import boto3
import os
from boto3.dynamodb.conditions import Key

athena = boto3.client('athena')

def handler(event, context):
    try:
        params = {
            'QueryString': '''
                SELECT COUNT(*) as total_users
                FROM "Users"
                WHERE dt = CURRENT_DATE
                UNION ALL
                SELECT COUNT(*) as login_count
                FROM "LoginEvents"
                WHERE dt = CURRENT_DATE AND timestamp >= DATE_ADD('day', -30, CURRENT_DATE)
            ''',
            'ResultConfiguration': {
                'OutputLocation': 's3://dalscooter-bucket-959817979665/athena-results/',
            },
            'QueryExecutionContext': {
                'Database': 'dalscooter_db',
            },
        }

        execution = athena.start_query_execution(**params)
        query_id = execution['QueryExecutionId']

        while True:
            result = athena.get_query_results(QueryExecutionId=query_id)
            if result['QueryExecution']['Status']['State'] in ['SUCCEEDED', 'FAILED', 'CANCELLED']:
                break

        if result['QueryExecution']['Status']['State'] == 'FAILED':
            raise Exception("Athena query failed")

        stats = result['ResultSet']['Rows'][1]['Data']  # Skip header row
        total_users = int(stats[0]['VarCharValue'])
        login_count = int(stats[1]['VarCharValue']) if len(stats) > 1 else 0

        return {
            'statusCode': 200,
            'headers': {
                'Access-Control-Allow-Origin': '*',
                'Access-Control-Allow-Methods': 'GET,OPTIONS',
                'Access-Control-Allow-Headers': 'Content-Type,Authorization'
            },
            'body': json.dumps({
                'totalUsers': total_users,
                'loginCount': login_count,
                'lastUpdated': str(boto3.client('rds').get_time()['Timestamp'])
            })
        }
    except Exception as e:
        return {
            'statusCode': 500,
            'headers': {
                'Access-Control-Allow-Origin': '*',
                'Access-Control-Allow-Methods': 'GET,OPTIONS',
                'Access-Control-Allow-Headers': 'Content-Type,Authorization'
            },
            'body': json.dumps({'error': str(e)})
        }