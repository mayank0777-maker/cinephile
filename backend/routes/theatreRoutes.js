import { Router } from "express";
import { createTheatre, deleteTheatre, getTheatre, listCities, listTheatres, updateTheatre } from "../controllers/theatreController.js";
import { adminOnly, optionalAuth, protect } from "../middleware/auth.js";

const router = Router();
router.get("/", optionalAuth, listTheatres);
router.get("/cities", listCities);
router.get("/:id", getTheatre);
router.post("/", protect, adminOnly, createTheatre);
router.put("/:id", protect, adminOnly, updateTheatre);
router.delete("/:id", protect, adminOnly, deleteTheatre);
export default router;
