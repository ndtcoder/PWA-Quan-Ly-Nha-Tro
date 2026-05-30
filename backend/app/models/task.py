from pydantic import BaseModel, model_validator
from typing import Optional, Literal


class TaskTemplateCreate(BaseModel):
    title: str
    description: Optional[str] = None
    task_type: Literal["maintenance", "cleaning", "inspection"]
    property_id: str
    unit_id: Optional[str] = None
    assigned_to: str
    priority: str = "normal"
    recurrence_type: Literal["once", "daily", "weekly", "monthly", "quarterly"]
    recurrence_day_of_week: Optional[int] = None  # 0-6 (Monday=0)
    recurrence_day_of_month: Optional[int] = None  # 1-31
    recurrence_month_of_quarter: Optional[int] = None  # 1-3
    recurrence_start_date: str
    recurrence_end_date: Optional[str] = None

    @model_validator(mode="after")
    def validate_recurrence_fields(self):
        if self.recurrence_type == "weekly" and self.recurrence_day_of_week is None:
            raise ValueError("recurrence_day_of_week is required for weekly recurrence")
        if self.recurrence_type == "monthly" and self.recurrence_day_of_month is None:
            raise ValueError("recurrence_day_of_month is required for monthly recurrence")
        if self.recurrence_type == "quarterly":
            if self.recurrence_day_of_month is None:
                raise ValueError("recurrence_day_of_month is required for quarterly recurrence")
            if self.recurrence_month_of_quarter is None:
                raise ValueError("recurrence_month_of_quarter is required for quarterly recurrence")
        return self


class TaskTemplateUpdate(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    task_type: Optional[Literal["maintenance", "cleaning", "inspection"]] = None
    property_id: Optional[str] = None
    unit_id: Optional[str] = None
    assigned_to: Optional[str] = None
    priority: Optional[str] = None
    recurrence_type: Optional[Literal["once", "daily", "weekly", "monthly", "quarterly"]] = None
    recurrence_day_of_week: Optional[int] = None
    recurrence_day_of_month: Optional[int] = None
    recurrence_month_of_quarter: Optional[int] = None
    recurrence_start_date: Optional[str] = None
    recurrence_end_date: Optional[str] = None


class TaskTemplateResponse(BaseModel):
    id: str
    title: str
    description: Optional[str] = None
    task_type: str
    property_id: str
    property_name: Optional[str] = None
    unit_id: Optional[str] = None
    assigned_to: str
    assigned_to_name: Optional[str] = None
    priority: str = "normal"
    recurrence_type: str
    recurrence_day_of_week: Optional[int] = None
    recurrence_day_of_month: Optional[int] = None
    recurrence_month_of_quarter: Optional[int] = None
    recurrence_start_date: Optional[str] = None
    recurrence_end_date: Optional[str] = None
    is_active: bool = True
    next_occurrences: list[str] = []
    created_at: Optional[str] = None


class TaskUpdate(BaseModel):
    status: Optional[Literal["pending", "in_progress", "done", "cancelled"]] = None
    completion_notes: Optional[str] = None
    completion_photos: Optional[list] = None


class TaskResponse(BaseModel):
    id: str
    title: str
    description: Optional[str] = None
    task_type: str
    property_name: Optional[str] = None
    unit_number: Optional[str] = None
    assigned_to_name: Optional[str] = None
    assigned_by_name: Optional[str] = None
    priority: str = "normal"
    status: str = "pending"
    due_date: Optional[str] = None
    completed_at: Optional[str] = None
    created_at: Optional[str] = None


class CalendarTaskResponse(BaseModel):
    id: str
    title: str
    status: str
    priority: str
    due_date: Optional[str] = None
    property_name: Optional[str] = None
    assigned_to_name: Optional[str] = None
