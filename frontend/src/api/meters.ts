import apiClient from './client';
import type { MeterReading, MeterHistory, MeterReadingFilter, MeterReadingApprove } from '../types/meter';

export async function uploadMeterReading(data: {
  image: File;
  unit_id: string;
  meter_type: string;
  billing_month: string;
  previous_reading?: number;
}): Promise<MeterReading> {
  const formData = new FormData();
  formData.append('image', data.image);
  formData.append('unit_id', data.unit_id);
  formData.append('meter_type', data.meter_type);
  formData.append('billing_month', data.billing_month);
  if (data.previous_reading !== undefined) {
    formData.append('previous_reading', String(data.previous_reading));
  }

  const response = await apiClient.post('/api/v1/meter-readings/upload', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
  return response.data;
}

export async function getMeterReadings(params?: MeterReadingFilter): Promise<MeterReading[]> {
  const response = await apiClient.get('/api/v1/meter-readings', { params });
  return response.data;
}

export async function getMeterReading(id: string): Promise<MeterReading> {
  const response = await apiClient.get(`/api/v1/meter-readings/${id}`);
  return response.data;
}

export async function approveMeterReading(id: string, data: MeterReadingApprove): Promise<MeterReading> {
  const response = await apiClient.patch(`/api/v1/meter-readings/${id}/approve`, data);
  return response.data;
}

export async function getUnitMeterHistory(unitId: string): Promise<MeterHistory[]> {
  const response = await apiClient.get(`/api/v1/units/${unitId}/meter-history`);
  return response.data;
}
