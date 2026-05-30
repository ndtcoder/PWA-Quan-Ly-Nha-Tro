import apiClient from './client';
import type { Contract, ContractDetail, ContractCreate, ContractUpdate, ContractFilter } from '../types/contract';

export async function getContracts(params?: ContractFilter): Promise<Contract[]> {
  const response = await apiClient.get('/api/v1/contracts', { params });
  return response.data;
}

export async function createContract(data: ContractCreate): Promise<Contract> {
  const response = await apiClient.post('/api/v1/contracts', data);
  return response.data;
}

export async function getContract(id: string): Promise<ContractDetail> {
  const response = await apiClient.get(`/api/v1/contracts/${id}`);
  return response.data;
}

export async function updateContract(id: string, data: ContractUpdate): Promise<Contract> {
  const response = await apiClient.patch(`/api/v1/contracts/${id}`, data);
  return response.data;
}

export async function activateContract(id: string): Promise<Contract> {
  const response = await apiClient.post(`/api/v1/contracts/${id}/activate`);
  return response.data;
}

export async function terminateContract(id: string, termination_reason: string): Promise<Contract> {
  const response = await apiClient.post(`/api/v1/contracts/${id}/terminate`, { termination_reason });
  return response.data;
}

export async function exportContractPdf(id: string): Promise<{ pdf_url: string }> {
  const response = await apiClient.post(`/api/v1/contracts/${id}/export-pdf`);
  return response.data;
}

export async function getExpiringSoonContracts(): Promise<Contract[]> {
  const response = await apiClient.get('/api/v1/contracts/expiring-soon');
  return response.data;
}
