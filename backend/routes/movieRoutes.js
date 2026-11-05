import { Router } from "express";
import { createMovie, deleteMovie, getFilters, getMovie, listMovies, updateMovie } from "../controllers/movieController.js";
import { listReviews, upsertReview } from "../controllers/reviewController.js";
import { adminOnly, optionalAuth, protect } from "../middleware/auth.js";
import { uploadImages } from "../middleware/upload.js";

const router = Router();
const images = uploadImages.fields([{ name: "poster", maxCount: 1 }, { name: "backdrop", maxCount: 1 }]);

router.get("/", optionalAuth, listMovies);
router.get("/filters", getFilters);
router.get("/:idOrSlug", optionalAuth, getMovie);
router.post("/", protect, adminOnly, images, createMovie);
router.put("/:id", protect, adminOnly, images, updateMovie);
router.delete("/:id", protect, adminOnly, deleteMovie);

router.get("/:movieId/reviews", optionalAuth, listReviews);
router.post("/:movieId/reviews", protect, upsertReview);
export default router;
