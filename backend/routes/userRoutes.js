import { Router } from "express";
import { addToWatchlist, deleteUser, getWatchlist, listUsers, removeFromWatchlist, updateUser } from "../controllers/userController.js";
import { adminOnly, protect } from "../middleware/auth.js";

const router = Router();
router.use(protect);
router.get("/watchlist", getWatchlist);
router.post("/watchlist/:movieId", addToWatchlist);
router.delete("/watchlist/:movieId", removeFromWatchlist);

router.get("/", adminOnly, listUsers);
router.patch("/:id", adminOnly, updateUser);
router.delete("/:id", adminOnly, deleteUser);
export default router;
