from datetime import date, timedelta
from typing import Optional

from app.database import get_supabase


def calculate_next_occurrences(template: dict, count: int = 5) -> list[str]:
    """Calculate the next N occurrence dates for a template."""
    recurrence_type = template.get("recurrence_type", "once")
    start_date_str = template.get("recurrence_start_date")
    end_date_str = template.get("recurrence_end_date")

    if recurrence_type == "once":
        if start_date_str:
            return [start_date_str]
        return []

    if not start_date_str:
        return []

    try:
        start_date = date.fromisoformat(start_date_str)
    except (ValueError, TypeError):
        return []

    end_date = None
    if end_date_str:
        try:
            end_date = date.fromisoformat(end_date_str)
        except (ValueError, TypeError):
            pass

    today = date.today()
    current = max(start_date, today)
    occurrences: list[str] = []

    # Generate up to count occurrences, checking up to 400 days ahead
    max_iterations = 400
    iteration = 0

    while len(occurrences) < count and iteration < max_iterations:
        if end_date and current > end_date:
            break

        should_include = False

        if recurrence_type == "daily":
            should_include = True
        elif recurrence_type == "weekly":
            day_of_week = template.get("recurrence_day_of_week", 0)
            should_include = current.weekday() == day_of_week
        elif recurrence_type == "monthly":
            day_of_month = template.get("recurrence_day_of_month", 1)
            should_include = current.day == day_of_month
        elif recurrence_type == "quarterly":
            day_of_month = template.get("recurrence_day_of_month", 1)
            month_of_quarter = template.get("recurrence_month_of_quarter", 1)
            # Quarters: Q1(1,2,3), Q2(4,5,6), Q3(7,8,9), Q4(10,11,12)
            current_month_in_quarter = ((current.month - 1) % 3) + 1
            should_include = (
                current.day == day_of_month
                and current_month_in_quarter == month_of_quarter
            )

        if should_include:
            occurrences.append(current.isoformat())

        current += timedelta(days=1)
        iteration += 1

    return occurrences


def spawn_recurring_tasks(today: Optional[date] = None):
    """Generate tasks from active templates for the given date."""
    if today is None:
        today = date.today()

    supabase = get_supabase()

    # Get all active templates with recurrence_type != 'once'
    response = (
        supabase.table("task_templates")
        .select("*")
        .eq("is_active", True)
        .neq("recurrence_type", "once")
        .execute()
    )

    templates = response.data or []
    tasks_created = 0

    for template in templates:
        # Check if recurrence_end_date has passed
        end_date_str = template.get("recurrence_end_date")
        if end_date_str:
            try:
                end_date = date.fromisoformat(end_date_str)
                if today > end_date:
                    # Deactivate expired template
                    supabase.table("task_templates").update(
                        {"is_active": False}
                    ).eq("id", template["id"]).execute()
                    continue
            except (ValueError, TypeError):
                pass

        # Check start date
        start_date_str = template.get("recurrence_start_date")
        if start_date_str:
            try:
                start_date = date.fromisoformat(start_date_str)
                if today < start_date:
                    continue
            except (ValueError, TypeError):
                pass

        # Determine if we should spawn a task today
        recurrence_type = template.get("recurrence_type")
        should_spawn = False

        if recurrence_type == "daily":
            should_spawn = True
        elif recurrence_type == "weekly":
            day_of_week = template.get("recurrence_day_of_week", 0)
            should_spawn = today.weekday() == day_of_week
        elif recurrence_type == "monthly":
            day_of_month = template.get("recurrence_day_of_month", 1)
            should_spawn = today.day == day_of_month
        elif recurrence_type == "quarterly":
            day_of_month = template.get("recurrence_day_of_month", 1)
            month_of_quarter = template.get("recurrence_month_of_quarter", 1)
            current_month_in_quarter = ((today.month - 1) % 3) + 1
            should_spawn = (
                today.day == day_of_month
                and current_month_in_quarter == month_of_quarter
            )

        if not should_spawn:
            continue

        # Check if task already exists for this template + today
        existing_response = (
            supabase.table("tasks")
            .select("id")
            .eq("template_id", template["id"])
            .eq("due_date", today.isoformat())
            .limit(1)
            .execute()
        )

        if existing_response.data:
            continue

        # Create task from template
        task_data = {
            "title": template["title"],
            "description": template.get("description"),
            "task_type": template.get("task_type"),
            "property_id": template.get("property_id"),
            "unit_id": template.get("unit_id"),
            "assigned_to": template.get("assigned_to"),
            "assigned_by": template.get("created_by"),
            "priority": template.get("priority", "normal"),
            "status": "pending",
            "due_date": today.isoformat(),
            "template_id": template["id"],
            "organization_id": template["organization_id"],
        }

        supabase.table("tasks").insert(task_data).execute()
        tasks_created += 1

    return {"tasks_created": tasks_created, "date": today.isoformat()}
