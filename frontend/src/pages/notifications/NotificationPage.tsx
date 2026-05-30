import { useMemo, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { format, isToday, isYesterday, isThisWeek } from 'date-fns';
import {
  getNotifications,
  markAsRead,
  markAllAsRead,
  type Notification,
} from '../../api/notifications';

const TYPE_ICONS: Record<string, string> = {
  invoice_sent: '📄',
  payment_reminder: '⏰',
  payment_overdue: '🚨',
  contract_expiring: '📋',
  maintenance_update: '🔧',
  task_assigned: '✅',
};

const TYPE_LABELS: Record<string, string> = {
  invoice_sent: 'Invoice',
  payment_reminder: 'Reminder',
  payment_overdue: 'Overdue',
  contract_expiring: 'Contract',
  maintenance_update: 'Maintenance',
  task_assigned: 'Task',
};

interface GroupedNotifications {
  label: string;
  notifications: Notification[];
}

function groupByDay(notifications: Notification[]): GroupedNotifications[] {
  const groups: Record<string, Notification[]> = {
    Today: [],
    Yesterday: [],
    'This Week': [],
    Older: [],
  };

  for (const n of notifications) {
    const date = new Date(n.created_at);
    if (isToday(date)) {
      groups['Today'].push(n);
    } else if (isYesterday(date)) {
      groups['Yesterday'].push(n);
    } else if (isThisWeek(date)) {
      groups['This Week'].push(n);
    } else {
      groups['Older'].push(n);
    }
  }

  return Object.entries(groups)
    .filter(([, items]) => items.length > 0)
    .map(([label, items]) => ({ label, notifications: items }));
}

export default function NotificationPage() {
  const queryClient = useQueryClient();
  const [filterType, setFilterType] = useState<string>('all');

  const { data: notifications = [], isLoading } = useQuery({
    queryKey: ['notifications', 'list'],
    queryFn: getNotifications,
  });

  const markReadMutation = useMutation({
    mutationFn: markAsRead,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
    },
  });

  const markAllReadMutation = useMutation({
    mutationFn: markAllAsRead,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
    },
  });

  const filteredNotifications = useMemo(() => {
    if (filterType === 'all') return notifications;
    return notifications.filter((n) => n.type === filterType);
  }, [notifications, filterType]);

  const grouped = useMemo(
    () => groupByDay(filteredNotifications),
    [filteredNotifications],
  );

  const notificationTypes = useMemo(() => {
    const types = new Set(notifications.map((n) => n.type));
    return Array.from(types);
  }, [notifications]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin h-8 w-8 border-4 border-blue-500 border-t-transparent rounded-full" />
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Notifications</h1>
        <div className="flex items-center gap-3">
          <select
            value={filterType}
            onChange={(e) => setFilterType(e.target.value)}
            className="text-sm border border-gray-300 rounded-md px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="all">All Types</option>
            {notificationTypes.map((type) => (
              <option key={type} value={type}>
                {TYPE_LABELS[type] || type}
              </option>
            ))}
          </select>
          <button
            onClick={() => markAllReadMutation.mutate()}
            className="text-sm bg-blue-600 text-white px-3 py-1.5 rounded-md hover:bg-blue-700"
          >
            Mark all read
          </button>
        </div>
      </div>

      {/* Notification groups */}
      {grouped.length === 0 ? (
        <div className="text-center py-16 text-gray-500">
          <svg
            className="mx-auto h-12 w-12 text-gray-300 mb-4"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={1.5}
              d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"
            />
          </svg>
          <p className="text-lg font-medium">No notifications</p>
          <p className="text-sm">You are all caught up!</p>
        </div>
      ) : (
        grouped.map((group) => (
          <div key={group.label} className="mb-6">
            <h2 className="text-sm font-semibold text-gray-500 uppercase mb-2">
              {group.label}
            </h2>
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 divide-y divide-gray-100">
              {group.notifications.map((notification) => (
                <div
                  key={notification.id}
                  className={`px-4 py-3 flex items-start gap-3 ${
                    !notification.is_read ? 'bg-blue-50' : ''
                  }`}
                >
                  <span className="text-lg mt-0.5">
                    {TYPE_ICONS[notification.type] || '🔔'}
                  </span>
                  <div className="flex-1 min-w-0">
                    <p
                      className={`text-sm ${
                        !notification.is_read
                          ? 'font-semibold text-gray-900'
                          : 'text-gray-700'
                      }`}
                    >
                      {notification.title}
                    </p>
                    <p className="text-sm text-gray-500 mt-0.5">
                      {notification.body}
                    </p>
                    <p className="text-xs text-gray-400 mt-1">
                      {format(new Date(notification.created_at), 'MMM d, yyyy HH:mm')}
                    </p>
                  </div>
                  {!notification.is_read && (
                    <button
                      onClick={() => markReadMutation.mutate([notification.id])}
                      className="text-xs text-blue-600 hover:text-blue-800 whitespace-nowrap"
                    >
                      Mark read
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>
        ))
      )}
    </div>
  );
}
