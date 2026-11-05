import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import toast from "react-hot-toast";
import { authApi, tokenStore, userApi } from "../services/api";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [ready, setReady] = useState(false); // true once the stored session was checked

  const loadMe = useCallback(async () => {
    if (!tokenStore.get()) {
      setUser(null);
      setReady(true);
      return;
    }
    try {
      const res = await authApi.me();
      setUser(res.user);
    } catch {
      tokenStore.set(null);
      setUser(null);
    } finally {
      setReady(true);
    }
  }, []);

  useEffect(() => {
    loadMe();
    const onLogout = () => setUser(null);
    window.addEventListener("cinephile:logout", onLogout);
    return () => window.removeEventListener("cinephile:logout", onLogout);
  }, [loadMe]);

  const login = async (email, password) => {
    const res = await authApi.login({ email, password });
    tokenStore.set(res.token);
    setUser(res.user);
    toast.success(`Welcome back, ${res.user.name.split(" ")[0]}!`);
    return res.user;
  };

  const register = async (data) => {
    const res = await authApi.register(data);
    tokenStore.set(res.token);
    setUser(res.user);
    toast.success("Your Cinephile account is ready 🎬");
    return res.user;
  };

  const logout = () => {
    tokenStore.set(null);
    setUser(null);
    toast.success("Logged out");
  };

  const updateUser = (u) => setUser((prev) => ({ ...prev, ...u }));

  const inWatchlist = (movieId) => Boolean(user?.watchlist?.some((id) => String(id) === String(movieId)));

  const toggleWatchlist = async (movieId) => {
    if (!user) {
      toast.error("Log in to save movies to your watchlist");
      return false;
    }
    const has = inWatchlist(movieId);
    try {
      if (has) await userApi.removeWatch(movieId);
      else await userApi.addWatch(movieId);
      setUser((u) => ({ ...u, watchlist: has ? u.watchlist.filter((id) => String(id) !== String(movieId)) : [...(u.watchlist || []), movieId] }));
      toast.success(has ? "Removed from watchlist" : "Added to watchlist");
      return !has;
    } catch (e) {
      toast.error(e.message);
      return has;
    }
  };

  const value = useMemo(
    () => ({ user, ready, login, register, logout, updateUser, reload: loadMe, inWatchlist, toggleWatchlist }),
    [user, ready] // eslint-disable-line react-hooks/exhaustive-deps
  );
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export const useAuth = () => useContext(AuthContext);
