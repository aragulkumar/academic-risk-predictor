"""
Alert Service — Twilio SMS + SendGrid Email stubs.
API keys will be wired via .env when provided.
Until then, all alerts log to console with full payload.
"""

from __future__ import annotations

import logging
from typing import TYPE_CHECKING

from app.core.config import settings

if TYPE_CHECKING:
    from sqlalchemy.ext.asyncio import AsyncSession
    from app.models.risk_score import RiskScore
    from app.models.student import Student

logger = logging.getLogger("alert_service")


async def maybe_send_alert(student: "Student", risk: "RiskScore", db: "AsyncSession") -> None:
    """Send SMS + email alert if risk score exceeds the configured threshold."""
    if risk.score < settings.RISK_ALERT_THRESHOLD:
        return

    # Fetch mentor contact info
    from sqlalchemy import select
    from app.models.user import User

    mentor = None
    if student.mentor_id:
        result = await db.execute(select(User).where(User.id == student.mentor_id))
        mentor = result.scalar_one_or_none()

    student_result = await db.execute(select(User).where(User.id == student.user_id))
    student_user = student_result.scalar_one_or_none()

    subject = f"⚠️ Risk Alert: {student_user.name if student_user else 'Student'} — Score {risk.score:.0f}/100"
    body = (
        f"Student: {student_user.name if student_user else 'N/A'} ({student.roll_number})\n"
        f"Risk Score: {risk.score:.1f}/100 [{risk.risk_level.upper()}]\n"
        f"Key Factors: {risk.top_factors}\n\n"
        f"Please log into the Academic Risk Predictor dashboard to take action."
    )

    await _send_email(
        to_email=mentor.email if mentor else settings.ALERT_FROM_EMAIL,
        subject=subject,
        body=body,
    )

    if mentor and mentor.phone:
        await _send_sms(to_phone=mentor.phone, message=f"{subject}\n{body[:120]}...")


async def _send_email(to_email: str, subject: str, body: str) -> None:
    if not settings.SENDGRID_API_KEY or settings.SENDGRID_API_KEY.startswith("SG.xxx"):
        logger.warning(
            "[ALERT STUB] Email alert would be sent.\n"
            f"  To:      {to_email}\n"
            f"  Subject: {subject}\n"
            f"  Body:\n{body}"
        )
        return

    try:
        from sendgrid import SendGridAPIClient
        from sendgrid.helpers.mail import Mail

        message = Mail(
            from_email=settings.ALERT_FROM_EMAIL,
            to_emails=to_email,
            subject=subject,
            plain_text_content=body,
        )
        sg = SendGridAPIClient(settings.SENDGRID_API_KEY)
        response = sg.send(message)
        logger.info(f"[SENDGRID] Email sent to {to_email} — status {response.status_code}")
    except Exception as e:
        logger.error(f"[SENDGRID] Failed to send email: {e}")


async def _send_sms(to_phone: str, message: str) -> None:
    if not settings.TWILIO_ACCOUNT_SID or settings.TWILIO_ACCOUNT_SID.startswith("ACxxx"):
        logger.warning(
            "[ALERT STUB] SMS alert would be sent.\n"
            f"  To:      {to_phone}\n"
            f"  Message: {message}"
        )
        return

    try:
        from twilio.rest import Client

        client = Client(settings.TWILIO_ACCOUNT_SID, settings.TWILIO_AUTH_TOKEN)
        msg = client.messages.create(
            body=message,
            from_=settings.TWILIO_PHONE_NUMBER,
            to=to_phone,
        )
        logger.info(f"[TWILIO] SMS sent to {to_phone} — SID {msg.sid}")
    except Exception as e:
        logger.error(f"[TWILIO] Failed to send SMS: {e}")
