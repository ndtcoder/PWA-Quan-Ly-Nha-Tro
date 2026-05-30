from datetime import date, datetime, timedelta
from typing import Optional

from app.database import get_supabase


# Weight constants for quality score
W_COMPLETION = 0.35
W_TIMELINESS = 0.25
W_RATING = 0.25
W_SPEED = 0.15


def get_staff_performance(
    org_id: str,
    period: str = "monthly",
    start_date: Optional[str] = None,
    end_date: Optional[str] = None,
    staff_id: Optional[str] = None,
    property_id: Optional[str] = None,
) -> list:
    """Get performance metrics for each staff member in the date range."""
    supabase = get_supabase()

    # Get staff members
    staff_query = (
        supabase.table("staff_profiles")
        .select("id, full_name, role, user_id")
        .eq("organization_id", org_id)
    )
    if staff_id:
        staff_query = staff_query.eq("id", staff_id)

    staff_resp = staff_query.execute()
    staff_members = staff_resp.data or []

    if not start_date:
        start_date = date(date.today().year, 1, 1).isoformat()
    if not end_date:
        end_date = date.today().isoformat()

    results = []
    for staff in staff_members:
        sid = staff["id"]

        # Get tasks assigned to this staff member
        tasks_query = (
            supabase.table("tasks")
            .select("*")
            .eq("assigned_to", sid)
            .gte("created_at", start_date)
            .lte("created_at", end_date)
        )
        if property_id:
            tasks_query = tasks_query.eq("property_id", property_id)

        tasks_resp = tasks_query.execute()
        tasks = tasks_resp.data or []

        total_assigned = len(tasks)
        completed = sum(1 for t in tasks if t.get("status") == "completed")
        in_progress = sum(1 for t in tasks if t.get("status") == "in_progress")
        cancelled = sum(1 for t in tasks if t.get("status") == "cancelled")
        completion_rate = (completed / total_assigned) if total_assigned > 0 else 0

        # Calculate avg completion hours and overdue count
        completion_hours = []
        overdue_count = 0
        for t in tasks:
            if t.get("status") == "completed" and t.get("completed_at") and t.get("created_at"):
                try:
                    created = datetime.fromisoformat(t["created_at"].replace("Z", "+00:00"))
                    completed_at = datetime.fromisoformat(t["completed_at"].replace("Z", "+00:00"))
                    hours = (completed_at - created).total_seconds() / 3600
                    completion_hours.append(hours)
                except (ValueError, TypeError):
                    pass

                # Check if overdue (completed after due_date)
                if t.get("due_date"):
                    try:
                        due = datetime.fromisoformat(t["due_date"].replace("Z", "+00:00"))
                        if completed_at > due:
                            overdue_count += 1
                    except (ValueError, TypeError):
                        pass

        avg_completion_hours = (
            sum(completion_hours) / len(completion_hours) if completion_hours else 0
        )

        # Get maintenance requests handled by this staff
        maint_query = (
            supabase.table("maintenance_requests")
            .select("*")
            .eq("assigned_to", sid)
            .gte("created_at", start_date)
            .lte("created_at", end_date)
        )
        if property_id:
            maint_query = maint_query.eq("property_id", property_id)

        maint_resp = maint_query.execute()
        maint_requests = maint_resp.data or []

        total_requests_handled = len(maint_requests)

        # Avg resolution hours
        resolution_hours = []
        ratings = []
        total_cost_managed = 0.0

        for req in maint_requests:
            total_cost_managed += float(req.get("actual_cost", 0) or 0)

            if req.get("resolved_at") and req.get("created_at"):
                try:
                    created = datetime.fromisoformat(req["created_at"].replace("Z", "+00:00"))
                    resolved = datetime.fromisoformat(req["resolved_at"].replace("Z", "+00:00"))
                    hours = (resolved - created).total_seconds() / 3600
                    resolution_hours.append(hours)
                except (ValueError, TypeError):
                    pass

            if req.get("renter_rating"):
                ratings.append(float(req["renter_rating"]))

        avg_resolution_hours = (
            sum(resolution_hours) / len(resolution_hours) if resolution_hours else 0
        )
        avg_renter_rating = sum(ratings) / len(ratings) if ratings else None

        # Calculate quality score
        staff_data = {
            "completion_rate": completion_rate,
            "overdue_count": overdue_count,
            "total_assigned": total_assigned,
            "avg_renter_rating": avg_renter_rating,
            "avg_resolution_hours": avg_resolution_hours,
        }
        quality_score = calculate_quality_score(staff_data)

        results.append(
            {
                "profile_id": sid,
                "full_name": staff.get("full_name", ""),
                "role": staff.get("role", ""),
                "tasks": {
                    "total_assigned": total_assigned,
                    "completed": completed,
                    "in_progress": in_progress,
                    "cancelled": cancelled,
                    "completion_rate": round(completion_rate, 2),
                    "overdue_count": overdue_count,
                    "avg_completion_hours": round(avg_completion_hours, 1),
                },
                "maintenance": {
                    "total_requests_handled": total_requests_handled,
                    "avg_resolution_hours": round(avg_resolution_hours, 1),
                    "avg_renter_rating": round(avg_renter_rating, 1) if avg_renter_rating else None,
                    "total_cost_managed": total_cost_managed,
                },
                "quality_score": round(quality_score, 1),
            }
        )

    return results


def calculate_quality_score(staff_data: dict) -> float:
    """Calculate quality score using weighted formula."""
    completion_rate = staff_data.get("completion_rate", 0)
    overdue_count = staff_data.get("overdue_count", 0)
    total_assigned = staff_data.get("total_assigned", 1)
    avg_renter_rating = staff_data.get("avg_renter_rating")
    avg_resolution_hours = staff_data.get("avg_resolution_hours", 0)

    completion_score = completion_rate * 100
    timeliness_score = (1 - overdue_count / max(total_assigned, 1)) * 100
    rating_score = (avg_renter_rating / 5) * 100 if avg_renter_rating else 50
    speed_score = _calculate_speed_score(avg_resolution_hours)

    return (
        completion_score * W_COMPLETION
        + timeliness_score * W_TIMELINESS
        + rating_score * W_RATING
        + speed_score * W_SPEED
    )


def _calculate_speed_score(avg_resolution_hours: float) -> float:
    """Calculate speed score inversely proportional to resolution hours."""
    if avg_resolution_hours <= 0:
        return 75  # Default if no data
    if avg_resolution_hours <= 4:
        return 100
    if avg_resolution_hours <= 8:
        return 90
    if avg_resolution_hours <= 24:
        return 75
    if avg_resolution_hours <= 48:
        return 60
    if avg_resolution_hours <= 72:
        return 40
    return 20


def get_staff_trend(org_id: str, staff_id: str, months: int = 6) -> list:
    """Calculate quality_score for each of the last N months."""
    results = []
    today = date.today()

    for i in range(months - 1, -1, -1):
        # Calculate start and end of each month
        target_date = today - timedelta(days=30 * i)
        month_start = date(target_date.year, target_date.month, 1)
        if target_date.month == 12:
            month_end = date(target_date.year + 1, 1, 1) - timedelta(days=1)
        else:
            month_end = date(target_date.year, target_date.month + 1, 1) - timedelta(days=1)

        performance = get_staff_performance(
            org_id=org_id,
            start_date=month_start.isoformat(),
            end_date=month_end.isoformat(),
            staff_id=staff_id,
        )

        quality_score = performance[0]["quality_score"] if performance else 0

        results.append(
            {
                "month": month_start.strftime("%Y-%m"),
                "quality_score": quality_score,
            }
        )

    return results


def get_leaderboard(
    org_id: str,
    period: str = "monthly",
    property_id: Optional[str] = None,
) -> dict:
    """Get all staff performance, sorted by quality_score DESC. Return top 5 and bottom 5."""
    performance = get_staff_performance(
        org_id=org_id,
        period=period,
        property_id=property_id,
    )

    sorted_perf = sorted(performance, key=lambda x: x["quality_score"], reverse=True)

    top_5 = sorted_perf[:5]
    bottom_5 = sorted_perf[-5:] if len(sorted_perf) > 5 else sorted_perf

    return {
        "top": top_5,
        "bottom": bottom_5,
        "total_staff": len(sorted_perf),
    }
