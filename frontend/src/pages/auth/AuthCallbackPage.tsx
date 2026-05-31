import { useEffect, useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import { googleAuth } from '../../api/auth';
import { useAuthStore } from '../../stores/authStore';

export default function AuthCallbackPage() {
  const navigate = useNavigate();
  const { setAuth } = useAuthStore();
  const [error, setError] = useState('');
  // Prevent double execution in React StrictMode
  const isProcessing = useRef(false);

  useEffect(() => {
    const handleCallback = async () => {
      // Guard against double invocation
      if (isProcessing.current) return;
      isProcessing.current = true;

      try {
        // Supabase automatically parses the hash/params from the URL
        const { data, error: sessionError } = await supabase.auth.getSession();

        if (sessionError) {
          throw sessionError;
        }

        if (!data.session) {
          throw new Error('No session found');
        }

        const accessToken = data.session.access_token;
        const user = data.session.user;
        const fullName =
          user.user_metadata?.full_name ||
          user.user_metadata?.name ||
          null;

        // Call backend to ensure profile/org exists
        const response = await googleAuth({
          access_token: accessToken,
          full_name: fullName,
        });

        const { access_token: token, user: userData, needs_org_setup: needsOrgSetup } = response.data;
        setAuth(userData, token);

        if (needsOrgSetup) {
          navigate('/organization-setup', { replace: true });
        } else {
          navigate('/dashboard', { replace: true });
        }
      } catch (err: unknown) {
        const errorObj = err as { message?: string };
        setError(errorObj?.message || 'Authentication failed. Please try again.');
        setTimeout(() => {
          navigate('/login', { replace: true });
        }, 3000);
      }
    };

    handleCallback();
  }, [navigate, setAuth]);

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="max-w-md w-full p-6 text-center">
          <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-700 rounded-md text-sm">
            {error}
          </div>
          <p className="text-sm text-gray-600">Redirecting to login...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="max-w-md w-full p-6 text-center">
        <svg
          className="animate-spin h-8 w-8 text-primary-600 mx-auto mb-4"
          xmlns="http://www.w3.org/2000/svg"
          fill="none"
          viewBox="0 0 24 24"
        >
          <circle
            className="opacity-25"
            cx="12"
            cy="12"
            r="10"
            stroke="currentColor"
            strokeWidth="4"
          />
          <path
            className="opacity-75"
            fill="currentColor"
            d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
          />
        </svg>
        <p className="text-gray-600">Completing sign-in...</p>
      </div>
    </div>
  );
}
