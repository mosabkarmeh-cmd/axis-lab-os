import { useCallback } from "react";
import { apiFetchJson } from "../lib/api";
import type { User } from "../types";

type AuthResponse = {
  token: string;
  user: User;
};

type AuthActionsOptions = {
  authEmail: string;
  authPassword: string;
  authFullName: string;
  authRole: "admin" | "employee" | "accountant";
  setToken: (token: string) => void;
  setCurrentUser: (user: User) => void;
  setAuthError: (error: string | null) => void;
  setIsAuthLoading: (loading: boolean) => void;
  setIsRegisterMode: (enabled: boolean) => void;
  setActivePreset: (preset: string) => void;
  setAuthEmail: (email: string) => void;
  setAuthPassword: (password: string) => void;
  setActiveView: (view: string) => void;
  addTerminalLog: (type: string, message: string) => void;
  fetchLogs: () => void;
};

function persistSession(data: AuthResponse) {
  localStorage.setItem("axislab_token", data.token);
  document.cookie = `axislab_token=${data.token}; path=/; max-age=${60 * 60 * 24}; SameSite=Lax`;
}

function routeUser(user: User, setActiveView: (view: string) => void) {
  if (user.role === "accountant") setActiveView("accounting");
  else if (user.role === "employee") setActiveView("production");
  else setActiveView("dashboard");
}

export function useAuthActions({
  authEmail,
  authPassword,
  authFullName,
  authRole,
  setToken,
  setCurrentUser,
  setAuthError,
  setIsAuthLoading,
  setIsRegisterMode,
  setActivePreset,
  setAuthEmail,
  setAuthPassword,
  setActiveView,
  addTerminalLog,
  fetchLogs,
}: AuthActionsOptions) {
  const applySession = useCallback((data: AuthResponse) => {
    persistSession(data);
    setToken(data.token);
    setCurrentUser(data.user);
    routeUser(data.user, setActiveView);
  }, [setActiveView, setCurrentUser, setToken]);

  const handleLogin = useCallback(async (event: React.FormEvent) => {
    event.preventDefault();
    setAuthError(null);
    setIsAuthLoading(true);
    try {
      const data = await apiFetchJson<AuthResponse>("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: authEmail, password: authPassword }),
      });
      applySession(data);
      addTerminalLog("JWT", `User '${data.user.fullName}' authenticated. Token issued.`);
      fetchLogs();
    } catch (error) {
      const message = error instanceof Error ? error.message : "Login Failed";
      setAuthError(message);
      addTerminalLog("ERROR", `Auth failed: ${message}`);
    } finally {
      setIsAuthLoading(false);
    }
  }, [addTerminalLog, applySession, authEmail, authPassword, fetchLogs, setAuthError, setIsAuthLoading]);

  const handleRegister = useCallback(async (event: React.FormEvent) => {
    event.preventDefault();
    setAuthError(null);
    if (!authFullName) {
      setAuthError("الرجاء إدخال الاسم الكامل");
      return;
    }
    setIsAuthLoading(true);
    try {
      const data = await apiFetchJson<AuthResponse>("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: authEmail, password: authPassword, fullName: authFullName, role: authRole }),
      });
      applySession(data);
      setIsRegisterMode(false);
      addTerminalLog("JWT", `New account registered: ${data.user.email} as ${data.user.role}`);
      fetchLogs();
    } catch (error) {
      const message = error instanceof Error ? error.message : "Registration Failed";
      setAuthError(message);
      addTerminalLog("ERROR", `Registration failed: ${message}`);
    } finally {
      setIsAuthLoading(false);
    }
  }, [addTerminalLog, applySession, authEmail, authFullName, authPassword, authRole, fetchLogs, setAuthError, setIsAuthLoading, setIsRegisterMode]);

  const setAuthPreset = useCallback((presetKey: string, email: string, password: string) => {
    setActivePreset(presetKey);
    setAuthEmail(email);
    setAuthPassword(password);
    setAuthError(null);
  }, [setActivePreset, setAuthEmail, setAuthError, setAuthPassword]);

  return { handleLogin, handleRegister, setAuthPreset };
}
