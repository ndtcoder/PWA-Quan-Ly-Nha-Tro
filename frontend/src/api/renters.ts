import apiClient from './client';
import type { Renter, RenterDetail, RenterCreate, RenterUpdate, RenterFilter } from '../types/renter';

export async function getRenters(params?: RenterFilter): Promise<Renter[]> {
  const response = await apiClient.get('/api/v1/renters', { params });
  return response.data;
}

export async function createRenter(data: RenterCreate): Promise<Renter> {
  const response = await apiClient.post('/api/v1/renters', data);
  return response.data;
}

export async function getRenter(id: string): Promise<RenterDetail> {
  const response = await apiClient.get(`/api/v1/renters/${id}`);
  return response.data;
}

export async function updateRenter(id: string, data: RenterUpdate): Promise<Renter> {
  const response = await apiClient.patch(`/api/v1/renters/${id}`, data);
  return response.data;
}

export async function inviteRenter(id: string): Promise<{ message: string }> {
  const response = await apiClient.post(`/api/v1/renters/${id}/invite`);
  return response.data;
}

export async function uploadIdFront(id: string, file: File): Promise<{ url: string }> {
  const formData = new FormData();
  formData.append('file', file);
  const response = await apiClient.post(`/api/v1/renters/${id}/id-front`, formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
  return response.data;
}

export async function uploadIdBack(id: string, file: File): Promise<{ url: string }> {
  const formData = new FormData();
  formData.append('file', file);
  const response = await apiClient.post(`/api/v1/renters/${id}/id-back`, formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
  return response.data;
}
