import { useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../stores/authStore';
import * as authApi from '../api/auth';

export function useAuth() {
  const { user, token, setAuth, logout: storeLogout, isAuthenticated } = useAuthStore();
  const navigate = useNavigate();

  const loginFn = useCallback(
    async (data: authApi.LoginData) => {
      const response = await authApi.login(data);
      const { access_token, user: userData } = response.data;
      setAuth(userData, access_token);
      navigate('/dashboard');
    },
    [setAuth, navigate],
  );

  const registerFn = useCallback(
    async (data: authApi.RegisterOwnerData) => {
      const response = await authApi.registerOwner(data);
      const { access_token, user: userData } = response.data;
      setAuth(userData, access_token);
      navigate('/dashboard');
    },
    [setAuth, navigate],
  );

  const logoutFn = useCallback(async () => {
    try {
      await authApi.logout();
    } catch {
      // Ignore errors on logout
    }
    storeLogout();
    navigate('/login');
  }, [storeLogout, navigate]);

  const acceptInviteFn = useCallback(
    async (data: authApi.AcceptInviteData) => {
      const response = await authApi.acceptInvite(data);
      const { access_token, user: userData } = response.data;
      setAuth(userData, access_token);
      navigate('/dashboard');
    },
    [setAuth, navigate],
  );

  return {
    user,
    token,
    isAuthenticated: isAuthenticated(),
    login: loginFn,
    register: registerFn,
    logout: logoutFn,
    acceptInvite: acceptInviteFn,
  };
}
