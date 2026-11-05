import { Router } from "express";
import { createShows, deleteShow, getShow, listShows, updateShow } from "../controllers/showController.js";
import { adminOnly, optionalAuth, protect } from "../middleware/auth.js";

const router = Router();
router.get("/", optionalAuth, listShows);
router.get("/:id", optionalAuth, getShow);
router.post("/", protect, adminOnly, createShows);
router.put("/:id", protect, adminOnly, updateShow);
router.delete("/:id", protect, adminOnly, deleteShow);
export default router;
