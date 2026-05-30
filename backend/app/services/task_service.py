from typing import Optional
from datetime import date, datetime

from fastapi import HTTPException, status

from app.database import get_supabase
from app.models.task import TaskTemplateCreate, TaskTemplateUpdate, TaskUpdate
from app.services.task_scheduler import calculate_next_occurrences


def list_templates(
    org_id: str,
    property_id: Optional[str] = None,
    recurrence_type: Optional[str] = None,
    is_active: Optional[bool] = None,
) -> list:
    """List task templates for the organization."""
    supabase = get_supabase()

    query = (
        supabase.table("task_templates")
        .select("*")
        .eq("organization_id", org_id)
    )

    if property_id:
        query = query.eq("property_id", property_id)
    if recurrence_type:
        query = query.eq("recurrence_type", recurrence_type)
    if is_active is not None:
        query = query.eq("is_active", is_active)

    response = query.order("created_at", desc=True).execute()
    templates = response.data or []

    result = []
    for template in templates:
        enriched = _enrich_template(template, supabase)
        result.append(enriched)

    return result


def create_template(data: TaskTemplateCreate, org_id: str, user_id: str) -> dict:
    """Create a new task template and optionally a one-time task."""
    supabase = get_supabase()

    template_data = {
        "title": data.title,
        "description": data.description,
        "task_type": data.task_type,
        "property_id": data.property_id,
        "unit_id": data.unit_id,
        "assigned_to": data.assigned_to,
        "priority": data.priority,
        "recurrence_type": data.recurrence_type,
        "recurrence_day_of_week": data.recurrence_day_of_week,
        "recurrence_day_of_month": data.recurrence_day_of_month,
        "recurrence_month_of_quarter": data.recurrence_month_of_quarter,
        "recurrence_start_date": data.recurrence_start_date,
        "recurrence_end_date": data.recurrence_end_date,
        "organization_id": org_id,
        "created_by": user_id,
        "is_active": True,
    }

    response = supabase.table("task_templates").insert(template_data).execute()
    template = response.data[0]

    # If one-time, create the task immediately
    if data.recurrence_type == "once":
        task_data = {
            "title": data.title,
            "description": data.description,
            "task_type": data.task_type,
            "property_id": data.property_id,
            "unit_id": data.unit_id,
            "assigned_to": data.assigned_to,
            "assigned_by": user_id,
            "priority": data.priority,
            "status": "pending",
            "due_date": data.recurrence_start_date,
            "template_id": template["id"],
            "organization_id": org_id,
        }
        supabase.table("tasks").insert(task_data).execute()

    return _enrich_template(template, supabase)


def get_template(template_id: str, org_id: str) -> dict:
    """Get a task template with next 5 occurrences preview."""
    supabase = get_supabase()

    response = (
        supabase.table("task_templates")
        .select("*")
        .eq("id", template_id)
        .eq("organization_id", org_id)
        .single()
        .execute()
    )

    if not response.data:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Task template not found",
        )

    return _enrich_template(response.data, supabase)


def update_template(template_id: str, data: TaskTemplateUpdate, org_id: str) -> dict:
    """Update a task template."""
    supabase = get_supabase()

    update_data = data.model_dump(exclude_none=True)
    if not update_data:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="No fields to update",
        )

    response = (
        supabase.table("task_templates")
        .update(update_data)
        .eq("id", template_id)
        .eq("organization_id", org_id)
        .execute()
    )

    if not response.data:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Task template not found",
        )

    return _enrich_template(response.data[0], supabase)


def deactivate_template(template_id: str, org_id: str) -> dict:
    """Deactivate a task template."""
    supabase = get_supabase()

    response = (
        supabase.table("task_templates")
        .update({"is_active": False})
        .eq("id", template_id)
        .eq("organization_id", org_id)
        .execute()
    )

    if not response.data:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Task template not found",
        )

    return {"message": "Template deactivated"}


def list_tasks(
    org_id: str,
    assigned_to: Optional[str] = None,
    status_filter: Optional[str] = None,
    property_id: Optional[str] = None,
    start_date: Optional[str] = None,
    end_date: Optional[str] = None,
) -> list:
    """List tasks with optional filters."""
    supabase = get_supabase()

    query = (
        supabase.table("tasks")
        .select("*")
        .eq("organization_id", org_id)
    )

    if assigned_to:
        query = query.eq("assigned_to", assigned_to)
    if status_filter:
        query = query.eq("status", status_filter)
    if property_id:
        query = query.eq("property_id", property_id)
    if start_date:
        query = query.gte("due_date", start_date)
    if end_date:
        query = query.lte("due_date", end_date)

    response = query.order("due_date", desc=False).execute()
    tasks = response.data or []

    return [_enrich_task(task, supabase) for task in tasks]


def get_task(task_id: str, org_id: str) -> dict:
    """Get a single task by ID."""
    supabase = get_supabase()

    response = (
        supabase.table("tasks")
        .select("*")
        .eq("id", task_id)
        .eq("organization_id", org_id)
        .single()
        .execute()
    )

    if not response.data:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Task not found",
        )

    return _enrich_task(response.data, supabase)


def update_task(task_id: str, data: TaskUpdate, org_id: str) -> dict:
    """Update task status, notes, or photos."""
    supabase = get_supabase()

    update_data = data.model_dump(exclude_none=True)
    if not update_data:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="No fields to update",
        )

    # Set completed_at timestamp when status changes to done
    if data.status == "done":
        update_data["completed_at"] = datetime.utcnow().isoformat()

    response = (
        supabase.table("tasks")
        .update(update_data)
        .eq("id", task_id)
        .eq("organization_id", org_id)
        .execute()
    )

    if not response.data:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Task not found",
        )

    return _enrich_task(response.data[0], supabase)


def get_my_tasks(user_id: str, org_id: str) -> list:
    """Get tasks assigned to the current user."""
    supabase = get_supabase()

    response = (
        supabase.table("tasks")
        .select("*")
        .eq("organization_id", org_id)
        .eq("assigned_to", user_id)
        .order("due_date", desc=False)
        .execute()
    )

    tasks = response.data or []
    return [_enrich_task(task, supabase) for task in tasks]


def get_calendar_tasks(org_id: str, start: str, end: str) -> list:
    """Get tasks within a date range for calendar view."""
    supabase = get_supabase()

    response = (
        supabase.table("tasks")
        .select("id, title, status, priority, due_date, property_id, assigned_to")
        .eq("organization_id", org_id)
        .gte("due_date", start)
        .lte("due_date", end)
        .order("due_date", desc=False)
        .execute()
    )

    tasks = response.data or []
    result = []
    for task in tasks:
        # Get property name
        property_name = None
        if task.get("property_id"):
            prop_resp = (
                supabase.table("properties")
                .select("name")
                .eq("id", task["property_id"])
                .single()
                .execute()
            )
            if prop_resp.data:
                property_name = prop_resp.data["name"]

        # Get assigned_to name
        assigned_to_name = None
        if task.get("assigned_to"):
            profile_resp = (
                supabase.table("profiles")
                .select("full_name")
                .eq("id", task["assigned_to"])
                .single()
                .execute()
            )
            if profile_resp.data:
                assigned_to_name = profile_resp.data["full_name"]

        result.append({
            "id": task["id"],
            "title": task["title"],
            "status": task["status"],
            "priority": task["priority"],
            "due_date": task.get("due_date"),
            "property_name": property_name,
            "assigned_to_name": assigned_to_name,
        })

    return result


def _enrich_template(template: dict, supabase) -> dict:
    """Enrich a template with property name, assigned_to name, and next occurrences."""
    # Get property name
    property_name = None
    if template.get("property_id"):
        prop_resp = (
            supabase.table("properties")
            .select("name")
            .eq("id", template["property_id"])
            .single()
            .execute()
        )
        if prop_resp.data:
            property_name = prop_resp.data["name"]

    # Get assigned_to name
    assigned_to_name = None
    if template.get("assigned_to"):
        profile_resp = (
            supabase.table("profiles")
            .select("full_name")
            .eq("id", template["assigned_to"])
            .single()
            .execute()
        )
        if profile_resp.data:
            assigned_to_name = profile_resp.data["full_name"]

    # Calculate next occurrences
    next_occurrences = calculate_next_occurrences(template, count=5)

    return {
        "id": template["id"],
        "title": template["title"],
        "description": template.get("description"),
        "task_type": template["task_type"],
        "property_id": template["property_id"],
        "property_name": property_name,
        "unit_id": template.get("unit_id"),
        "assigned_to": template["assigned_to"],
        "assigned_to_name": assigned_to_name,
        "priority": template.get("priority", "normal"),
        "recurrence_type": template["recurrence_type"],
        "recurrence_day_of_week": template.get("recurrence_day_of_week"),
        "recurrence_day_of_month": template.get("recurrence_day_of_month"),
        "recurrence_month_of_quarter": template.get("recurrence_month_of_quarter"),
        "recurrence_start_date": template.get("recurrence_start_date"),
        "recurrence_end_date": template.get("recurrence_end_date"),
        "is_active": template.get("is_active", True),
        "next_occurrences": next_occurrences,
        "created_at": template.get("created_at"),
    }


def _enrich_task(task: dict, supabase) -> dict:
    """Enrich a task with property name, unit number, and names."""
    property_name = None
    unit_number = None
    assigned_to_name = None
    assigned_by_name = None

    if task.get("property_id"):
        prop_resp = (
            supabase.table("properties")
            .select("name")
            .eq("id", task["property_id"])
            .single()
            .execute()
        )
        if prop_resp.data:
            property_name = prop_resp.data["name"]

    if task.get("unit_id"):
        unit_resp = (
            supabase.table("units")
            .select("unit_number")
            .eq("id", task["unit_id"])
            .single()
            .execute()
        )
        if unit_resp.data:
            unit_number = unit_resp.data["unit_number"]

    if task.get("assigned_to"):
        profile_resp = (
            supabase.table("profiles")
            .select("full_name")
            .eq("id", task["assigned_to"])
            .single()
            .execute()
        )
        if profile_resp.data:
            assigned_to_name = profile_resp.data["full_name"]

    if task.get("assigned_by"):
        profile_resp = (
            supabase.table("profiles")
            .select("full_name")
            .eq("id", task["assigned_by"])
            .single()
            .execute()
        )
        if profile_resp.data:
            assigned_by_name = profile_resp.data["full_name"]

    return {
        "id": task["id"],
        "title": task["title"],
        "description": task.get("description"),
        "task_type": task.get("task_type", ""),
        "property_name": property_name,
        "unit_number": unit_number,
        "assigned_to_name": assigned_to_name,
        "assigned_by_name": assigned_by_name,
        "priority": task.get("priority", "normal"),
        "status": task.get("status", "pending"),
        "due_date": task.get("due_date"),
        "completed_at": task.get("completed_at"),
        "created_at": task.get("created_at"),
    }
