import json
from google.oauth2 import service_account
from googleapiclient.discovery import build

# Load credentials
credentials = service_account.Credentials.from_service_account_file(
    'path-to-your-service-account-key.json'  # Replace with actual path
)
sheets_service = build('sheets', 'v4', credentials=credentials)

def handler(event, context):
    try:
        spreadsheet_id = 'YOUR_SPREADSHEET_ID'  # Replace with your Google Sheets ID
        ranges = ['UsersData!A:D', 'LoginEventsData!A:C']

        # Fetch data
        sheets_data = sheets_service.spreadsheets().values().batchGet(
            spreadsheetId=spreadsheet_id,
            ranges=ranges
        ).execute()

        users_data = sheets_data['valueRanges'][0]['values']
        login_events_data = sheets_data['valueRanges'][1]['values']

        # Calculate stats
        total_users = len(users_data) - 1 if users_data else 0  # Subtract header row
        login_count = sum(1 for row in login_events_data[1:] if row and 'loginTime' in row) if login_events_data else 0

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