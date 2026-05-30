import apiClient from './client';
import type {
  MaintenanceRequest,
  MaintenanceFilter,
  MaintenanceCreateData,
  MaintenanceResolveData,
  MaintenanceRateData,
} from '../types/maintenance';

export async function getMaintenanceRequests(
  params?: MaintenanceFilter
): Promise<MaintenanceRequest[]> {
  const response = await apiClient.get('/api/v1/maintenance', { params });
  return response.data;
}

export async function getMaintenanceRequest(
  id: string
): Promise<MaintenanceRequest> {
  const response = await apiClient.get(`/api/v1/maintenance/${id}`);
  return response.data;
}

export async function createMaintenanceRequest(
  data: MaintenanceCreateData
): Promise<MaintenanceRequest> {
  const response = await apiClient.post('/api/v1/maintenance', data);
  return response.data;
}

export async function assignMaintenanceRequest(
  id: string,
  assigned_to: string
): Promise<MaintenanceRequest> {
  const response = await apiClient.patch(`/api/v1/maintenance/${id}/assign`, {
    assigned_to,
  });
  return response.data;
}

export async function updateMaintenanceStatus(
  id: string,
  status: 'in_progress'
): Promise<MaintenanceRequest> {
  const response = await apiClient.patch(`/api/v1/maintenance/${id}/status`, {
    status,
  });
  return response.data;
}

export async function resolveMaintenanceRequest(
  id: string,
  data: MaintenanceResolveData
): Promise<MaintenanceRequest> {
  const response = await apiClient.post(
    `/api/v1/maintenance/${id}/resolve`,
    data
  );
  return response.data;
}

export async function rateMaintenanceRequest(
  id: string,
  data: MaintenanceRateData
): Promise<MaintenanceRequest> {
  const response = await apiClient.post(`/api/v1/maintenance/${id}/rate`, data);
  return response.data;
}

export async function uploadMaintenancePhotos(
  id: string,
  files: File[]
): Promise<{ message: string }> {
  const formData = new FormData();
  files.forEach((file) => formData.append('files', file));
  const response = await apiClient.post(
    `/api/v1/maintenance/${id}/photos`,
    formData,
    { headers: { 'Content-Type': 'multipart/form-data' } }
  );
  return response.data;
}

export async function getPropertyMaintenance(
  propertyId: string
): Promise<MaintenanceRequest[]> {
  const response = await apiClient.get(
    `/api/v1/properties/${propertyId}/maintenance`
  );
  return response.data;
}

export async function getUnitMaintenanceHistory(
  unitId: string
): Promise<MaintenanceRequest[]> {
  const response = await apiClient.get(
    `/api/v1/units/${unitId}/maintenance-history`
  );
  return response.data;
}
