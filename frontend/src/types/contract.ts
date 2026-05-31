export interface Contract {
  id: string;
  contract_number: string;
  status: 'draft' | 'active' | 'expired' | 'terminated';
  unit_id: string;
  unit_number: string;
  property_name: string;
  renter_id: string;
  renter_name: string;
  start_date: string;
  end_date: string;
  monthly_rent: number;
  deposit_amount: number;
  created_at: string;
  pdf_url?: string;
  scan_pdf_url?: string;
}

export interface ContractDetail extends Contract {
  deposit_paid_date?: string;
  payment_due_day: number;
  max_occupants: number;
  terms?: string;
  signed_at?: string;
  terminated_at?: string;
  termination_reason?: string;
  created_by?: string;
}

export interface ContractCreate {
  unit_id: string;
  renter_id: string;
  start_date: string;
  end_date: string;
  monthly_rent: number;
  deposit_amount: number;
  deposit_paid_date?: string;
  payment_due_day?: number;
  max_occupants?: number;
  terms?: string;
}

export interface ContractUpdate {
  end_date?: string;
  monthly_rent?: number;
  terms?: string;
  deposit_paid_date?: string;
  payment_due_day?: number;
}

export interface ContractFilter {
  status?: string;
  unit_id?: string;
  renter_id?: string;
}
