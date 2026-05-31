import apiClient from './client';
import type { StaffMember, StaffCreate, StaffUpdate, StaffRoleUpdate } from '../types/task';

export async function getStaff(params?: { role?: string; property_id?: string }): Promise<StaffMember[]> {
  const response = await apiClient.get('/api/v1/staff', { params });
  return response.data;
}

export async function createStaff(data: StaffCreate): Promise<StaffMember> {
  const response = await apiClient.post('/api/v1/staff', data);
  return response.data;
}

export async function updateStaff(id: string, data: StaffUpdate): Promise<StaffMember> {
  const response = await apiClient.patch(`/api/v1/staff/${id}`, data);
  return response.data;
}

export async function updateStaffRole(id: string, data: StaffRoleUpdate): Promise<StaffMember> {
  const response = await apiClient.patch(`/api/v1/staff/${id}/role`, data);
  return response.data;
}

export async function deleteStaff(id: string): Promise<{ message: string }> {
  const response = await apiClient.delete(`/api/v1/staff/${id}`);
  return response.data;
}
