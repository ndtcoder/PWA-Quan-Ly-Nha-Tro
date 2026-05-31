export interface Renter {
  id: string;
  full_name: string;
  phone?: string;
  email?: string;
  id_number?: string;
  current_unit_number?: string;
  current_property_name?: string;
  active_contract_id?: string;
  created_at: string;
}

export interface RenterDetail extends Renter {
  id_issued_date?: string;
  id_issued_place?: string;
  date_of_birth?: string;
  gender?: string;
  hometown?: string;
  occupation?: string;
  workplace?: string;
  emergency_contact_name?: string;
  emergency_contact_phone?: string;
  id_photo_links?: string[];
  notes?: string;
  contracts_history: RenterContractHistory[];
}

export interface RenterContractHistory {
  id: string;
  contract_number?: string;
  unit_number?: string;
  property_name?: string;
  start_date: string;
  end_date: string;
  status: string;
  monthly_rent: number;
}

export interface RenterCreate {
  full_name: string;
  phone?: string;
  email?: string;
  id_number?: string;
  id_issued_date?: string;
  id_issued_place?: string;
  date_of_birth?: string;
  gender?: string;
  hometown?: string;
  occupation?: string;
  workplace?: string;
  emergency_contact_name?: string;
  emergency_contact_phone?: string;
  id_photo_links?: string[];
  notes?: string;
}

export interface RenterUpdate {
  full_name?: string;
  phone?: string;
  email?: string;
  id_number?: string;
  id_issued_date?: string;
  id_issued_place?: string;
  date_of_birth?: string;
  gender?: string;
  hometown?: string;
  occupation?: string;
  workplace?: string;
  emergency_contact_name?: string;
  emergency_contact_phone?: string;
  id_photo_links?: string[];
  notes?: string;
}

export interface RenterFilter {
  search?: string;
  has_active_contract?: boolean;
}
