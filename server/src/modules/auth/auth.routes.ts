import { Router } from "express";
import { AuthController } from "./auth.controller.js";
import { validateRequest } from "../../middlewares/validateRequest.js";
import { requireAuth } from "../../middlewares/auth.js";
import {
  registerSchema,
  loginSchema,
  forgotPasswordSchema,
  resetPasswordSchema,
  verifyEmailSchema,
} from "./auth.schema.js";

const router = Router();

// Registration
router.post("/register", validateRequest({ body: registerSchema }), AuthController.register);

// Authentication & Session
router.post("/login", validateRequest({ body: loginSchema }), AuthController.login);
router.post("/refresh", AuthController.refresh);
router.post("/logout", AuthController.logout);
router.post("/logout-all", requireAuth, AuthController.logoutAll);

// Account Recovery & Verification
router.post("/forgot-password", validateRequest({ body: forgotPasswordSchema }), AuthController.forgotPassword);
router.post("/reset-password", validateRequest({ body: resetPasswordSchema }), AuthController.resetPassword);
router.post("/verify-email", validateRequest({ body: verifyEmailSchema }), AuthController.verifyEmail);

export const authRoutes = router;
