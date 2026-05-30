import { useState } from 'react';
import { Outlet, Navigate } from 'react-router-dom';
import { useAuthStore } from '../../stores/authStore';
import { usePushNotification } from '../../hooks/usePushNotification';
import Sidebar from './Sidebar';
import NotificationBell from './NotificationBell';

const PUSH_BANNER_DISMISSED_KEY = 'push_banner_dismissed';

export default function AppLayout() {
  const { token, user, logout } = useAuthStore();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [bannerDismissed, setBannerDismissed] = useState(() => {
    return localStorage.getItem(PUSH_BANNER_DISMISSED_KEY) === 'true';
  });

  const { isSupported, permissionStatus, requestPermission } =
    usePushNotification();

  const showPushBanner =
    isSupported && permissionStatus === 'default' && !bannerDismissed;

  const handleDismissBanner = () => {
    setBannerDismissed(true);
    localStorage.setItem(PUSH_BANNER_DISMISSED_KEY, 'true');
  };

  const handleEnablePush = async () => {
    await requestPermission();
    handleDismissBanner();
  };

  // Auth guard: redirect to login if no token
  if (!token) {
    return <Navigate to="/login" replace />;
  }

  return (
    <div className="min-h-screen flex bg-gray-50">
      <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      <div className="flex-1 flex flex-col min-w-0">
        {/* Push notification banner */}
        {showPushBanner && (
          <div className="bg-blue-600 text-white px-4 py-2 flex items-center justify-between text-sm">
            <span>Enable notifications to get payment reminders and updates.</span>
            <div className="flex items-center gap-2 ml-4">
              <button
                onClick={handleEnablePush}
                className="bg-white text-blue-600 px-3 py-1 rounded text-sm font-medium hover:bg-blue-50"
              >
                Enable
              </button>
              <button
                onClick={handleDismissBanner}
                className="text-blue-100 hover:text-white"
                aria-label="Dismiss"
              >
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          </div>
        )}

        {/* Header */}
        <header className="bg-white shadow-sm border-b px-4 py-3 flex items-center justify-between">
          <button
            onClick={() => setSidebarOpen(true)}
            className="md:hidden p-2 rounded-md text-gray-600 hover:bg-gray-100"
            aria-label="Open menu"
          >
            <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </button>

          <div className="flex items-center gap-3 ml-auto">
            <NotificationBell />
            <div className="text-right">
              <p className="text-sm font-medium text-gray-900">{user?.full_name || user?.email}</p>
              <p className="text-xs text-gray-500 capitalize">{user?.role}</p>
            </div>
            <button
              onClick={() => {
                logout();
                window.location.href = '/login';
              }}
              className="text-sm text-gray-600 hover:text-red-600 px-2 py-1 rounded"
            >
              Logout
            </button>
          </div>
        </header>

        {/* Main content */}
        <main className="flex-1 p-4 md:p-6 overflow-auto">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
