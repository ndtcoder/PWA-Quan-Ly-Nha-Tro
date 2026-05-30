from apscheduler.schedulers.asyncio import AsyncIOScheduler
from apscheduler.triggers.cron import CronTrigger

scheduler = AsyncIOScheduler()


def setup_scheduler():
    """Configure and return the scheduler with all jobs."""
    from app.cron.jobs import (
        job_spawn_recurring_tasks,
        job_auto_generate_invoices,
        job_send_monthly_invoices,
        job_payment_reminder,
        job_overdue_check,
        job_contract_expiry_check,
        job_expire_contracts,
    )

    # Daily 5:00 AM - spawn recurring tasks
    scheduler.add_job(
        job_spawn_recurring_tasks,
        CronTrigger(hour=5, minute=0),
        id="spawn_tasks",
        replace_existing=True,
    )
    # 1st of month 6:00 AM - auto generate invoices
    scheduler.add_job(
        job_auto_generate_invoices,
        CronTrigger(day=1, hour=6, minute=0),
        id="auto_invoices",
        replace_existing=True,
    )
    # 3rd of month 8:00 AM - send monthly invoices
    scheduler.add_job(
        job_send_monthly_invoices,
        CronTrigger(day=3, hour=8, minute=0),
        id="send_invoices",
        replace_existing=True,
    )
    # Daily 8:00 AM - payment reminders (3 days before due)
    scheduler.add_job(
        job_payment_reminder,
        CronTrigger(hour=8, minute=0),
        id="payment_reminder",
        replace_existing=True,
    )
    # Daily 9:00 AM - overdue check
    scheduler.add_job(
        job_overdue_check,
        CronTrigger(hour=9, minute=0),
        id="overdue_check",
        replace_existing=True,
    )
    # Daily 8:05 AM - contract expiry check (30 and 7 days)
    scheduler.add_job(
        job_contract_expiry_check,
        CronTrigger(hour=8, minute=5),
        id="contract_expiry",
        replace_existing=True,
    )
    # Daily midnight - expire contracts past end_date
    scheduler.add_job(
        job_expire_contracts,
        CronTrigger(hour=0, minute=0),
        id="expire_contracts",
        replace_existing=True,
    )

    return scheduler
