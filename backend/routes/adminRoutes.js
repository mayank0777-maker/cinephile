import { Router } from "express";
import { getStats } from "../controllers/adminController.js";
import { adminOnly, protect } from "../middleware/auth.js";

const router = Router();
router.use(protect, adminOnly);
router.get("/stats", getStats);
export default router;
