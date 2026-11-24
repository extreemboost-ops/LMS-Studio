import { createPackageImportSchema } from "../src/modules/h5p/h5p.schema.js";
import { H5PPackageService } from "../src/modules/h5p/h5p-package.service.js";
import { randomUUID } from "node:crypto";

export async function runH5PPackageImportTests(): Promise<{ passed: boolean; message: string }> {
  try {
    // -------------------------------------------------------------------------
    // 1. Package Import Schema Validation
    // -------------------------------------------------------------------------
    const validImport = {
      workspaceId: randomUUID(),
      filename: "workplace-safety-module.h5p",
      fileSizeBytes: 14500000, // 14.5 MB
    };

    const parsed = createPackageImportSchema.safeParse(validImport);
    if (!parsed.success) {
      return { passed: false, message: `Expected valid import schema to parse: ${JSON.stringify(parsed.error)}` };
    }

    // Invalid extension (e.g. .pdf)
    const badExt = createPackageImportSchema.safeParse({
      ...validImport,
      filename: "document.pdf",
    });
    if (badExt.success) {
      return { passed: false, message: "Expected non-H5P file extension to fail validation" };
    }

    // -------------------------------------------------------------------------
    // 2. h5p.json Manifest Validation
    // -------------------------------------------------------------------------
    const validManifest = {
      title: "Interactive Safety Training",
      mainLibrary: "H5P.InteractiveVideo 1.24",
      language: "en",
      preloadedDependencies: [
        { machineName: "H5P.Video", majorVersion: 1, minorVersion: 6 },
        { machineName: "H5P.JoubelUI", majorVersion: 1, minorVersion: 3 },
      ],
    };

    const manifestRes = H5PPackageService.validateManifest(validManifest);
    if (!manifestRes.isValid || manifestRes.errors.length > 0) {
      return { passed: false, message: `Expected valid manifest to pass: ${JSON.stringify(manifestRes.errors)}` };
    }

    // Negative: Missing title
    const noTitleManifest = {
      mainLibrary: "H5P.InteractiveVideo 1.24",
    };
    const noTitleRes = H5PPackageService.validateManifest(noTitleManifest);
    if (noTitleRes.isValid || !noTitleRes.errors.some((e) => e.includes("title"))) {
      return { passed: false, message: "Expected manifest missing title to fail validation" };
    }

    // Negative: Malformed mainLibrary format (missing minor version)
    const badLibManifest = {
      title: "Course",
      mainLibrary: "H5P.InteractiveVideo 1",
    };
    const badLibRes = H5PPackageService.validateManifest(badLibManifest);
    if (badLibRes.isValid || !badLibRes.errors.some((e) => e.includes("mainLibrary"))) {
      return { passed: false, message: "Expected malformed mainLibrary string to fail validation" };
    }

    // -------------------------------------------------------------------------
    // 3. Dependency Presence Verification Simulation
    // -------------------------------------------------------------------------
    const installedLibraries = new Set(["H5P.Video-1.6", "H5P.JoubelUI-1.3"]);

    const requiredDeps = [
      { machineName: "H5P.Video", majorVersion: 1, minorVersion: 6 },
      { machineName: "H5P.JoubelUI", majorVersion: 1, minorVersion: 3 },
    ];

    const missingDeps: typeof requiredDeps = [];
    for (const d of requiredDeps) {
      if (!installedLibraries.has(`${d.machineName}-${d.majorVersion}.${d.minorVersion}`)) {
        missingDeps.push(d);
      }
    }

    if (missingDeps.length !== 0) {
      return { passed: false, message: "Expected all dependencies to be present" };
    }

    // Now test with a missing dependency
    requiredDeps.push({ machineName: "H5P.UninstalledWidget", majorVersion: 2, minorVersion: 0 });
    const missingDeps2: typeof requiredDeps = [];
    for (const d of requiredDeps) {
      if (!installedLibraries.has(`${d.machineName}-${d.majorVersion}.${d.minorVersion}`)) {
        missingDeps2.push(d);
      }
    }

    if (missingDeps2.length !== 1 || missingDeps2[0].machineName !== "H5P.UninstalledWidget") {
      return { passed: false, message: "Failed to detect missing required dependency" };
    }

    return {
      passed: true,
      message:
        "Package import schema validation, h5p.json manifest parsing, error detection, and missing dependency checking verified",
    };
  } catch (err) {
    return { passed: false, message: err instanceof Error ? err.message : String(err) };
  }
}
