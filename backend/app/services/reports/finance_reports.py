from datetime import date, datetime
from typing import Optional

from scipy.stats import linregress

from app.database import get_supabase


def get_revenue_report(
    org_id: str,
    period: str = "monthly",
    year: int = 2024,
    property_id: Optional[str] = None,
) -> dict:
    """Aggregate revenue from invoices grouped by billing period."""
    supabase = get_supabase()

    query = supabase.table("invoices").select("*").eq("organization_id", org_id)

    if property_id:
        query = query.eq("property_id", property_id)

    # Filter by year using billing_month (format: YYYY-MM)
    query = query.gte("billing_month", f"{year}-01").lte("billing_month", f"{year}-12")

    response = query.execute()
    invoices = response.data or []

    # Group by period
    period_data: dict = {}
    for inv in invoices:
        billing_month = inv.get("billing_month", "")
        if not billing_month:
            continue

        if period == "monthly":
            key = billing_month
        elif period == "quarterly":
            month_num = int(billing_month.split("-")[1])
            quarter = (month_num - 1) // 3 + 1
            key = f"Q{quarter}"
        else:  # yearly
            key = str(year)

        if key not in period_data:
            period_data[key] = {"revenue": 0.0, "collected": 0.0}

        total = float(inv.get("total_amount", 0) or 0)
        period_data[key]["revenue"] += total

        if inv.get("status") == "paid":
            period_data[key]["collected"] += total

    # Build data list
    data = []
    for month_key in sorted(period_data.keys()):
        entry = period_data[month_key]
        data.append(
            {
                "month": month_key,
                "revenue": entry["revenue"],
                "collected": entry["collected"],
                "outstanding": entry["revenue"] - entry["collected"],
            }
        )

    # Summary
    total_revenue = sum(d["revenue"] for d in data)
    total_collected = sum(d["collected"] for d in data)
    collection_rate = (total_collected / total_revenue * 100) if total_revenue > 0 else 0

    # Forecast if 3+ months of data
    forecast = []
    if len(data) >= 3:
        forecast = forecast_revenue(data, months_ahead=3)

    return {
        "period": period,
        "year": year,
        "data": data,
        "summary": {
            "total_revenue": total_revenue,
            "total_collected": total_collected,
            "collection_rate": round(collection_rate, 1),
        },
        "forecast": forecast,
    }


def get_occupancy_report(
    org_id: str,
    property_id: Optional[str] = None,
) -> list:
    """Count units by status per property."""
    supabase = get_supabase()

    query = supabase.table("properties").select("id, name").eq("organization_id", org_id)
    if property_id:
        query = query.eq("id", property_id)

    properties_resp = query.execute()
    properties = properties_resp.data or []

    results = []
    for prop in properties:
        units_resp = (
            supabase.table("units")
            .select("id, status")
            .eq("property_id", prop["id"])
            .execute()
        )
        units = units_resp.data or []
        total = len(units)
        occupied = sum(1 for u in units if u.get("status") == "occupied")
        vacant = sum(1 for u in units if u.get("status") == "vacant")
        maintenance = sum(1 for u in units if u.get("status") == "maintenance")

        occupancy_rate = (occupied / total * 100) if total > 0 else 0

        results.append(
            {
                "property_id": prop["id"],
                "property_name": prop["name"],
                "total_units": total,
                "occupied": occupied,
                "vacant": vacant,
                "maintenance": maintenance,
                "occupancy_rate": round(occupancy_rate, 1),
            }
        )

    return results


def get_overdue_report(org_id: str) -> dict:
    """Get invoices where status is overdue or past due date."""
    supabase = get_supabase()
    today = date.today().isoformat()

    # Get overdue invoices
    overdue_resp = (
        supabase.table("invoices")
        .select("*, units(unit_number, property_id, properties(name)), renters(full_name)")
        .eq("organization_id", org_id)
        .eq("status", "overdue")
        .execute()
    )

    # Also get sent invoices past due date
    sent_past_due_resp = (
        supabase.table("invoices")
        .select("*, units(unit_number, property_id, properties(name)), renters(full_name)")
        .eq("organization_id", org_id)
        .eq("status", "sent")
        .lt("due_date", today)
        .execute()
    )

    all_overdue = (overdue_resp.data or []) + (sent_past_due_resp.data or [])

    total_overdue_amount = sum(float(inv.get("total_amount", 0) or 0) for inv in all_overdue)

    # Group by property
    by_property: dict = {}
    by_renter: dict = {}

    for inv in all_overdue:
        amount = float(inv.get("total_amount", 0) or 0)

        # Group by property
        unit_data = inv.get("units") or {}
        prop_data = unit_data.get("properties") or {}
        prop_name = prop_data.get("name", "Unknown")
        prop_id = unit_data.get("property_id", "unknown")

        if prop_id not in by_property:
            by_property[prop_id] = {
                "property_id": prop_id,
                "property_name": prop_name,
                "total_amount": 0,
                "invoice_count": 0,
            }
        by_property[prop_id]["total_amount"] += amount
        by_property[prop_id]["invoice_count"] += 1

        # Group by renter
        renter_data = inv.get("renters") or {}
        renter_name = renter_data.get("full_name", "Unknown")
        renter_id = inv.get("renter_id", "unknown")

        if renter_id not in by_renter:
            by_renter[renter_id] = {
                "renter_id": renter_id,
                "renter_name": renter_name,
                "total_amount": 0,
                "invoice_count": 0,
            }
        by_renter[renter_id]["total_amount"] += amount
        by_renter[renter_id]["invoice_count"] += 1

    return {
        "total_overdue_amount": total_overdue_amount,
        "by_property": list(by_property.values()),
        "by_renter": list(by_renter.values()),
    }


def get_maintenance_costs_report(
    org_id: str,
    period: str = "monthly",
    year: int = 2024,
    property_id: Optional[str] = None,
) -> list:
    """Sum costs from maintenance_requests where status='resolved', grouped by period."""
    supabase = get_supabase()

    query = (
        supabase.table("maintenance_requests")
        .select("*")
        .eq("organization_id", org_id)
        .eq("status", "resolved")
    )

    if property_id:
        query = query.eq("property_id", property_id)

    response = query.execute()
    requests = response.data or []

    period_data: dict = {}
    for req in requests:
        resolved_at = req.get("resolved_at") or req.get("updated_at") or ""
        if not resolved_at:
            continue

        try:
            dt = datetime.fromisoformat(resolved_at.replace("Z", "+00:00"))
        except (ValueError, TypeError):
            continue

        if dt.year != year:
            continue

        if period == "monthly":
            key = f"{year}-{dt.month:02d}"
        elif period == "quarterly":
            quarter = (dt.month - 1) // 3 + 1
            key = f"Q{quarter}"
        else:
            key = str(year)

        if key not in period_data:
            period_data[key] = {"total_cost": 0.0, "request_count": 0}

        period_data[key]["total_cost"] += float(req.get("actual_cost", 0) or 0)
        period_data[key]["request_count"] += 1

    return [
        {"period": k, "total_cost": v["total_cost"], "request_count": v["request_count"]}
        for k, v in sorted(period_data.items())
    ]


def forecast_revenue(history_data: list, months_ahead: int = 3) -> list:
    """Use scipy.stats.linregress for linear regression forecast."""
    if len(history_data) < 3:
        return []

    x = list(range(len(history_data)))
    y = [d["revenue"] for d in history_data]

    slope, intercept, r_value, p_value, std_err = linregress(x, y)

    forecast = []
    last_index = len(history_data) - 1
    for i in range(1, months_ahead + 1):
        forecasted = slope * (last_index + i) + intercept
        forecasted = max(0, forecasted)  # No negative revenue
        forecast.append(
            {
                "month": f"M+{i}",
                "forecasted_revenue": round(forecasted, 0),
            }
        )

    return forecast
