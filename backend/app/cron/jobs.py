import asyncio
import logging
from datetime import date, timedelta

from app.database import get_supabase

logger = logging.getLogger(__name__)


async def job_spawn_recurring_tasks():
    """Spawn recurring tasks for today from active templates."""
    try:
        from app.services.task_scheduler import spawn_recurring_tasks

        result = spawn_recurring_tasks(date.today())
        logger.info(f"Spawned recurring tasks: {result}")
    except Exception as e:
        logger.error(f"Error in job_spawn_recurring_tasks: {e}")


async def job_auto_generate_invoices():
    """Auto-generate invoices for all organizations on the 1st of month."""
    try:
        supabase = get_supabase()
        # Get all organizations
        response = supabase.table("organizations").select("id").execute()
        orgs = response.data or []

        for org in orgs:
            try:
                from app.services.invoice_service import auto_generate_invoices

                auto_generate_invoices(org["id"])
                logger.info(f"Auto-generated invoices for org {org['id']}")
            except Exception as e:
                logger.error(
                    f"Error generating invoices for org {org['id']}: {e}"
                )
    except Exception as e:
        logger.error(f"Error in job_auto_generate_invoices: {e}")


async def job_send_monthly_invoices():
    """Send draft invoices from this month: change to 'sent' and notify renters."""
    try:
        supabase = get_supabase()
        today = date.today()
        month_start = today.replace(day=1).isoformat()

        # Find draft invoices created this month
        response = (
            supabase.table("invoices")
            .select("*, contracts(renter_id)")
            .eq("status", "draft")
            .gte("created_at", month_start)
            .execute()
        )
        invoices = response.data or []

        for invoice in invoices:
            try:
                # Update status to sent
                supabase.table("invoices").update(
                    {"status": "sent"}
                ).eq("id", invoice["id"]).execute()

                # Notify renter
                renter_id = None
                if invoice.get("contracts") and invoice["contracts"].get("renter_id"):
                    renter_id = invoice["contracts"]["renter_id"]

                if renter_id:
                    from app.services.notification_service import send_notification

                    await send_notification(
                        recipient_id=renter_id,
                        notification_type="invoice_sent",
                        title="New Invoice",
                        body=f"You have a new invoice for {invoice.get('billing_month', 'this month')}",
                        data={
                            "invoice_id": invoice["id"],
                            "amount": str(invoice.get("total_amount", "")),
                            "link": f"/invoices/{invoice['id']}",
                        },
                        channels=["in_app", "email", "push"],
                        org_id=invoice.get("organization_id"),
                    )
            except Exception as e:
                logger.error(f"Error sending invoice {invoice['id']}: {e}")

        logger.info(f"Sent {len(invoices)} monthly invoices")
    except Exception as e:
        logger.error(f"Error in job_send_monthly_invoices: {e}")


async def job_payment_reminder():
    """Send payment reminders for invoices due in 3 days."""
    try:
        supabase = get_supabase()
        reminder_date = (date.today() + timedelta(days=3)).isoformat()

        response = (
            supabase.table("invoices")
            .select("*, contracts(renter_id)")
            .eq("status", "sent")
            .eq("due_date", reminder_date)
            .execute()
        )
        invoices = response.data or []

        for invoice in invoices:
            try:
                renter_id = None
                if invoice.get("contracts") and invoice["contracts"].get("renter_id"):
                    renter_id = invoice["contracts"]["renter_id"]

                if renter_id:
                    from app.services.notification_service import send_notification

                    await send_notification(
                        recipient_id=renter_id,
                        notification_type="payment_reminder",
                        title="Payment Reminder",
                        body=f"Your invoice is due in 3 days ({reminder_date})",
                        data={
                            "invoice_id": invoice["id"],
                            "amount": str(invoice.get("total_amount", "")),
                            "due_date": reminder_date,
                            "link": f"/invoices/{invoice['id']}",
                        },
                        channels=["in_app", "email", "push"],
                        org_id=invoice.get("organization_id"),
                    )
            except Exception as e:
                logger.error(f"Error sending reminder for invoice {invoice['id']}: {e}")

        logger.info(f"Sent {len(invoices)} payment reminders")
    except Exception as e:
        logger.error(f"Error in job_payment_reminder: {e}")


async def job_overdue_check():
    """Check for overdue invoices (5 and 10 days past due) and notify."""
    try:
        supabase = get_supabase()
        today = date.today()
        overdue_5 = (today - timedelta(days=5)).isoformat()
        overdue_10 = (today - timedelta(days=10)).isoformat()

        for days, overdue_date in [(5, overdue_5), (10, overdue_10)]:
            response = (
                supabase.table("invoices")
                .select("*, contracts(renter_id)")
                .eq("status", "sent")
                .eq("due_date", overdue_date)
                .execute()
            )
            invoices = response.data or []

            for invoice in invoices:
                try:
                    renter_id = None
                    if invoice.get("contracts") and invoice["contracts"].get("renter_id"):
                        renter_id = invoice["contracts"]["renter_id"]

                    if renter_id:
                        from app.services.notification_service import send_notification

                        await send_notification(
                            recipient_id=renter_id,
                            notification_type="payment_overdue",
                            title="Payment Overdue",
                            body=f"Your invoice is {days} days overdue. Please pay immediately.",
                            data={
                                "invoice_id": invoice["id"],
                                "amount": str(invoice.get("total_amount", "")),
                                "days_overdue": str(days),
                                "link": f"/invoices/{invoice['id']}",
                            },
                            channels=["in_app", "email", "push"],
                            org_id=invoice.get("organization_id"),
                        )
                except Exception as e:
                    logger.error(
                        f"Error sending overdue notice for invoice {invoice['id']}: {e}"
                    )

        logger.info("Overdue check completed")
    except Exception as e:
        logger.error(f"Error in job_overdue_check: {e}")


async def job_contract_expiry_check():
    """Notify owners about contracts expiring in 30 days and 7 days."""
    try:
        supabase = get_supabase()
        today = date.today()
        expiry_30 = (today + timedelta(days=30)).isoformat()
        expiry_7 = (today + timedelta(days=7)).isoformat()

        for days, expiry_date in [(30, expiry_30), (7, expiry_7)]:
            response = (
                supabase.table("contracts")
                .select("*, properties(owner_id, name)")
                .eq("status", "active")
                .eq("end_date", expiry_date)
                .execute()
            )
            contracts = response.data or []

            for contract in contracts:
                try:
                    owner_id = None
                    property_name = ""
                    if contract.get("properties"):
                        owner_id = contract["properties"].get("owner_id")
                        property_name = contract["properties"].get("name", "")

                    if owner_id:
                        from app.services.notification_service import send_notification

                        await send_notification(
                            recipient_id=owner_id,
                            notification_type="contract_expiring",
                            title="Contract Expiring Soon",
                            body=f"Contract at {property_name} expires in {days} days ({expiry_date})",
                            data={
                                "contract_id": contract["id"],
                                "expiry_date": expiry_date,
                                "link": f"/contracts/{contract['id']}",
                            },
                            channels=["in_app", "email"],
                            org_id=contract.get("organization_id"),
                        )
                except Exception as e:
                    logger.error(
                        f"Error sending expiry notice for contract {contract['id']}: {e}"
                    )

        logger.info("Contract expiry check completed")
    except Exception as e:
        logger.error(f"Error in job_contract_expiry_check: {e}")


async def job_expire_contracts():
    """Set status='expired' for contracts past end_date and update unit status to 'vacant'."""
    try:
        supabase = get_supabase()
        today = date.today().isoformat()

        # Find active contracts past their end date
        response = (
            supabase.table("contracts")
            .select("id, unit_id")
            .eq("status", "active")
            .lt("end_date", today)
            .execute()
        )
        contracts = response.data or []

        for contract in contracts:
            try:
                # Update contract status
                supabase.table("contracts").update(
                    {"status": "expired"}
                ).eq("id", contract["id"]).execute()

                # Update unit status to vacant
                if contract.get("unit_id"):
                    supabase.table("units").update(
                        {"status": "vacant"}
                    ).eq("id", contract["unit_id"]).execute()
            except Exception as e:
                logger.error(
                    f"Error expiring contract {contract['id']}: {e}"
                )

        logger.info(f"Expired {len(contracts)} contracts")
    except Exception as e:
        logger.error(f"Error in job_expire_contracts: {e}")
