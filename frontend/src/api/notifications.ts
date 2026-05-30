import apiClient from './client';

export interface Notification {
  id: string;
  recipient_id: string;
  type: string;
  title: string;
  body: string;
  data: Record<string, string>;
  is_read: boolean;
  created_at: string;
  organization_id?: string;
}

export interface UnreadCountResponse {
  count: number;
}

export async function getNotifications(): Promise<Notification[]> {
  const response = await apiClient.get('/api/v1/notifications');
  return response.data;
}

export async function markAsRead(ids: string[]): Promise<void> {
  await apiClient.patch('/api/v1/notifications/mark-read', { ids });
}

export async function markAllAsRead(): Promise<void> {
  await apiClient.patch('/api/v1/notifications/mark-read', { all: true });
}

export async function getUnreadCount(): Promise<UnreadCountResponse> {
  const response = await apiClient.get('/api/v1/notifications/unread-count');
  return response.data;
}

export async function subscribePush(subscription: {
  endpoint: string;
  p256dh: string;
  auth: string;
}): Promise<void> {
  await apiClient.post('/api/v1/push/subscribe', subscription);
}

export async function unsubscribePush(endpoint: string): Promise<void> {
  await apiClient.delete('/api/v1/push/subscribe', {
    data: { endpoint },
  });
}
