from datetime import datetime
from typing import Optional

from app.database import get_supabase


def get_property_kpis(
    org_id: str,
    property_id: str,
    period: str = "monthly",
    year: int = 2024,
) -> dict:
    """Get KPIs for a property: occupancy, utility, maintenance, financial."""
    supabase = get_supabase()

    # Get property info
    prop_resp = (
        supabase.table("properties")
        .select("id, name")
        .eq("id", property_id)
        .eq("organization_id", org_id)
        .single()
        .execute()
    )
    prop = prop_resp.data or {}

    # Get units
    units_resp = (
        supabase.table("units")
        .select("id, status")
        .eq("property_id", property_id)
        .execute()
    )
    units = units_resp.data or []
    total_units = len(units)
    occupied = sum(1 for u in units if u.get("status") == "occupied")

    occupancy_rate = (occupied / total_units * 100) if total_units > 0 else 0

    # Occupancy metrics
    occupancy = {
        "occupancy_rate": round(occupancy_rate, 1),
        "avg_vacancy_days": 0,
        "turnover_count": 0,
    }

    # Utility efficiency from meter readings
    utility_efficiency = _get_utility_metrics(
        supabase, property_id, year, total_units, occupied
    )

    # Maintenance metrics
    maintenance = _get_maintenance_metrics(supabase, property_id, year, total_units)

    # Financial efficiency
    financial = _get_financial_metrics(supabase, org_id, property_id, year)

    kpi_data = {
        "property_id": property_id,
        "property_name": prop.get("name", ""),
        "occupancy": occupancy,
        "utility_efficiency": utility_efficiency,
        "maintenance": maintenance,
        "financial_efficiency": financial,
        "alerts": [],
    }

    # Generate alerts
    kpi_data["alerts"] = generate_property_alerts(kpi_data)

    return kpi_data


def _get_utility_metrics(
    supabase, property_id: str, year: int, total_units: int, occupied: int
) -> dict:
    """Calculate utility efficiency metrics."""
    readings_resp = (
        supabase.table("meter_readings")
        .select("*")
        .eq("property_id", property_id)
        .gte("reading_date", f"{year}-01-01")
        .lte("reading_date", f"{year}-12-31")
        .execute()
    )
    readings = readings_resp.data or []

    elec_total = sum(
        float(r.get("consumption", 0) or 0)
        for r in readings
        if r.get("meter_type") == "electricity"
    )
    water_total = sum(
        float(r.get("consumption", 0) or 0)
        for r in readings
        if r.get("meter_type") == "water"
    )

    elec_cost = sum(
        float(r.get("cost", 0) or 0)
        for r in readings
        if r.get("meter_type") == "electricity"
    )
    water_cost = sum(
        float(r.get("cost", 0) or 0)
        for r in readings
        if r.get("meter_type") == "water"
    )

    persons = max(occupied, 1)
    units_count = max(total_units, 1)

    return {
        "electricity": {
            "total": elec_total,
            "total_cost": elec_cost,
            "cost_per_person": round(elec_cost / persons, 0),
            "cost_per_unit": round(elec_cost / units_count, 0),
            "mom_change_pct": 0,
        },
        "water": {
            "total": water_total,
            "total_cost": water_cost,
            "cost_per_person": round(water_cost / persons, 0),
            "cost_per_unit": round(water_cost / units_count, 0),
            "mom_change_pct": 0,
        },
    }


def _get_maintenance_metrics(
    supabase, property_id: str, year: int, total_units: int
) -> dict:
    """Calculate maintenance metrics."""
    maint_resp = (
        supabase.table("maintenance_requests")
        .select("*")
        .eq("property_id", property_id)
        .gte("created_at", f"{year}-01-01")
        .lte("created_at", f"{year}-12-31")
        .execute()
    )
    requests = maint_resp.data or []

    total_requests = len(requests)
    property_level = sum(1 for r in requests if r.get("scope") == "property")
    unit_level = sum(1 for r in requests if r.get("scope") == "unit")
    total_cost = sum(float(r.get("actual_cost", 0) or 0) for r in requests)

    # Avg resolution hours
    resolution_hours = []
    for req in requests:
        if req.get("resolved_at") and req.get("created_at"):
            try:
                created = datetime.fromisoformat(
                    req["created_at"].replace("Z", "+00:00")
                )
                resolved = datetime.fromisoformat(
                    req["resolved_at"].replace("Z", "+00:00")
                )
                hours = (resolved - created).total_seconds() / 3600
                resolution_hours.append(hours)
            except (ValueError, TypeError):
                pass

    avg_resolution = (
        sum(resolution_hours) / len(resolution_hours) if resolution_hours else 0
    )
    units_count = max(total_units, 1)
    incident_rate = round(total_requests / units_count, 2)

    # Top categories
    categories: dict = {}
    unit_incidents: dict = {}
    for req in requests:
        cat = req.get("category", "other")
        categories[cat] = categories.get(cat, 0) + 1
        uid = req.get("unit_id")
        if uid:
            unit_incidents[uid] = unit_incidents.get(uid, 0) + 1

    top_categories = sorted(
        [{"category": k, "count": v} for k, v in categories.items()],
        key=lambda x: x["count"],
        reverse=True,
    )[:5]

    most_problematic = sorted(
        [{"unit_id": k, "incident_count": v} for k, v in unit_incidents.items()],
        key=lambda x: x["incident_count"],
        reverse=True,
    )[:5]

    return {
        "total_requests": total_requests,
        "property_level": property_level,
        "unit_level": unit_level,
        "total_cost": total_cost,
        "cost_per_unit": round(total_cost / units_count, 0),
        "avg_resolution_hours": round(avg_resolution, 1),
        "incident_rate": incident_rate,
        "top_categories": top_categories,
        "most_problematic_units": most_problematic,
    }


def _get_financial_metrics(
    supabase, org_id: str, property_id: str, year: int
) -> dict:
    """Calculate financial efficiency metrics."""
    invoices_resp = (
        supabase.table("invoices")
        .select("*")
        .eq("organization_id", org_id)
        .eq("property_id", property_id)
        .gte("billing_month", f"{year}-01")
        .lte("billing_month", f"{year}-12")
        .execute()
    )
    invoices = invoices_resp.data or []

    total_revenue = sum(float(inv.get("total_amount", 0) or 0) for inv in invoices)

    # Operating cost from maintenance
    maint_resp = (
        supabase.table("maintenance_requests")
        .select("actual_cost")
        .eq("property_id", property_id)
        .eq("status", "resolved")
        .gte("created_at", f"{year}-01-01")
        .lte("created_at", f"{year}-12-31")
        .execute()
    )
    maint_costs = sum(
        float(r.get("actual_cost", 0) or 0) for r in (maint_resp.data or [])
    )

    total_operating_cost = maint_costs
    operating_cost_ratio = (
        (total_operating_cost / total_revenue * 100) if total_revenue > 0 else 0
    )
    net_operating_income = total_revenue - total_operating_cost

    return {
        "total_revenue": total_revenue,
        "total_operating_cost": total_operating_cost,
        "operating_cost_ratio": round(operating_cost_ratio, 1),
        "net_operating_income": net_operating_income,
    }


def generate_property_alerts(kpi_data: dict) -> list:
    """Generate alerts based on threshold checks."""
    alerts = []

    # Check utility cost increases
    utility = kpi_data.get("utility_efficiency", {})
    elec_change = utility.get("electricity", {}).get("mom_change_pct", 0)
    water_change = utility.get("water", {}).get("mom_change_pct", 0)

    if elec_change > 25:
        alerts.append({
            "type": "utility",
            "message": f"Electricity cost increased {elec_change}% vs last month",
            "severity": "warning",
        })

    if water_change > 25:
        alerts.append({
            "type": "utility",
            "message": f"Water cost increased {water_change}% vs last month",
            "severity": "warning",
        })

    # Check incident rate
    maintenance = kpi_data.get("maintenance", {})
    incident_rate = maintenance.get("incident_rate", 0)
    if incident_rate > 2:
        alerts.append({
            "type": "maintenance",
            "message": f"High incident rate: {incident_rate} per unit",
            "severity": "alert",
        })

    # Check maintenance cost ratio
    financial = kpi_data.get("financial_efficiency", {})
    cost_ratio = financial.get("operating_cost_ratio", 0)
    if cost_ratio > 15:
        alerts.append({
            "type": "financial",
            "message": f"Operating cost ratio at {cost_ratio}%",
            "severity": "warning",
        })

    # Check occupancy
    occupancy = kpi_data.get("occupancy", {})
    vacancy_days = occupancy.get("avg_vacancy_days", 0)
    if vacancy_days > 14:
        alerts.append({
            "type": "occupancy",
            "message": f"Average vacancy of {vacancy_days} days",
            "severity": "info",
        })

    return alerts


def compare_properties(
    org_id: str,
    property_ids: list,
    period: str = "monthly",
    year: int = 2024,
) -> list:
    """Get KPIs for each property, normalize for radar chart."""
    results = []
    for pid in property_ids[:5]:  # Max 5 properties
        kpi = get_property_kpis(org_id, pid, period, year)
        results.append(kpi)
    return results


def get_units_breakdown(
    org_id: str,
    property_id: str,
    period: str = "monthly",
    year: int = 2024,
) -> list:
    """Per-unit metrics: incidents, electricity, water, revenue."""
    supabase = get_supabase()

    units_resp = (
        supabase.table("units")
        .select("id, unit_number, status")
        .eq("property_id", property_id)
        .execute()
    )
    units = units_resp.data or []

    results = []
    for unit in units:
        uid = unit["id"]

        # Incidents
        maint_resp = (
            supabase.table("maintenance_requests")
            .select("id")
            .eq("unit_id", uid)
            .gte("created_at", f"{year}-01-01")
            .lte("created_at", f"{year}-12-31")
            .execute()
        )
        incidents = len(maint_resp.data or [])

        # Meter readings
        meter_resp = (
            supabase.table("meter_readings")
            .select("meter_type, consumption, cost")
            .eq("unit_id", uid)
            .gte("reading_date", f"{year}-01-01")
            .lte("reading_date", f"{year}-12-31")
            .execute()
        )
        readings = meter_resp.data or []

        electricity = sum(
            float(r.get("consumption", 0) or 0)
            for r in readings
            if r.get("meter_type") == "electricity"
        )
        water = sum(
            float(r.get("consumption", 0) or 0)
            for r in readings
            if r.get("meter_type") == "water"
        )

        # Revenue from invoices
        inv_resp = (
            supabase.table("invoices")
            .select("total_amount")
            .eq("unit_id", uid)
            .gte("billing_month", f"{year}-01")
            .lte("billing_month", f"{year}-12")
            .execute()
        )
        revenue = sum(
            float(i.get("total_amount", 0) or 0) for i in (inv_resp.data or [])
        )

        results.append({
            "unit_id": uid,
            "unit_number": unit.get("unit_number", ""),
            "status": unit.get("status", ""),
            "incidents": incidents,
            "electricity_consumption": electricity,
            "water_consumption": water,
            "revenue": revenue,
        })

    return results
