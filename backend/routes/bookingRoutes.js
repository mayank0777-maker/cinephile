import { Router } from "express";
import {
  adminUpdateStatus,
  cancelBooking,
  createBooking,
  getBooking,
  listAllBookings,
  myBookings,
  releaseBooking,
} from "../controllers/bookingController.js";
import { adminOnly, protect } from "../middleware/auth.js";

const router = Router();
router.use(protect);
router.post("/", createBooking);
router.get("/my", myBookings);
router.get("/", adminOnly, listAllBookings);
router.get("/:id", getBooking);
router.post("/:id/cancel", cancelBooking);
router.post("/:id/release", releaseBooking);
router.patch("/:id/status", adminOnly, adminUpdateStatus);
export default router;
