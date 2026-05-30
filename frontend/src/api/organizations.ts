import apiClient from './client';

export interface OrganizationData {
  id: string;
  name: string;
  slug: string;
  subscription_plan: string | null;
  created_at: string | null;
}

export interface UpdateOrganizationData {
  name: string;
  slug?: string;
}

export function getMyOrganization() {
  return apiClient.get<OrganizationData>('/api/v1/organizations/me');
}

export function updateOrganization(data: UpdateOrganizationData) {
  return apiClient.patch<OrganizationData>('/api/v1/organizations', data);
}
