import axios from "axios";

export const API_URL = (import.meta.env.VITE_API_URL || "http://localhost:5000").replace(/\/$/, "");
const TOKEN_KEY = "cinephile_token";

export const tokenStore = {
  get: () => {
    try { return localStorage.getItem(TOKEN_KEY); } catch { return null; }
  },
  set: (t) => {
    try { t ? localStorage.setItem(TOKEN_KEY, t) : localStorage.removeItem(TOKEN_KEY); } catch { /* private mode */ }
  },
};

const api = axios.create({ baseURL: `${API_URL}/api`, timeout: 20000 });

api.interceptors.request.use((config) => {
  const t = tokenStore.get();
  if (t) config.headers.Authorization = `Bearer ${t}`;
  return config;
});

// Normalises every error into { message, status, details } so UI code can show it directly.
api.interceptors.response.use(
  (res) => res.data,
  (err) => {
    const status = err.response?.status || 0;
    const message =
      err.response?.data?.message ||
      (err.code === "ECONNABORTED" ? "The server took too long to respond" : !err.response ? "Cannot reach the server. Is the backend running?" : "Something went wrong");
    if (status === 401 && tokenStore.get()) {
      tokenStore.set(null);
      window.dispatchEvent(new Event("cinephile:logout"));
    }
    return Promise.reject({ message, status, details: err.response?.data?.details });
  }
);

export default api;

/* ---------------- endpoint helpers ---------------- */
export const authApi = {
  login: (body) => api.post("/auth/login", body),
  register: (body) => api.post("/auth/register", body),
  me: () => api.get("/auth/me"),
  update: (body) => api.put("/auth/me", body),
  changePassword: (body) => api.put("/auth/password", body),
};

export const movieApi = {
  list: (params) => api.get("/movies", { params }),
  filters: () => api.get("/movies/filters"),
  get: (idOrSlug) => api.get(`/movies/${idOrSlug}`),
  reviews: (id, params) => api.get(`/movies/${id}/reviews`, { params }),
  review: (id, body) => api.post(`/movies/${id}/reviews`, body),
  deleteReview: (reviewId) => api.delete(`/reviews/${reviewId}`),
};

export const theatreApi = {
  list: (params) => api.get("/theatres", { params }),
  cities: () => api.get("/theatres/cities"),
};

export const showApi = {
  list: (params) => api.get("/shows", { params }),
  get: (id) => api.get(`/shows/${id}`),
};

export const bookingApi = {
  create: (body) => api.post("/bookings", body),
  mine: (type) => api.get("/bookings/my", { params: { type } }),
  get: (id) => api.get(`/bookings/${id}`),
  cancel: (id, reason) => api.post(`/bookings/${id}/cancel`, { reason }),
  release: (id) => api.post(`/bookings/${id}/release`),
};

export const paymentApi = {
  config: () => api.get("/payments/config"),
  order: (bookingId) => api.post("/payments/order", { bookingId }),
  verify: (body) => api.post("/payments/verify", body),
  failed: (body) => api.post("/payments/failed", body),
  demoComplete: (orderId, details = {}) => api.post("/payments/demo/complete", { orderId, method: details.method, methodLabel: details.label }),
};

export const userApi = {
  watchlist: () => api.get("/users/watchlist"),
  addWatch: (movieId) => api.post(`/users/watchlist/${movieId}`),
  removeWatch: (movieId) => api.delete(`/users/watchlist/${movieId}`),
};
