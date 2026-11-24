import { Router } from "express";
import { UserController } from "./user.controller.js";
import { requireAuth } from "../../middlewares/auth.js";

const router = Router();

router.use(requireAuth);

router.get("/me", UserController.getMe);
router.patch("/me", UserController.updateMe);

export const userRoutes = router;
