import { Clapperboard } from "lucide-react";
import { useEffect } from "react";
import { Link, Route, Routes, useLocation } from "react-router-dom";
import CityPicker from "./components/CityPicker";
import Footer from "./components/Footer";
import Navbar from "./components/Navbar";
import ProtectedRoute from "./components/ProtectedRoute";
import { EmptyState } from "./components/ui";
import Account from "./pages/Account";
import { Login, Register } from "./pages/Auth";
import BookingDetails from "./pages/BookingDetails";
import Checkout from "./pages/Checkout";
import Home from "./pages/Home";
import MovieDetails from "./pages/MovieDetails";
import Movies from "./pages/Movies";
import SeatSelection from "./pages/SeatSelection";
import ShowTimes from "./pages/ShowTimes";
import Theatres from "./pages/Theatres";

function ScrollToTop() {
  const { pathname } = useLocation();
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [pathname]);
  return null;
}

function NotFound() {
  return (
    <div className="container-x pt-16">
      <EmptyState icon={Clapperboard} title="Scene not found" message="The page you're looking for doesn't exist or has moved." action={<Link to="/" className="btn-primary btn-sm">Back to home</Link>} />
    </div>
  );
}

export default function App() {
  return (
    <div className="flex min-h-screen flex-col">
      <ScrollToTop />
      <Navbar />
      <main className="flex-1">
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/movies" element={<Movies />} />
          <Route path="/movie/:slug" element={<MovieDetails />} />
          <Route path="/movie/:slug/shows" element={<ShowTimes />} />
          <Route path="/theatres" element={<Theatres />} />
          <Route path="/show/:id" element={<SeatSelection />} />
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route path="/checkout/:bookingId" element={<ProtectedRoute><Checkout /></ProtectedRoute>} />
          <Route path="/booking/:id" element={<ProtectedRoute><BookingDetails /></ProtectedRoute>} />
          <Route path="/account" element={<ProtectedRoute><Account /></ProtectedRoute>} />
          <Route path="/account/:tab" element={<ProtectedRoute><Account /></ProtectedRoute>} />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </main>
      <Footer />
      <CityPicker />
    </div>
  );
}
