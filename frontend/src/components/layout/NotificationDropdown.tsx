import { useEffect, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { formatDistanceToNow } from 'date-fns';
import {
  getNotifications,
  markAsRead,
  markAllAsRead,
  type Notification,
} from '../../api/notifications';

interface Props {
  onClose: () => void;
}

const TYPE_COLORS: Record<string, string> = {
  invoice_sent: 'bg-blue-500',
  payment_reminder: 'bg-yellow-500',
  payment_overdue: 'bg-red-500',
  contract_expiring: 'bg-purple-500',
  maintenance_update: 'bg-green-500',
  task_assigned: 'bg-indigo-500',
};

export default function NotificationDropdown({ onClose }: Props) {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const dropdownRef = useRef<HTMLDivElement>(null);

  const { data: notifications = [] } = useQuery({
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

  // Close on click outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node)
      ) {
        onClose();
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [onClose]);

  const handleItemClick = (notification: Notification) => {
    if (!notification.is_read) {
      markReadMutation.mutate([notification.id]);
    }
    if (notification.data?.link) {
      navigate(notification.data.link);
    }
    onClose();
  };

  const recentNotifications = notifications.slice(0, 10);

  return (
    <div
      ref={dropdownRef}
      className="absolute right-0 top-full mt-2 w-80 bg-white rounded-lg shadow-lg border border-gray-200 z-50 overflow-hidden"
    >
      {/* Header */}
      <div className="px-4 py-3 border-b border-gray-100 flex items-center justify-between">
        <h3 className="text-sm font-semibold text-gray-900">Thông báo</h3>
        <button
          onClick={() => markAllReadMutation.mutate()}
          className="text-xs text-blue-600 hover:text-blue-800"
        >
          Đánh dấu tất cả đã đọc
        </button>
      </div>

      {/* Notification list */}
      <div className="max-h-96 overflow-y-auto">
        {recentNotifications.length === 0 ? (
          <div className="px-4 py-8 text-center text-gray-500 text-sm">
            Chưa có thông báo
          </div>
        ) : (
          recentNotifications.map((notification) => (
            <button
              key={notification.id}
              onClick={() => handleItemClick(notification)}
              className={`w-full text-left px-4 py-3 border-b border-gray-50 hover:bg-gray-50 flex items-start gap-3 ${
                !notification.is_read ? 'bg-blue-50' : ''
              }`}
            >
              <span
                className={`mt-1.5 w-2 h-2 rounded-full flex-shrink-0 ${
                  TYPE_COLORS[notification.type] || 'bg-gray-400'
                }`}
              />
              <div className="flex-1 min-w-0">
                <p
                  className={`text-sm truncate ${
                    !notification.is_read
                      ? 'font-semibold text-gray-900'
                      : 'text-gray-700'
                  }`}
                >
                  {notification.title}
                </p>
                <p className="text-xs text-gray-500 truncate">
                  {notification.body}
                </p>
                <p className="text-xs text-gray-400 mt-0.5">
                  {formatDistanceToNow(new Date(notification.created_at), {
                    addSuffix: true,
                  })}
                </p>
              </div>
            </button>
          ))
        )}
      </div>

      {/* Footer */}
      <div className="px-4 py-2 border-t border-gray-100">
        <button
          onClick={() => {
            navigate('/notifications');
            onClose();
          }}
          className="w-full text-center text-sm text-blue-600 hover:text-blue-800 py-1"
        >
          Xem tất cả thông báo
        </button>
      </div>
    </div>
  );
}
