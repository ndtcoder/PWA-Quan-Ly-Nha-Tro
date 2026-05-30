export interface Invoice {
  id: string;
  invoice_number: string;
  contract_id: string;
  unit_id: string;
  unit_number: string;
  renter_name: string;
  billing_period_start: string;
  billing_period_end: string;
  due_date: string;
  subtotal: number;
  total: number;
  status: 'draft' | 'sent' | 'paid' | 'overdue' | 'cancelled';
  paid_amount: number;
  paid_at?: string;
  payment_method?: string;
  vietqr_ref_code?: string;
  notes?: string;
  created_at: string;
}

export interface InvoiceDetail extends Invoice {
  items: InvoiceItem[];
  qr_image_base64?: string;
}

export interface InvoiceItem {
  id: string;
  item_type: string;
  description: string;
  quantity: number;
  unit_price: number;
  amount: number;
}

export interface InvoiceFilter {
  status?: string;
  unit_id?: string;
  renter_id?: string;
  billing_month?: string;
}

export interface InvoiceItemCreate {
  item_type: 'rent' | 'electricity' | 'water' | 'service' | 'internet' | 'parking' | 'other';
  description: string;
  quantity?: number;
  unit_price?: number;
  amount: number;
}

export interface InvoiceCreate {
  contract_id: string;
  billing_period_start: string;
  billing_period_end: string;
  due_date: string;
  items: InvoiceItemCreate[];
  notes?: string;
}

export interface MarkPaidRequest {
  payment_method: string;
  paid_amount: number;
}
