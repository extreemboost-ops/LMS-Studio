import { Router } from "express";
import { OrganizationController } from "./organization.controller.js";
import { requireAuth } from "../../middlewares/auth.js";
import { validateRequest } from "../../middlewares/validateRequest.js";
import { createOrganizationSchema } from "./organization.schema.js";

const router = Router();

router.use(requireAuth);

router.get("/", OrganizationController.list);
router.post("/", validateRequest({ body: createOrganizationSchema }), OrganizationController.create);
router.get("/:organizationId", OrganizationController.getById);
router.post("/:organizationId/switch", OrganizationController.switch);

export const organizationRoutes = router;
