export interface MeterReading {
  id: string;
  unit_id: string;
  unit_number?: string;
  property_name?: string;
  meter_type: 'electricity' | 'water';
  billing_month: string;
  previous_reading?: number;
  current_reading?: number;
  consumption?: number;
  unit_price?: number;
  photo_url?: string;
  ai_detected_value?: number;
  ai_confidence?: number;
  is_approved: boolean;
  manual_override_value?: number;
  submitted_by?: string;
  submitted_at: string;
  reviewed_by?: string;
  reviewed_at?: string;
}

export interface MeterHistory {
  billing_month: string;
  electricity_consumption?: number;
  electricity_cost?: number;
  water_consumption?: number;
  water_cost?: number;
}

export interface MeterReadingFilter {
  unit_id?: string;
  meter_type?: string;
  billing_month?: string;
  is_approved?: boolean;
}

export interface MeterReadingApprove {
  approved_value?: number;
}
