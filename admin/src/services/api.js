import axios from "axios";

export const API_URL = (import.meta.env.VITE_API_URL || "http://localhost:5000").replace(/\/$/, "");
const TOKEN_KEY = "cinephile_admin_token";

export const tokenStore = {
  get: () => {
    try { return localStorage.getItem(TOKEN_KEY); } catch { return null; }
  },
  set: (t) => {
    try { t ? localStorage.setItem(TOKEN_KEY, t) : localStorage.removeItem(TOKEN_KEY); } catch { /* ignore */ }
  },
};

const api = axios.create({ baseURL: `${API_URL}/api`, timeout: 30000 });

api.interceptors.request.use((config) => {
  const t = tokenStore.get();
  if (t) config.headers.Authorization = `Bearer ${t}`;
  return config;
});

api.interceptors.response.use(
  (res) => res.data,
  (err) => {
    const status = err.response?.status || 0;
    const message = err.response?.data?.message || (!err.response ? "Cannot reach the API server. Is the backend running?" : "Request failed");
    // Any 401 means the session is gone; a 403 on a blocked account or lost admin role also ends it.
    if (tokenStore.get() && (status === 401 || (status === 403 && /blocked|permission/i.test(message)))) {
      tokenStore.set(null);
      window.dispatchEvent(new Event("cinephile-admin:logout"));
    }
    return Promise.reject({ message, status, details: err.response?.data?.details });
  }
);

export default api;

export const adminApi = {
  login: (email, password) => api.post("/auth/login", { email, password, adminOnly: true }),
  me: () => api.get("/auth/me"),
  stats: () => api.get("/admin/stats"),

  movies: (params) => api.get("/movies", { params: { all: true, limit: 100, ...params } }),
  createMovie: (form) => api.post("/movies", form),
  updateMovie: (id, form) => api.put(`/movies/${id}`, form),
  deleteMovie: (id) => api.delete(`/movies/${id}`),
  movie: (id) => api.get(`/movies/${id}`),

  theatres: (params) => api.get("/theatres", { params: { all: true, ...params } }),
  createTheatre: (body) => api.post("/theatres", body),
  updateTheatre: (id, body) => api.put(`/theatres/${id}`, body),
  deleteTheatre: (id) => api.delete(`/theatres/${id}`),

  shows: (params) => api.get("/shows", { params }),
  createShows: (body) => api.post("/shows", body),
  updateShow: (id, body) => api.put(`/shows/${id}`, body),
  deleteShow: (id) => api.delete(`/shows/${id}`),

  bookings: (params) => api.get("/bookings", { params }),
  booking: (id) => api.get(`/bookings/${id}`),
  setBookingStatus: (id, status, reason) => api.patch(`/bookings/${id}/status`, { status, reason }),

  users: (params) => api.get("/users", { params }),
  updateUser: (id, body) => api.patch(`/users/${id}`, body),
  deleteUser: (id) => api.delete(`/users/${id}`),
};
