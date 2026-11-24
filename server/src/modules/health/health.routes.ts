import { Router } from "express";
import { HealthController } from "./health.controller.js";

const router = Router();

// GET /api/v1/health - Overall service health
router.get("/", HealthController.getHealth);

// GET /api/v1/health/database - Real PostgreSQL connection check
router.get("/database", HealthController.getDatabaseHealth);

// GET /api/v1/health/readiness - Container / orchestrator readiness probe
router.get("/readiness", HealthController.getReadiness);

export const healthRoutes = router;
