from typing import Optional

from fastapi import APIRouter, Depends, Query

from app.dependencies import get_current_user, require_roles
from app.services.reports.finance_reports import (
    get_maintenance_costs_report,
    get_occupancy_report,
    get_overdue_report,
    get_revenue_report,
)
from app.services.reports.property_kpi_reports import (
    compare_properties,
    get_property_kpis,
    get_units_breakdown,
)
from app.services.reports.staff_reports import (
    get_leaderboard,
    get_staff_performance,
    get_staff_trend,
)

router = APIRouter(prefix="/reports", tags=["reports"])


@router.get("/revenue")
async def revenue_report(
    period: str = Query("monthly"),
    year: int = Query(2024),
    property_id: Optional[str] = Query(None),
    current_user: dict = Depends(require_roles(["owner", "manager"])),
):
    """Get revenue report with forecast."""
    return get_revenue_report(
        org_id=current_user["organization_id"],
        period=period,
        year=year,
        property_id=property_id,
    )


@router.get("/occupancy")
async def occupancy_report(
    property_id: Optional[str] = Query(None),
    current_user: dict = Depends(require_roles(["owner", "manager"])),
):
    """Get occupancy report per property."""
    return get_occupancy_report(
        org_id=current_user["organization_id"],
        property_id=property_id,
    )


@router.get("/overdue")
async def overdue_report(
    current_user: dict = Depends(require_roles(["owner", "manager"])),
):
    """Get overdue invoices report."""
    return get_overdue_report(org_id=current_user["organization_id"])


@router.get("/maintenance-costs")
async def maintenance_costs_report(
    period: str = Query("monthly"),
    year: int = Query(2024),
    property_id: Optional[str] = Query(None),
    current_user: dict = Depends(require_roles(["owner", "manager"])),
):
    """Get maintenance costs report."""
    return get_maintenance_costs_report(
        org_id=current_user["organization_id"],
        period=period,
        year=year,
        property_id=property_id,
    )


@router.get("/staff-performance")
async def staff_performance_report(
    period: str = Query("monthly"),
    start_date: Optional[str] = Query(None),
    end_date: Optional[str] = Query(None),
    staff_id: Optional[str] = Query(None),
    property_id: Optional[str] = Query(None),
    current_user: dict = Depends(require_roles(["owner", "manager"])),
):
    """Get staff performance report."""
    return get_staff_performance(
        org_id=current_user["organization_id"],
        period=period,
        start_date=start_date,
        end_date=end_date,
        staff_id=staff_id,
        property_id=property_id,
    )


@router.get("/staff-performance/leaderboard")
async def staff_leaderboard(
    period: str = Query("monthly"),
    property_id: Optional[str] = Query(None),
    current_user: dict = Depends(require_roles(["owner", "manager"])),
):
    """Get staff performance leaderboard."""
    return get_leaderboard(
        org_id=current_user["organization_id"],
        period=period,
        property_id=property_id,
    )


@router.get("/staff-performance/{staff_id}/trend")
async def staff_trend(
    staff_id: str,
    months: int = Query(6),
    current_user: dict = Depends(require_roles(["owner", "manager"])),
):
    """Get staff performance trend over months."""
    return get_staff_trend(
        org_id=current_user["organization_id"],
        staff_id=staff_id,
        months=months,
    )


@router.get("/property-kpis")
async def property_kpis(
    property_id: str = Query(...),
    period: str = Query("monthly"),
    year: int = Query(2024),
    current_user: dict = Depends(require_roles(["owner", "manager"])),
):
    """Get property KPIs."""
    return get_property_kpis(
        org_id=current_user["organization_id"],
        property_id=property_id,
        period=period,
        year=year,
    )


@router.get("/property-kpis/compare")
async def property_compare(
    property_ids: str = Query(..., description="Comma-separated property IDs"),
    period: str = Query("monthly"),
    year: int = Query(2024),
    current_user: dict = Depends(require_roles(["owner", "manager"])),
):
    """Compare multiple properties."""
    ids = [pid.strip() for pid in property_ids.split(",") if pid.strip()]
    return compare_properties(
        org_id=current_user["organization_id"],
        property_ids=ids,
        period=period,
        year=year,
    )


@router.get("/property-kpis/{property_id}/units-breakdown")
async def property_units_breakdown(
    property_id: str,
    period: str = Query("monthly"),
    year: int = Query(2024),
    current_user: dict = Depends(require_roles(["owner", "manager"])),
):
    """Get per-unit breakdown for a property."""
    return get_units_breakdown(
        org_id=current_user["organization_id"],
        property_id=property_id,
        period=period,
        year=year,
    )
