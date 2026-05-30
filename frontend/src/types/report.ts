export interface RevenueData {
  month: string;
  revenue: number;
  collected: number;
  outstanding: number;
}

export interface RevenueForecast {
  month: string;
  forecasted_revenue: number;
}

export interface RevenueReport {
  period: string;
  year: number;
  data: RevenueData[];
  summary: {
    total_revenue: number;
    total_collected: number;
    collection_rate: number;
  };
  forecast: RevenueForecast[];
}

export interface OccupancyData {
  property_id: string;
  property_name: string;
  total_units: number;
  occupied: number;
  vacant: number;
  maintenance: number;
  occupancy_rate: number;
}

export interface OverdueByProperty {
  property_id: string;
  property_name: string;
  total_amount: number;
  invoice_count: number;
}

export interface OverdueByRenter {
  renter_id: string;
  renter_name: string;
  total_amount: number;
  invoice_count: number;
}

export interface OverdueReport {
  total_overdue_amount: number;
  by_property: OverdueByProperty[];
  by_renter: OverdueByRenter[];
}

export interface MaintenanceCostData {
  period: string;
  total_cost: number;
  request_count: number;
}

export interface StaffPerformance {
  profile_id: string;
  full_name: string;
  role: string;
  tasks: {
    total_assigned: number;
    completed: number;
    in_progress: number;
    cancelled: number;
    completion_rate: number;
    overdue_count: number;
    avg_completion_hours: number;
  };
  maintenance: {
    total_requests_handled: number;
    avg_resolution_hours: number;
    avg_renter_rating?: number;
    total_cost_managed: number;
  };
  quality_score: number;
}

export interface StaffTrend {
  month: string;
  quality_score: number;
}

export interface Leaderboard {
  top: StaffPerformance[];
  bottom: StaffPerformance[];
  total_staff: number;
}

export interface UtilityMetric {
  total: number;
  total_cost: number;
  cost_per_person: number;
  cost_per_unit: number;
  mom_change_pct: number;
}

export interface Alert {
  type: string;
  message: string;
  severity: 'info' | 'warning' | 'alert';
}

export interface PropertyKPI {
  property_id: string;
  property_name: string;
  occupancy: {
    occupancy_rate: number;
    avg_vacancy_days: number;
    turnover_count: number;
  };
  utility_efficiency: {
    electricity: UtilityMetric;
    water: UtilityMetric;
  };
  maintenance: {
    total_requests: number;
    property_level: number;
    unit_level: number;
    total_cost: number;
    cost_per_unit: number;
    avg_resolution_hours: number;
    incident_rate: number;
    top_categories: any[];
    most_problematic_units: any[];
  };
  financial_efficiency: {
    total_revenue: number;
    total_operating_cost: number;
    operating_cost_ratio: number;
    net_operating_income: number;
  };
  alerts: Alert[];
}

export interface UnitBreakdown {
  unit_id: string;
  unit_number: string;
  status: string;
  incidents: number;
  electricity_consumption: number;
  water_consumption: number;
  revenue: number;
}
