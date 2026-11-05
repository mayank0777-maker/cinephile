import { Router } from "express";
import { deleteReview } from "../controllers/reviewController.js";
import { protect } from "../middleware/auth.js";

const router = Router();
router.delete("/:id", protect, deleteReview);
export default router;
