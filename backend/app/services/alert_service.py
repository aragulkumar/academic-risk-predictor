"""
Alert Service — handles sending real emails and SMS if configured in .env,
otherwise silently falls back to printing mock messages to the console.
"""
import os

try:
    from sendgrid import SendGridAPIClient
    from sendgrid.helpers.mail import Mail
except ImportError:
    pass

try:
    from twilio.rest import Client
except ImportError:
    pass

def send_email_alert(to_email: str, subject: str, body: str) -> bool:
    """Sends an email using the official SendGrid API."""
    api_key = os.getenv("SENDGRID_API_KEY")
    from_email = os.getenv("ALERT_FROM_EMAIL")

    if not api_key or not from_email:
        print(f"[MOCK EMAIL] To: {to_email} | Subject: {subject} | Body: {body}")
        return True 

    try:
        message = Mail(
            from_email=from_email,
            to_emails=to_email,
            subject=subject,
            html_content=body.replace('\n', '<br>')
        )
        sg = SendGridAPIClient(api_key)
        sg.send(message)
        return True
    except Exception as e:
        print(f"[EMAIL ERROR] Failed to send to {to_email}: {e}")
        return False


def send_sms_alert(to_phone: str, body: str) -> bool:
    """Sends an SMS via Twilio."""
    twilio_sid = os.getenv("TWILIO_ACCOUNT_SID")
    twilio_token = os.getenv("TWILIO_AUTH_TOKEN")
    twilio_from = os.getenv("TWILIO_PHONE_NUMBER")

    if not all([twilio_sid, twilio_token, twilio_from]) or not to_phone:
        print(f"[MOCK SMS] To: {to_phone} | Body: {body}")
        return True

    try:
        client = Client(twilio_sid, twilio_token)
        message = client.messages.create(body=body, from_=twilio_from, to=to_phone)
        return bool(message.sid)
    except Exception as e:
        print(f"[SMS ERROR] Failed to send to {to_phone}: {e}")
        return False
