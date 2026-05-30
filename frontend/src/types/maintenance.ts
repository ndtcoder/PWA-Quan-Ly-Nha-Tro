export interface MaintenanceRequest {
  id: string;
  scope: 'property' | 'unit';
  property_id: string;
  property_name: string;
  unit_id?: string;
  unit_number?: string;
  submitted_by: string;
  submitter_name: string;
  submitter_role: string;
  title: string;
  description?: string;
  location_detail?: string;
  category: 'electrical' | 'plumbing' | 'furniture' | 'structure' | 'other';
  priority: 'low' | 'normal' | 'high' | 'urgent';
  status: 'open' | 'assigned' | 'in_progress' | 'resolved' | 'closed';
  photos: string[];
  assigned_to?: string;
  assigned_to_name?: string;
  assigned_at?: string;
  resolved_at?: string;
  resolution_notes?: string;
  resolution_photos: string[];
  cost: number;
  renter_rating?: number;
  renter_feedback?: string;
  created_at: string;
  updated_at: string;
}

export interface MaintenanceFilter {
  scope?: string;
  status?: string;
  property_id?: string;
  unit_id?: string;
  category?: string;
  priority?: string;
}

export interface MaintenanceCreateData {
  scope: 'property' | 'unit';
  property_id: string;
  unit_id?: string;
  title: string;
  description?: string;
  location_detail?: string;
  category: 'electrical' | 'plumbing' | 'furniture' | 'structure' | 'other';
  priority: string;
  photos?: string[];
}

export interface MaintenanceResolveData {
  resolution_notes: string;
  cost: number;
  resolution_photos?: string[];
}

export interface MaintenanceRateData {
  rating: number;
  feedback?: string;
}
