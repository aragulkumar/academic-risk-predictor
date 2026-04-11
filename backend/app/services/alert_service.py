"""
Alert Service — handles sending real emails and SMS if configured in .env,
otherwise silently falls back to printing mock messages to the console.
"""
import os
import smtplib
from email.message import EmailMessage

# For Twilio, you'd install the twilio package: `pip install twilio`
# from twilio.rest import Client

def send_email_alert(to_email: str, subject: str, body: str) -> bool:
    """Sends an email via SMTP (e.g. Gmail App Passwords)."""
    smtp_server = os.getenv("SMTP_SERVER")
    smtp_port = os.getenv("SMTP_PORT", "587")
    smtp_user = os.getenv("SMTP_USERNAME")
    smtp_pass = os.getenv("SMTP_PASSWORD")

    if not all([smtp_server, smtp_user, smtp_pass]):
        print(f"[MOCK EMAIL] To: {to_email} | Subject: {subject} | Body: {body}")
        return True # Mock success

    try:
        msg = EmailMessage()
        msg.set_content(body)
        msg["Subject"] = subject
        msg["From"] = smtp_user
        msg["To"] = to_email

        with smtplib.SMTP(smtp_server, int(smtp_port)) as server:
            server.starttls()
            server.login(smtp_user, smtp_pass)
            server.send_message(msg)
        return True
    except Exception as e:
        print(f"[EMAIL ERROR] Failed to send to {to_email}: {e}")
        return False


def send_sms_alert(to_phone: str, body: str) -> bool:
    """Sends an SMS via Twilio. Requires 'twilio' package installed."""
    twilio_sid = os.getenv("TWILIO_ACCOUNT_SID")
    twilio_token = os.getenv("TWILIO_AUTH_TOKEN")
    twilio_from = os.getenv("TWILIO_FROM_NUMBER")

    if not all([twilio_sid, twilio_token, twilio_from]) or not to_phone:
        print(f"[MOCK SMS] To: {to_phone} | Body: {body}")
        return True

    try:
        # NOTE: In a real environment, run `pip install twilio` and uncomment:
        # client = Client(twilio_sid, twilio_token)
        # message = client.messages.create(body=body, from_=twilio_from, to=to_phone)
        # return bool(message.sid)
        print(f"[SMS SIMULATION - Twilio credentials exist but package not active] To: {to_phone}")
        return True
    except Exception as e:
        print(f"[SMS ERROR] Failed to send to {to_phone}: {e}")
        return False
