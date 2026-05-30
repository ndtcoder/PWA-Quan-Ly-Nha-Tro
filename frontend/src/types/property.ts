export interface Property {
  id: string;
  name: string;
  address: string;
  ward?: string;
  district?: string;
  city?: string;
  property_type: string;
  total_units: number;
  occupied_units: number;
  description?: string;
  thumbnail_url?: string;
  created_at: string;
}

export interface Unit {
  id: string;
  unit_number: string;
  floor?: number;
  area_sqm?: number;
  base_rent: number;
  deposit_amount?: number;
  max_occupants: number;
  status: 'vacant' | 'occupied' | 'maintenance';
  amenities: string[];
  notes?: string;
  current_renter_name?: string;
  property_id: string;
}

export interface UnitHistory {
  id: string;
  contract_number?: string;
  renter_name: string;
  start_date: string;
  end_date: string;
  status: string;
  monthly_rent: number;
}

export interface PropertyFilter {
  city?: string;
  property_type?: string;
}
