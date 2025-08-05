import json

def lambda_handler(event, context):
    """
    Lex V2-compatible Lambda function to handle navigation help queries
    """

    try:
        # Extract help topic from Lex V2 input
        help_topic = (
            event.get("sessionState", {})
            .get("intent", {})
            .get("slots", {})
            .get("helpTopic", {})
            .get("value", {})
            .get("interpretedValue", "")
            .lower()
        )

        help_responses = {
            'register': """
            To register for DALScooter:
            1. Click the "Register" button on the homepage
            2. Enter your email address and create a password
            3. Verify your email address
            4. Add your payment method
            5. Complete your profile with personal information

            You'll need a valid driver's license and credit card to complete registration.
            """,
            'booking': """
            To book a scooter:
            1. Log in to your account
            2. Use the map to find available scooters near you
            3. Click on a scooter to see details
            4. Click "Book Now" to reserve the scooter
            5. You'll receive a booking code to unlock the scooter
            6. Use the code on the scooter's keypad to start your ride

            Bookings are valid for 15 minutes before they expire.
            """,
            'unlocking': """
            To unlock a scooter:
            1. Go to your booked scooter location
            2. Enter your booking code on the scooter's keypad
            3. The scooter will unlock and you can start riding
            4. Your ride timer starts when you unlock the scooter

            Make sure you're at the correct scooter location before entering the code.
            """,
            'payment': """
            Payment information:
            - Rides are charged per minute
            - Payment is processed automatically after your ride
            - You can add multiple payment methods to your account
            - View your ride history and charges in your account dashboard

            Contact support if you have billing questions.
            """,
            'safety': """
            Safety guidelines:
            1. Always wear a helmet (provided with the scooter)
            2. Follow local traffic laws
            3. Ride in designated bike lanes when available
            4. Don't ride on sidewalks
            5. Be aware of your surroundings
            6. Don't exceed speed limits

            Your safety is our priority!
            """,
            'support': """
            Need help? Here are your options:
            1. Chat with me for quick questions
            2. Check your booking status with your reference code
            3. Report issues through the support system
            4. Contact franchise operators for urgent matters

            I'm here to help with most common questions!
            """
        }

        if help_topic in help_responses:
            message = help_responses[help_topic].strip()
        else:
            message = (
                "I can help you with:\n"
                "- Registration process\n"
                "- Booking scooters\n"
                "- Unlocking scooters\n"
                "- Payment information\n"
                "- Safety guidelines\n"
                "- Getting support\n\n"
                "What would you like to know about?"
            )

        return {
    "sessionState": {
        "dialogAction": {
            "type": "ElicitIntent"
        }
    },
    "messages": [
        {
            "contentType": "PlainText",
            "content": message + "\n\nWould you like help with anything else?"
        }
    ]
}

    except Exception as e:
        return {
            "sessionState": {
                "dialogAction": {
                    "type": "Close"
                },
                "intent": {
                    "name": event.get("sessionState", {}).get("intent", {}).get("name", "UnknownIntent"),
                    "state": "Failed"
                }
            },
            "messages": [
                {
                    "contentType": "PlainText",
                    "content": "Sorry, something went wrong while processing your request."
                }
            ]
        }
