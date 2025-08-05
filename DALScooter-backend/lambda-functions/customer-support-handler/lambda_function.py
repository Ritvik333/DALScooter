import json
import boto3
import os
from datetime import datetime
from botocore.exceptions import ClientError

def lambda_handler(event, context):
    """
    Lex V2 Lambda function to handle customer support concerns
    """

    try:
        # Extract session ID, bot details, and slots
        session_id = event.get("sessionId")
        session_state = event.get("sessionState", {})
        intent = session_state.get("intent", {})
        slots = intent.get("slots", {})

        # Extract slot values (handle Lex V2 slot structure)
        issue_type = get_slot_value(slots.get("issueType"))
        description = get_slot_value(slots.get("description"))
        user_id = session_id or "ANONYMOUS"

        # Check if we need to elicit missing slots
        if not issue_type:
            return elicit_slot_response(event, "issueType", "What type of issue are you experiencing? (e.g., technical problem, billing issue, safety concern)")
        
        if not description:
            return elicit_slot_response(event, "description", "Please describe your issue in detail.")

        # Store ticket in DynamoDB
        dynamodb = boto3.resource('dynamodb')
        support_table = dynamodb.Table('DALScooterSupportTickets')

        ticket_id = f"TICKET_{datetime.now().strftime('%Y%m%d_%H%M%S')}_{user_id}"

        support_ticket = {
            'ticketId': ticket_id,
            'userId': user_id,
            'issueType': issue_type,
            'description': description,
            'status': 'OPEN',
            'createdAt': datetime.now().isoformat(),
            'assignedTo': 'UNASSIGNED',
            'priority': 'MEDIUM'
        }

        support_table.put_item(Item=support_ticket)

        # Message to user
        message = f"""Thank you for contacting us! Your support ticket has been created.

Ticket ID: {ticket_id}
Issue Type: {issue_type}
Status: Open

A franchise operator will review your concern and get back to you within 24 hours."""

        return close_response(event, "Fulfilled", message.strip())

    except Exception as e:
        print(f"Error: {e}")
        return close_response(event, "Failed", "Sorry, I encountered an error while creating your support ticket. Please try again later or contact support directly.")


# --- Helpers ---

def get_slot_value(slot):
    """
    Extract the value from a Lex V2 slot
    """
    if slot and "value" in slot and "interpretedValue" in slot["value"]:
        return slot["value"]["interpretedValue"]
    return None

def elicit_slot_response(event, slot_to_elicit, message):
    """
    Build a Lex V2 elicit slot response
    """
    intent = event["sessionState"]["intent"]
    return {
        "sessionState": {
            "dialogAction": {
                "type": "ElicitSlot",
                "slotToElicit": slot_to_elicit
            },
            "intent": intent
        },
        "messages": [{
            "contentType": "PlainText",
            "content": message
        }]
    }

def close_response(event, fulfillment_state, message):
    """
    Build a Lex V2 close response
    """
    intent = event["sessionState"]["intent"]
    intent["state"] = fulfillment_state
    return {
        "sessionState": {
            "dialogAction": {
                "type": "Close"
            },
            "intent": intent
        },
        "messages": [{
            "contentType": "PlainText",
            "content": message
        }]
    }

def send_notification_to_operator(ticket):
    """
    Send notification to franchise operator (implement as needed)
    """
    # Use SNS, SES, etc. here
    pass
