import apiClient from './client';
import { supabase } from '../lib/supabase';

export interface RegisterOwnerData {
  email: string;
  password: string;
  full_name: string;
  organization_name: string;
}

export interface LoginData {
  email: string;
  password: string;
}

export interface InviteUserData {
  email: string;
  role: string;
  property_id?: string;
}

export interface AcceptInviteData {
  token: string;
  password: string;
  full_name: string;
}

export interface AuthResponse {
  access_token: string;
  user: {
    id: string;
    email: string;
    role: string;
    organization_id: string;
    full_name?: string | null;
  };
}

export interface GoogleAuthData {
  access_token: string;
  full_name?: string | null;
}

export interface ValidateInviteResponse {
  email: string;
  role: string;
  organization_id: string;
}

export function registerOwner(data: RegisterOwnerData) {
  return apiClient.post<AuthResponse>('/api/v1/auth/register-owner', data);
}

export function login(data: LoginData) {
  return apiClient.post<AuthResponse>('/api/v1/auth/login', data);
}

export function logout() {
  return apiClient.post('/api/v1/auth/logout');
}

export function getMe() {
  return apiClient.get('/api/v1/auth/me');
}

export function inviteUser(data: InviteUserData) {
  return apiClient.post('/api/v1/auth/invite', data);
}

export function acceptInvite(data: AcceptInviteData) {
  return apiClient.post<AuthResponse>('/api/v1/auth/accept-invite', data);
}

export function validateInvite(token: string) {
  return apiClient.get<ValidateInviteResponse>('/api/v1/auth/validate-invite', {
    params: { token },
  });
}

export function googleAuth(data: GoogleAuthData) {
  return apiClient.post<AuthResponse>('/api/v1/auth/google', data);
}

export async function signInWithGoogle() {
  const redirectTo = window.location.origin + '/auth/callback';
  const { error } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: {
      redirectTo,
    },
  });
  if (error) {
    throw error;
  }
}
