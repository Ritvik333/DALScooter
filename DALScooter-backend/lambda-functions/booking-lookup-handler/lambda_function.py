import json
import boto3
import os
from botocore.exceptions import ClientError

def lambda_handler(event, context):
    """
    Lex V2 Lambda function to handle booking lookups
    """
    try:
        # Extract session and slots
        session_id = event.get("sessionId")
        session_state = event.get("sessionState", {})
        intent = session_state.get("intent", {})
        slots = intent.get("slots", {})

        booking_ref = get_slot_value(slots.get("bookingID"))

        # Prompt user for booking reference if not provided
        if not booking_ref:
            return elicit_slot_response(event, "bookingID", "Please provide your booking reference code.")

        # Query DynamoDB
        dynamodb = boto3.resource('dynamodb')
        table = dynamodb.Table('DALScooterBookings')

        response = table.get_item(
            Key={'bookingID': booking_ref}
        )

        if 'Item' in response:
            booking = response['Item']
            message_content = f"""
            Booking Reference: {booking['bookingID']}
            Vehicle ID: {booking.get('vehicleID', 'N/A')}
            Start Time: {booking.get('startTime', 'N/A')}
            End Time: {booking.get('endTime', 'N/A')}
            Duration: {booking.get('duration', 'N/A')} minutes
            Status: {booking.get('status', 'N/A')}
            """

            return close_response(event, "Fulfilled", message_content.strip())
        else:
            return close_response(
                event,
                "Failed",
                f"Sorry, I could not find a booking with reference code {booking_ref}. Please check and try again."
            )

    except Exception as e:
        print(f"Error: {e}")
        return close_response(
            event,
            "Failed",
            "Sorry, I encountered an error while looking up your booking. Please try again later."
        )


# --- Lex V2 Helper Functions ---

def get_slot_value(slot):
    """
    Extract the interpreted value from a Lex V2 slot
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
