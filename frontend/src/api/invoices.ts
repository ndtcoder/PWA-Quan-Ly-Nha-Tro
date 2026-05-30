import apiClient from './client';
import type {
  Invoice,
  InvoiceCreate,
  InvoiceDetail,
  InvoiceFilter,
  MarkPaidRequest,
} from '../types/invoice';

export async function getInvoices(params?: InvoiceFilter): Promise<Invoice[]> {
  const response = await apiClient.get('/api/v1/invoices', { params });
  return response.data;
}

export async function createInvoice(data: InvoiceCreate): Promise<Invoice> {
  const response = await apiClient.post('/api/v1/invoices', data);
  return response.data;
}

export async function getInvoice(id: string): Promise<InvoiceDetail> {
  const response = await apiClient.get(`/api/v1/invoices/${id}`);
  return response.data;
}

export async function sendInvoice(id: string): Promise<Invoice> {
  const response = await apiClient.post(`/api/v1/invoices/${id}/send`);
  return response.data;
}

export async function markInvoicePaid(id: string, data: MarkPaidRequest): Promise<Invoice> {
  const response = await apiClient.post(`/api/v1/invoices/${id}/mark-paid`, data);
  return response.data;
}

export async function autoGenerateInvoices(billingMonth?: string): Promise<Invoice[]> {
  const response = await apiClient.post('/api/v1/invoices/auto-generate', {
    billing_month: billingMonth || null,
  });
  return response.data;
}
