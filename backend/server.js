import cors from "cors";
import express from "express";
import morgan from "morgan";
import path from "path";
import { connectDB } from "./config/db.js";
import { assertEnv, env, paymentMode } from "./config/env.js";
import { errorHandler, notFound } from "./middleware/errorHandler.js";
import adminRoutes from "./routes/adminRoutes.js";
import authRoutes from "./routes/authRoutes.js";
import bookingRoutes from "./routes/bookingRoutes.js";
import movieRoutes from "./routes/movieRoutes.js";
import paymentRoutes from "./routes/paymentRoutes.js";
import reviewRoutes from "./routes/reviewRoutes.js";
import showRoutes from "./routes/showRoutes.js";
import theatreRoutes from "./routes/theatreRoutes.js";
import userRoutes from "./routes/userRoutes.js";
import { expireStaleBookings } from "./utils/seatService.js";

assertEnv();

const app = express();

app.use(
  cors({
    origin: (origin, cb) => {
      // Allow tools like Postman / curl (no Origin header) and the configured frontends.
      if (!origin || env.CLIENT_URLS.includes(origin.replace(/\/$/, ""))) return cb(null, true);
      return cb(null, false);
    },
    credentials: true,
  })
);
app.use(express.json({ limit: "1mb" }));
app.use(express.urlencoded({ extended: true }));
if (env.NODE_ENV !== "test") app.use(morgan("dev"));

app.use("/uploads", express.static(path.join(process.cwd(), "uploads"), { maxAge: "7d" }));

app.get("/api/health", (_req, res) => res.json({ success: true, status: "ok", paymentMode: paymentMode(), time: new Date() }));
app.get("/", (_req, res) => res.json({ success: true, name: "Cinephile API", docs: "See API.md in the project root" }));

app.use("/api/auth", authRoutes);
app.use("/api/movies", movieRoutes);
app.use("/api/theatres", theatreRoutes);
app.use("/api/shows", showRoutes);
app.use("/api/bookings", bookingRoutes);
app.use("/api/payments", paymentRoutes);
app.use("/api/users", userRoutes);
app.use("/api/reviews", reviewRoutes);
app.use("/api/admin", adminRoutes);

app.use(notFound);
app.use(errorHandler);

async function start() {
  try {
    await connectDB();
  } catch {
    process.exit(1);
  }
  // Release seats from unpaid bookings whose hold has expired.
  setInterval(() => expireStaleBookings().catch((e) => console.error("[cleanup]", e.message)), 60 * 1000);

  app.listen(env.PORT, () => {
    console.log(`[api] Cinephile API running on http://localhost:${env.PORT}`);
    console.log(`[api] Payment mode: ${paymentMode()}  |  Allowed origins: ${env.CLIENT_URLS.join(", ")}`);
  });
}

start();

export default app;
