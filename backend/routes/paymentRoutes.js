import { Router } from "express";
import { completeDemoPayment, createOrder, getPaymentConfig, reportFailure, verifyPayment } from "../controllers/paymentController.js";
import { protect } from "../middleware/auth.js";

const router = Router();
router.get("/config", getPaymentConfig);
router.post("/order", protect, createOrder);
router.post("/verify", protect, verifyPayment);
router.post("/failed", protect, reportFailure);
router.post("/demo/complete", protect, completeDemoPayment);
export default router;
