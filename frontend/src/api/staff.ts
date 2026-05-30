import apiClient from './client';
import type { StaffMember, StaffInvite, StaffRoleUpdate } from '../types/task';

export async function getStaff(params?: { role?: string; property_id?: string }): Promise<StaffMember[]> {
  const response = await apiClient.get('/api/v1/staff', { params });
  return response.data;
}

export async function inviteStaff(data: StaffInvite): Promise<{ message: string }> {
  const response = await apiClient.post('/api/v1/staff/invite', data);
  return response.data;
}

export async function updateStaffRole(id: string, data: StaffRoleUpdate): Promise<StaffMember> {
  const response = await apiClient.patch(`/api/v1/staff/${id}/role`, data);
  return response.data;
}

export async function deactivateStaff(id: string): Promise<{ message: string }> {
  const response = await apiClient.delete(`/api/v1/staff/${id}`);
  return response.data;
}
