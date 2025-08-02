import boto3
import json
from google.oauth2 import service_account
from googleapiclient.discovery import build

# Load credentials
credentials = service_account.Credentials.from_service_account_file(
    'DALScooter-backend\ServiceAccount\dal-scooter-c099556456d0.json'  # Replace with actual path
)
sheets_service = build('sheets', 'v4', credentials=credentials)

def handler(event, context):
    dynamodb = boto3.resource('dynamodb')
    users_table = dynamodb.Table('Users')
    login_events_table = dynamodb.Table('LoginEvents')

    # Fetch data
    users_response = users_table.scan()
    login_events_response = login_events_table.scan()

    # Prepare data for Sheets
    users_data = [list(user.values()) for user in users_response['Items']]
    login_events_data = [list(event.values()) for event in login_events_response['Items']]

    # Update Google Sheets
    spreadsheet_id = 'YOUR_SPREADSHEET_ID'  # Replace with your Google Sheets ID
    sheets_service.spreadsheets().values().update(
        spreadsheetId=spreadsheet_id,
        range='UsersData!A1',
        valueInputOption='RAW',
        body={'values': users_data}
    ).execute()
    sheets_service.spreadsheets().values().update(
        spreadsheetId=spreadsheet_id,
        range='LoginEventsData!A1',
        valueInputOption='RAW',
        body={'values': login_events_data}
    ).execute()

    return {
        'statusCode': 200,
        'body': json.dumps('Data exported to Google Sheets')
    }