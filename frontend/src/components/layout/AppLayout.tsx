import { useState, useEffect } from 'react';
import { Outlet, Navigate } from 'react-router-dom';
import { useAuthStore } from '../../stores/authStore';
import { usePushNotification } from '../../hooks/usePushNotification';
import Sidebar from './Sidebar';
import NotificationBell from './NotificationBell';

const PUSH_BANNER_DISMISSED_KEY = 'push_banner_dismissed';
const INSTALL_BANNER_DISMISSED_KEY = 'install_banner_dismissed';

export default function AppLayout() {
  const { token, user, logout } = useAuthStore();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [bannerDismissed, setBannerDismissed] = useState(() => {
    return localStorage.getItem(PUSH_BANNER_DISMISSED_KEY) === 'true';
  });

  // PWA Install prompt state
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [installDismissed, setInstallDismissed] = useState(() => {
    return localStorage.getItem(INSTALL_BANNER_DISMISSED_KEY) === 'true';
  });

  // Update available state
  const [updateAvailable, setUpdateAvailable] = useState(false);

  const { isSupported, permissionStatus, requestPermission } =
    usePushNotification();

  const showPushBanner =
    isSupported && permissionStatus === 'default' && !bannerDismissed;

  // Listen for beforeinstallprompt
  useEffect(() => {
    const handler = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e);
    };
    window.addEventListener('beforeinstallprompt', handler);
    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, []);

  // Listen for service worker updates
  useEffect(() => {
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.ready.then((registration) => {
        registration.addEventListener('updatefound', () => {
          const newWorker = registration.installing;
          if (newWorker) {
            newWorker.addEventListener('statechange', () => {
              if (
                newWorker.state === 'installed' &&
                navigator.serviceWorker.controller
              ) {
                setUpdateAvailable(true);
              }
            });
          }
        });
      });
    }
  }, []);

  const handleDismissBanner = () => {
    setBannerDismissed(true);
    localStorage.setItem(PUSH_BANNER_DISMISSED_KEY, 'true');
  };

  const handleEnablePush = async () => {
    await requestPermission();
    handleDismissBanner();
  };

  const handleInstall = async () => {
    if (deferredPrompt) {
      deferredPrompt.prompt();
      await deferredPrompt.userChoice;
      setDeferredPrompt(null);
      setInstallDismissed(true);
      localStorage.setItem(INSTALL_BANNER_DISMISSED_KEY, 'true');
    }
  };

  const handleDismissInstall = () => {
    setInstallDismissed(true);
    localStorage.setItem(INSTALL_BANNER_DISMISSED_KEY, 'true');
  };

  const handleUpdate = () => {
    window.location.reload();
  };

  // Auth guard: redirect to login if no token
  if (!token) {
    return <Navigate to="/login" replace />;
  }

  return (
    <div className="min-h-screen flex bg-gray-50">
      <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      <div className="flex-1 flex flex-col min-w-0">
        {/* Update available banner */}
        {updateAvailable && (
          <div className="bg-green-600 text-white px-4 py-2 flex items-center justify-between text-sm">
            <span>Phien ban moi da san sang. Tai lai de cap nhat.</span>
            <button
              onClick={handleUpdate}
              className="bg-white text-green-600 px-3 py-1 rounded text-sm font-medium hover:bg-green-50"
            >
              Cap nhat
            </button>
          </div>
        )}

        {/* Install prompt banner */}
        {deferredPrompt && !installDismissed && (
          <div className="bg-indigo-600 text-white px-4 py-2 flex items-center justify-between text-sm">
            <span>Cai dat ung dung de truy cap nhanh hon.</span>
            <div className="flex items-center gap-2 ml-4">
              <button
                onClick={handleInstall}
                className="bg-white text-indigo-600 px-3 py-1 rounded text-sm font-medium hover:bg-indigo-50"
              >
                Cai dat
              </button>
              <button
                onClick={handleDismissInstall}
                className="text-indigo-100 hover:text-white"
                aria-label="Dismiss"
              >
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          </div>
        )}

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
