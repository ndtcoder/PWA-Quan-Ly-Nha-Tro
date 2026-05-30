import apiClient from './client';
import type {
  RevenueReport,
  OccupancyData,
  OverdueReport,
  MaintenanceCostData,
  StaffPerformance,
  StaffTrend,
  Leaderboard,
  PropertyKPI,
  UnitBreakdown,
} from '../types/report';

export async function getRevenueReport(params?: {
  period?: string;
  year?: number;
  property_id?: string;
}): Promise<RevenueReport> {
  const response = await apiClient.get('/api/v1/reports/revenue', { params });
  return response.data;
}

export async function getOccupancyReport(params?: {
  property_id?: string;
}): Promise<OccupancyData[]> {
  const response = await apiClient.get('/api/v1/reports/occupancy', { params });
  return response.data;
}

export async function getOverdueReport(): Promise<OverdueReport> {
  const response = await apiClient.get('/api/v1/reports/overdue');
  return response.data;
}

export async function getMaintenanceCostsReport(params?: {
  period?: string;
  year?: number;
  property_id?: string;
}): Promise<MaintenanceCostData[]> {
  const response = await apiClient.get('/api/v1/reports/maintenance-costs', { params });
  return response.data;
}

export async function getStaffPerformance(params?: {
  period?: string;
  start_date?: string;
  end_date?: string;
  staff_id?: string;
  property_id?: string;
}): Promise<StaffPerformance[]> {
  const response = await apiClient.get('/api/v1/reports/staff-performance', { params });
  return response.data;
}

export async function getStaffTrend(
  staffId: string,
  months?: number,
): Promise<StaffTrend[]> {
  const response = await apiClient.get(`/api/v1/reports/staff-performance/${staffId}/trend`, {
    params: { months },
  });
  return response.data;
}

export async function getStaffLeaderboard(params?: {
  period?: string;
  property_id?: string;
}): Promise<Leaderboard> {
  const response = await apiClient.get('/api/v1/reports/staff-performance/leaderboard', { params });
  return response.data;
}

export async function getPropertyKpis(params: {
  property_id: string;
  period?: string;
  year?: number;
}): Promise<PropertyKPI> {
  const response = await apiClient.get('/api/v1/reports/property-kpis', { params });
  return response.data;
}

export async function compareProperties(params: {
  property_ids: string;
  period?: string;
  year?: number;
}): Promise<PropertyKPI[]> {
  const response = await apiClient.get('/api/v1/reports/property-kpis/compare', { params });
  return response.data;
}

export async function getUnitsBreakdown(
  propertyId: string,
  params?: { period?: string; year?: number },
): Promise<UnitBreakdown[]> {
  const response = await apiClient.get(`/api/v1/reports/property-kpis/${propertyId}/units-breakdown`, { params });
  return response.data;
}
