from typing import Optional
from datetime import date

from fastapi import APIRouter, Depends, Query

from app.dependencies import get_current_user, require_roles
from app.models.task import (
    TaskTemplateCreate,
    TaskTemplateUpdate,
    TaskTemplateResponse,
    TaskUpdate,
    TaskResponse,
    CalendarTaskResponse,
)
from app.services import task_service
from app.services.task_scheduler import spawn_recurring_tasks

router = APIRouter(prefix="/tasks", tags=["tasks"])


# --- Task Templates ---

@router.get("/task-templates", response_model=list[TaskTemplateResponse])
async def list_templates(
    property_id: Optional[str] = Query(None),
    recurrence_type: Optional[str] = Query(None),
    is_active: Optional[bool] = Query(None),
    current_user: dict = Depends(get_current_user),
):
    """List task templates for the organization."""
    return task_service.list_templates(
        org_id=current_user["organization_id"],
        property_id=property_id,
        recurrence_type=recurrence_type,
        is_active=is_active,
    )


@router.post("/task-templates", response_model=TaskTemplateResponse, status_code=201)
async def create_template(
    data: TaskTemplateCreate,
    current_user: dict = Depends(require_roles(["owner", "manager"])),
):
    """Create a new task template."""
    return task_service.create_template(
        data=data,
        org_id=current_user["organization_id"],
        user_id=current_user["user_id"],
    )


@router.get("/task-templates/{template_id}", response_model=TaskTemplateResponse)
async def get_template(
    template_id: str,
    current_user: dict = Depends(get_current_user),
):
    """Get a task template with next 5 occurrences preview."""
    return task_service.get_template(
        template_id=template_id,
        org_id=current_user["organization_id"],
    )


@router.patch("/task-templates/{template_id}", response_model=TaskTemplateResponse)
async def update_template(
    template_id: str,
    data: TaskTemplateUpdate,
    current_user: dict = Depends(require_roles(["owner", "manager"])),
):
    """Update a task template."""
    return task_service.update_template(
        template_id=template_id,
        data=data,
        org_id=current_user["organization_id"],
    )


@router.delete("/task-templates/{template_id}")
async def deactivate_template(
    template_id: str,
    current_user: dict = Depends(require_roles(["owner", "manager"])),
):
    """Deactivate a task template."""
    return task_service.deactivate_template(
        template_id=template_id,
        org_id=current_user["organization_id"],
    )


# --- Tasks ---

@router.get("/my-tasks", response_model=list[TaskResponse])
async def get_my_tasks(
    current_user: dict = Depends(get_current_user),
):
    """Get tasks assigned to the current user."""
    return task_service.get_my_tasks(
        user_id=current_user["user_id"],
        org_id=current_user["organization_id"],
    )


@router.get("/calendar", response_model=list[CalendarTaskResponse])
async def get_calendar_tasks(
    start: str = Query(..., description="Start date YYYY-MM-DD"),
    end: str = Query(..., description="End date YYYY-MM-DD"),
    current_user: dict = Depends(get_current_user),
):
    """Get tasks within a date range for calendar view."""
    return task_service.get_calendar_tasks(
        org_id=current_user["organization_id"],
        start=start,
        end=end,
    )


@router.get("", response_model=list[TaskResponse])
async def list_tasks(
    assigned_to: Optional[str] = Query(None),
    status: Optional[str] = Query(None),
    property_id: Optional[str] = Query(None),
    start_date: Optional[str] = Query(None),
    end_date: Optional[str] = Query(None),
    current_user: dict = Depends(get_current_user),
):
    """List tasks with optional filters."""
    return task_service.list_tasks(
        org_id=current_user["organization_id"],
        assigned_to=assigned_to,
        status_filter=status,
        property_id=property_id,
        start_date=start_date,
        end_date=end_date,
    )


@router.get("/{task_id}", response_model=TaskResponse)
async def get_task(
    task_id: str,
    current_user: dict = Depends(get_current_user),
):
    """Get a single task by ID."""
    return task_service.get_task(
        task_id=task_id,
        org_id=current_user["organization_id"],
    )


@router.patch("/{task_id}", response_model=TaskResponse)
async def update_task(
    task_id: str,
    data: TaskUpdate,
    current_user: dict = Depends(get_current_user),
):
    """Update task status, notes, or photos."""
    return task_service.update_task(
        task_id=task_id,
        data=data,
        org_id=current_user["organization_id"],
    )


@router.post("/trigger-scheduler")
async def trigger_scheduler(
    current_user: dict = Depends(require_roles(["owner", "manager"])),
):
    """Dev-only: Manually trigger the task scheduler for today."""
    result = spawn_recurring_tasks()
    return result
