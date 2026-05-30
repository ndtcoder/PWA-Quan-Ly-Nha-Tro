import logging
from typing import Optional

from app.config import settings
from app.database import get_supabase

logger = logging.getLogger(__name__)


def send_email(to: str, subject: str, html: str) -> bool:
    """Send email using Resend SDK. Returns True on success."""
    if not settings.RESEND_API_KEY:
        logger.warning("RESEND_API_KEY not configured, skipping email send")
        return False

    try:
        import resend

        resend.api_key = settings.RESEND_API_KEY
        resend.Emails.send(
            {
                "from": "NhaTro <noreply@nhatro.app>",
                "to": [to],
                "subject": subject,
                "html": html,
            }
        )
        logger.info(f"Email sent to {to}: {subject}")
        return True
    except Exception as e:
        logger.error(f"Failed to send email to {to}: {e}")
        return False


async def send_email_for_notification(
    recipient_id: str,
    notification_type: str,
    title: str,
    body: str,
    data: Optional[dict] = None,
):
    """Look up recipient email and send appropriate template."""
    if not settings.RESEND_API_KEY:
        return

    try:
        supabase = get_supabase()
        response = (
            supabase.table("profiles")
            .select("email")
            .eq("id", recipient_id)
            .limit(1)
            .execute()
        )
        if not response.data:
            logger.warning(f"No profile found for recipient {recipient_id}")
            return

        email = response.data[0]["email"]
        html = render_template(notification_type, title, body, data or {})
        send_email(to=email, subject=title, html=html)
    except Exception as e:
        logger.error(f"Failed to send email notification: {e}")


def render_template(
    notification_type: str, title: str, body: str, data: dict
) -> str:
    """Render HTML email template based on notification type."""
    templates = {
        "invoice_sent": render_invoice_email,
        "payment_reminder": render_reminder_email,
        "payment_overdue": render_overdue_email,
        "contract_expiring": render_contract_expiring_email,
        "maintenance_update": render_maintenance_email,
        "task_assigned": render_task_assigned_email,
    }

    renderer = templates.get(notification_type, render_generic_email)
    return renderer(title, body, data)


def _base_template(content: str) -> str:
    """Base HTML email template wrapper."""
    return f"""<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <style>
        body {{ font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px; }}
        .header {{ background: #2563eb; color: white; padding: 20px; border-radius: 8px 8px 0 0; }}
        .content {{ background: #f9fafb; padding: 20px; border: 1px solid #e5e7eb; border-top: none; border-radius: 0 0 8px 8px; }}
        .button {{ display: inline-block; background: #2563eb; color: white; padding: 10px 20px; border-radius: 6px; text-decoration: none; margin-top: 15px; }}
        .footer {{ margin-top: 20px; font-size: 12px; color: #6b7280; text-align: center; }}
    </style>
</head>
<body>
    {content}
    <div class="footer">
        <p>NhaTro - Rental Management System</p>
    </div>
</body>
</html>"""


def render_invoice_email(title: str, body: str, data: dict) -> str:
    amount = data.get("amount", "")
    due_date = data.get("due_date", "")
    content = f"""
    <div class="header"><h2>{title}</h2></div>
    <div class="content">
        <p>{body}</p>
        {"<p><strong>Amount:</strong> " + str(amount) + "</p>" if amount else ""}
        {"<p><strong>Due Date:</strong> " + str(due_date) + "</p>" if due_date else ""}
        <a href="#" class="button">View Invoice</a>
    </div>"""
    return _base_template(content)


def render_reminder_email(title: str, body: str, data: dict) -> str:
    amount = data.get("amount", "")
    due_date = data.get("due_date", "")
    content = f"""
    <div class="header" style="background: #f59e0b;"><h2>{title}</h2></div>
    <div class="content">
        <p>{body}</p>
        {"<p><strong>Amount Due:</strong> " + str(amount) + "</p>" if amount else ""}
        {"<p><strong>Due Date:</strong> " + str(due_date) + "</p>" if due_date else ""}
        <a href="#" class="button" style="background: #f59e0b;">Pay Now</a>
    </div>"""
    return _base_template(content)


def render_overdue_email(title: str, body: str, data: dict) -> str:
    amount = data.get("amount", "")
    days_overdue = data.get("days_overdue", "")
    content = f"""
    <div class="header" style="background: #dc2626;"><h2>{title}</h2></div>
    <div class="content">
        <p>{body}</p>
        {"<p><strong>Amount Overdue:</strong> " + str(amount) + "</p>" if amount else ""}
        {"<p><strong>Days Overdue:</strong> " + str(days_overdue) + "</p>" if days_overdue else ""}
        <a href="#" class="button" style="background: #dc2626;">Pay Now</a>
    </div>"""
    return _base_template(content)


def render_contract_expiring_email(title: str, body: str, data: dict) -> str:
    expiry_date = data.get("expiry_date", "")
    content = f"""
    <div class="header" style="background: #7c3aed;"><h2>{title}</h2></div>
    <div class="content">
        <p>{body}</p>
        {"<p><strong>Expiry Date:</strong> " + str(expiry_date) + "</p>" if expiry_date else ""}
        <a href="#" class="button" style="background: #7c3aed;">View Contract</a>
    </div>"""
    return _base_template(content)


def render_maintenance_email(title: str, body: str, data: dict) -> str:
    status = data.get("status", "")
    content = f"""
    <div class="header" style="background: #059669;"><h2>{title}</h2></div>
    <div class="content">
        <p>{body}</p>
        {"<p><strong>Status:</strong> " + str(status) + "</p>" if status else ""}
        <a href="#" class="button" style="background: #059669;">View Request</a>
    </div>"""
    return _base_template(content)


def render_task_assigned_email(title: str, body: str, data: dict) -> str:
    due_date = data.get("due_date", "")
    priority = data.get("priority", "")
    content = f"""
    <div class="header"><h2>{title}</h2></div>
    <div class="content">
        <p>{body}</p>
        {"<p><strong>Due Date:</strong> " + str(due_date) + "</p>" if due_date else ""}
        {"<p><strong>Priority:</strong> " + str(priority) + "</p>" if priority else ""}
        <a href="#" class="button">View Task</a>
    </div>"""
    return _base_template(content)


def render_generic_email(title: str, body: str, data: dict) -> str:
    content = f"""
    <div class="header"><h2>{title}</h2></div>
    <div class="content">
        <p>{body}</p>
    </div>"""
    return _base_template(content)
