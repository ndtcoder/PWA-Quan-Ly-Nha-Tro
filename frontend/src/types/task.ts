export interface TaskTemplate {
  id: string;
  title: string;
  description?: string;
  task_type: string;
  property_id: string;
  property_name: string;
  unit_id?: string;
  assigned_to: string;
  assigned_to_name: string;
  priority: string;
  recurrence_type: 'once' | 'daily' | 'weekly' | 'monthly' | 'quarterly';
  recurrence_day_of_week?: number;
  recurrence_day_of_month?: number;
  recurrence_month_of_quarter?: number;
  recurrence_start_date: string;
  recurrence_end_date?: string;
  is_active: boolean;
  next_occurrences: string[];
  created_at: string;
}

export interface TaskTemplateCreate {
  title: string;
  description?: string;
  task_type: 'maintenance' | 'cleaning' | 'inspection';
  property_id: string;
  unit_id?: string;
  assigned_to: string;
  priority?: string;
  recurrence_type: 'once' | 'daily' | 'weekly' | 'monthly' | 'quarterly';
  recurrence_day_of_week?: number;
  recurrence_day_of_month?: number;
  recurrence_month_of_quarter?: number;
  recurrence_start_date: string;
  recurrence_end_date?: string;
}

export interface TaskTemplateUpdate {
  title?: string;
  description?: string;
  task_type?: string;
  property_id?: string;
  unit_id?: string;
  assigned_to?: string;
  priority?: string;
  recurrence_type?: 'once' | 'daily' | 'weekly' | 'monthly' | 'quarterly';
  recurrence_day_of_week?: number;
  recurrence_day_of_month?: number;
  recurrence_month_of_quarter?: number;
  recurrence_start_date?: string;
  recurrence_end_date?: string;
}

export interface Task {
  id: string;
  title: string;
  description?: string;
  task_type: string;
  property_name: string;
  unit_number?: string;
  assigned_to_name: string;
  assigned_by_name?: string;
  priority: 'low' | 'normal' | 'high' | 'urgent';
  status: 'pending' | 'in_progress' | 'done' | 'cancelled';
  due_date?: string;
  completed_at?: string;
  created_at: string;
}

export interface TaskUpdate {
  status?: 'pending' | 'in_progress' | 'done' | 'cancelled';
  completion_notes?: string;
  completion_photos?: string[];
}

export interface CalendarTask {
  id: string;
  title: string;
  status: string;
  priority: string;
  due_date?: string;
  property_name?: string;
  assigned_to_name?: string;
}

export interface StaffMember {
  id: string;
  full_name: string;
  email: string;
  role: string;
  phone?: string;
  is_active: boolean;
  assigned_properties: string[];
  notes?: string;
  created_at: string;
}

export interface StaffInvite {
  email: string;
  role: 'manager' | 'accountant' | 'maintenance' | 'cleaner';
  property_id?: string;
}

export interface StaffRoleUpdate {
  role: 'manager' | 'accountant' | 'maintenance' | 'cleaner';
}
