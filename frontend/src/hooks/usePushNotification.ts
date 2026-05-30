import { useState, useEffect, useCallback } from 'react';
import { subscribeToPush } from '../services/pwa';
import { subscribePush } from '../api/notifications';

const VAPID_PUBLIC_KEY = import.meta.env.VITE_VAPID_PUBLIC_KEY || '';

interface UsePushNotificationReturn {
  isSupported: boolean;
  permissionStatus: NotificationPermission | 'unsupported';
  requestPermission: () => Promise<boolean>;
}

export function usePushNotification(): UsePushNotificationReturn {
  const [permissionStatus, setPermissionStatus] = useState<
    NotificationPermission | 'unsupported'
  >('unsupported');

  const isSupported =
    typeof window !== 'undefined' &&
    'serviceWorker' in navigator &&
    'PushManager' in window &&
    'Notification' in window;

  useEffect(() => {
    if (isSupported) {
      setPermissionStatus(Notification.permission);
    }
  }, [isSupported]);

  const requestPermission = useCallback(async (): Promise<boolean> => {
    if (!isSupported || !VAPID_PUBLIC_KEY) {
      return false;
    }

    try {
      const permission = await Notification.requestPermission();
      setPermissionStatus(permission);

      if (permission !== 'granted') {
        return false;
      }

      // Get push subscription
      const subscription = await subscribeToPush(VAPID_PUBLIC_KEY);
      if (!subscription) {
        return false;
      }

      // Extract keys
      const key = subscription.getKey('p256dh');
      const auth = subscription.getKey('auth');

      if (!key || !auth) {
        return false;
      }

      const p256dh = btoa(String.fromCharCode(...new Uint8Array(key)));
      const authKey = btoa(String.fromCharCode(...new Uint8Array(auth)));

      // Register with backend
      await subscribePush({
        endpoint: subscription.endpoint,
        p256dh,
        auth: authKey,
      });

      return true;
    } catch (error) {
      console.error('Failed to request push permission:', error);
      return false;
    }
  }, [isSupported]);

  return {
    isSupported,
    permissionStatus,
    requestPermission,
  };
}
