import { createContext, useContext, useEffect, useState } from "react";
import toast from "react-hot-toast";
import { adminApi, tokenStore } from "../services/api";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [admin, setAdmin] = useState(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const check = async () => {
      if (!tokenStore.get()) return setReady(true);
      try {
        const { user } = await adminApi.me();
        if (user.role !== "admin") throw new Error("not admin");
        setAdmin(user);
      } catch {
        tokenStore.set(null);
      } finally {
        setReady(true);
      }
    };
    check();
    const onLogout = () => setAdmin(null);
    window.addEventListener("cinephile-admin:logout", onLogout);
    return () => window.removeEventListener("cinephile-admin:logout", onLogout);
  }, []);

  const login = async (email, password) => {
    const res = await adminApi.login(email, password); // server rejects non-admins (403)
    tokenStore.set(res.token);
    setAdmin(res.user);
    toast.success("Welcome to the control room");
  };
  const logout = () => {
    tokenStore.set(null);
    setAdmin(null);
  };

  return <AuthContext.Provider value={{ admin, ready, login, logout }}>{children}</AuthContext.Provider>;
}

export const useAdmin = () => useContext(AuthContext);
