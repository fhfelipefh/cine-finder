import { useCallback, useEffect, useMemo, useState } from "react";
import PropTypes from "prop-types";
import {
  clearStoredAuthToken,
  deleteAccount as deleteAccountRequest,
  fetchProfile,
  getStoredAuthToken,
  loginUser,
  registerUser,
  setStoredAuthToken,
  updatePassword as updatePasswordRequest,
  updateProfile as updateProfileRequest,
} from "../api/api";
import { AuthCtx } from "./AuthContext";
import AuthModal from "./AuthModal";
import AccountModal from "./AccountModal";

export function AuthProvider({ children }) {
  const [token, setToken] = useState(() => getStoredAuthToken());
  const [user, setUser] = useState(null);
  const [initializing, setInitializing] = useState(Boolean(token));
  const [authModal, setAuthModal] = useState({ open: false, mode: "login" });
  const [accountModalOpen, setAccountModalOpen] = useState(false);

  useEffect(() => {
    if (!token) {
      setUser(null);
      setInitializing(false);
      return;
    }
    let active = true;
    setInitializing(true);
    (async () => {
      try {
        const profile = await fetchProfile();
        if (active) setUser(profile);
      } catch {
        clearStoredAuthToken();
        if (active) {
          setToken(null);
          setUser(null);
        }
      } finally {
        if (active) setInitializing(false);
      }
    })();
    return () => {
      active = false;
    };
  }, [token]);

  const logout = useCallback(() => {
    clearStoredAuthToken();
    setToken(null);
    setUser(null);
  }, []);

  const handleLogin = useCallback(async (credentials) => {
    const result = await loginUser(credentials);
    const nextToken = result?.token;
    if (!nextToken) throw new Error("Token não retornado pelo servidor.");
    setStoredAuthToken(nextToken);
    setToken(nextToken);
    const profile = result?.user || (await fetchProfile());
    setUser(profile);
    return profile;
  }, []);

  const handleRegister = useCallback(async (payload) => {
    const result = await registerUser(payload);
    const nextToken = result?.token;
    if (!nextToken) throw new Error("Token não retornado pelo servidor.");
    setStoredAuthToken(nextToken);
    setToken(nextToken);
    const profile = result?.user || (await fetchProfile());
    setUser(profile);
    return profile;
  }, []);

  const refreshProfile = useCallback(async () => {
    if (!token) return null;
    const profile = await fetchProfile();
    setUser(profile);
    return profile;
  }, [token]);

  const updateProfile = useCallback(async (updates) => {
    const updated = await updateProfileRequest(updates);
    setUser(updated);
    return updated;
  }, []);

  const updatePassword = useCallback(async (payload) => {
    await updatePasswordRequest(payload);
  }, []);

  const deleteAccount = useCallback(async () => {
    await deleteAccountRequest();
    logout();
  }, [logout]);

  const openAuthModal = useCallback(
    (mode = "login") => setAuthModal({ open: true, mode }),
    []
  );
  const closeAuthModal = useCallback(
    () => setAuthModal((prev) => ({ ...prev, open: false })),
    []
  );
  const openAccountModal = useCallback(() => setAccountModalOpen(true), []);
  const closeAccountModal = useCallback(
    () => setAccountModalOpen(false),
    []
  );

  const isAuthenticated = Boolean(token && user);

  const requireAuth = useCallback(
    (mode = "login") => {
      if (isAuthenticated) return true;
      openAuthModal(mode);
      return false;
    },
    [isAuthenticated, openAuthModal]
  );

  const value = useMemo(
    () => ({
      user,
      token,
      loading: initializing,
      isAuthenticated,
      login: handleLogin,
      register: handleRegister,
      logout,
      refreshProfile,
      updateProfile,
      updatePassword,
      deleteAccount,
      openAuthModal,
      closeAuthModal,
      openAccountModal,
      closeAccountModal,
      requireAuth,
    }),
    [
      user,
      token,
      initializing,
      isAuthenticated,
      handleLogin,
      handleRegister,
      logout,
      refreshProfile,
      updateProfile,
      updatePassword,
      deleteAccount,
      openAuthModal,
      closeAuthModal,
      openAccountModal,
      closeAccountModal,
      requireAuth,
    ]
  );

  return (
    <AuthCtx.Provider value={value}>
      {children}
      <AuthModal
        show={authModal.open}
        mode={authModal.mode}
        onHide={closeAuthModal}
        onLogin={handleLogin}
        onRegister={handleRegister}
      />
      <AccountModal show={accountModalOpen} onHide={closeAccountModal} />
    </AuthCtx.Provider>
  );
}

AuthProvider.propTypes = {
  children: PropTypes.node.isRequired,
};
