import apiClient from './client';
import type { Property, Unit, UnitHistory, PropertyFilter } from '../types/property';

export async function getProperties(params?: PropertyFilter): Promise<Property[]> {
  const response = await apiClient.get('/api/v1/properties', { params });
  return response.data;
}

export async function createProperty(data: Partial<Property>): Promise<Property> {
  const response = await apiClient.post('/api/v1/properties', data);
  return response.data;
}

export async function getProperty(id: string): Promise<Property> {
  const response = await apiClient.get(`/api/v1/properties/${id}`);
  return response.data;
}

export async function updateProperty(id: string, data: Partial<Property>): Promise<Property> {
  const response = await apiClient.patch(`/api/v1/properties/${id}`, data);
  return response.data;
}

export async function deleteProperty(id: string): Promise<void> {
  await apiClient.delete(`/api/v1/properties/${id}`);
}

export async function getUnits(propertyId: string, params?: { status?: string }): Promise<Unit[]> {
  const response = await apiClient.get(`/api/v1/properties/${propertyId}/units`, { params });
  return response.data;
}

export async function createUnit(propertyId: string, data: Partial<Unit>): Promise<Unit> {
  const response = await apiClient.post(`/api/v1/properties/${propertyId}/units`, data);
  return response.data;
}

export async function getUnit(id: string): Promise<Unit> {
  const response = await apiClient.get(`/api/v1/units/${id}`);
  return response.data;
}

export async function updateUnit(id: string, data: Partial<Unit>): Promise<Unit> {
  const response = await apiClient.patch(`/api/v1/units/${id}`, data);
  return response.data;
}

export async function deleteUnit(id: string): Promise<void> {
  await apiClient.delete(`/api/v1/units/${id}`);
}

export async function getUnitHistory(id: string): Promise<UnitHistory[]> {
  const response = await apiClient.get(`/api/v1/units/${id}/history`);
  return response.data;
}
