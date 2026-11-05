import { Navigate, Route, Routes } from "react-router-dom";
import Layout from "./components/Layout";
import { PageLoader } from "./components/ui";
import { useAdmin } from "./context/AuthContext";
import Bookings from "./pages/Bookings";
import Dashboard from "./pages/Dashboard";
import Login from "./pages/Login";
import Movies from "./pages/Movies";
import Shows from "./pages/Shows";
import Theatres from "./pages/Theatres";
import Users from "./pages/Users";

// Every admin route requires a logged-in user with role "admin" (also enforced by the API).
function RequireAdmin({ children }) {
  const { admin, ready } = useAdmin();
  if (!ready) return <PageLoader label="Checking session…" />;
  if (!admin) return <Navigate to="/login" replace />;
  return children;
}

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route element={<RequireAdmin><Layout /></RequireAdmin>}>
        <Route path="/" element={<Dashboard />} />
        <Route path="/movies" element={<Movies />} />
        <Route path="/theatres" element={<Theatres />} />
        <Route path="/shows" element={<Shows />} />
        <Route path="/bookings" element={<Bookings />} />
        <Route path="/users" element={<Users />} />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
