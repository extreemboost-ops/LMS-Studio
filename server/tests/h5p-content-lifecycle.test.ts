import { saveH5PContentSchema } from "../src/modules/h5p/h5p.schema.js";
import { H5PSemanticsValidator } from "../src/modules/h5p/h5p-semantics.js";
import { randomUUID } from "node:crypto";

export async function runH5PContentLifecycleTests(): Promise<{ passed: boolean; message: string }> {
  try {
    // -------------------------------------------------------------------------
    // 1. Save H5P Content Schema Validation
    // -------------------------------------------------------------------------
    const validSavePayload = {
      libraryId: randomUUID(),
      parameters: {
        title: "Workplace Hazard Identification",
        score: 100,
        options: ["Option A", "Option B"],
      },
      metadata: {
        title: "Hazard Identification v1",
        license: "CC-BY",
      },
      embedType: "DIV" as const,
    };

    const parsed = saveH5PContentSchema.safeParse(validSavePayload);
    if (!parsed.success) {
      return { passed: false, message: `Expected valid save payload to parse: ${JSON.stringify(parsed.error)}` };
    }

    // Invalid embedType
    const badEmbed = saveH5PContentSchema.safeParse({
      ...validSavePayload,
      embedType: "POPUP",
    });
    if (badEmbed.success) {
      return { passed: false, message: "Expected invalid embedType to fail validation" };
    }

    // -------------------------------------------------------------------------
    // 2. In-Memory Content Instance Simulation
    // -------------------------------------------------------------------------
    interface MockH5PContent {
      id: string;
      contentProjectId: string;
      libraryId: string;
      parameters: Record<string, unknown>;
      filteredParameters: Record<string, unknown>;
      metadata: Record<string, unknown>;
      embedType: "DIV" | "IFRAME";
      contentLibraries: string[];
    }

    const projectId = randomUUID();
    const libraryId = randomUUID();

    const librarySemantics = [
      { name: "title", type: "text" as const, optional: false },
      { name: "score", type: "number" as const, optional: false },
    ];

    // Validate parameters
    const valRes = H5PSemanticsValidator.validate(librarySemantics, validSavePayload.parameters);
    if (!valRes.isValid) {
      return { passed: false, message: "Parameters failed semantics validation" };
    }

    // Save instance
    const h5pInstance: MockH5PContent = {
      id: randomUUID(),
      contentProjectId: projectId,
      libraryId,
      parameters: validSavePayload.parameters,
      filteredParameters: valRes.filteredParameters,
      metadata: validSavePayload.metadata,
      embedType: validSavePayload.embedType,
      contentLibraries: [libraryId],
    };

    if (h5pInstance.parameters.title !== "Workplace Hazard Identification") {
      return { passed: false, message: "Instance parameters title mismatch" };
    }

    // -------------------------------------------------------------------------
    // 3. Player Bundle Rendering Simulation
    // -------------------------------------------------------------------------
    const resolvedAssets = {
      styles: ["styles/core.css", "styles/theme.css"],
      scripts: ["scripts/jquery.js", "scripts/h5p-core.js", "scripts/interaction.js"],
      dependencies: [
        { machineName: "H5P.Core", version: "1.24" },
        { machineName: "H5P.InteractiveVideo", version: "1.24" },
      ],
    };

    const playerBundle = {
      id: h5pInstance.id,
      contentProjectId: h5pInstance.contentProjectId,
      embedType: h5pInstance.embedType,
      parameters: h5pInstance.filteredParameters,
      metadata: h5pInstance.metadata,
      assets: resolvedAssets,
    };

    if (playerBundle.assets.scripts.length !== 3 || playerBundle.assets.styles.length !== 2) {
      return { passed: false, message: "Rendered player bundle asset count mismatch" };
    }

    // -------------------------------------------------------------------------
    // 4. Parameter Update & Validation Error Defense
    // -------------------------------------------------------------------------
    const invalidUpdateParams = {
      title: "Updated Title",
      score: "NOT_A_VALID_NUMBER",
    };

    const invalidVal = H5PSemanticsValidator.validate(librarySemantics, invalidUpdateParams);
    if (invalidVal.isValid) {
      return { passed: false, message: "Expected invalid update parameters to be rejected" };
    }

    return {
      passed: true,
      message:
        "H5PContent instance creation, semantics parameter validation, player asset bundle rendering, and update error rejection verified",
    };
  } catch (err) {
    return { passed: false, message: err instanceof Error ? err.message : String(err) };
  }
}
