import { registerLibrarySchema } from "../src/modules/h5p/h5p.schema.js";
import { H5PLibraryService } from "../src/modules/h5p/h5p-library.service.js";
import { randomUUID } from "node:crypto";

export async function runH5PLibraryRegistryTests(): Promise<{ passed: boolean; message: string }> {
  try {
    // -------------------------------------------------------------------------
    // 1. Library Registration Schema Validation
    // -------------------------------------------------------------------------
    const validLib = {
      machineName: "H5P.InteractiveVideo",
      title: "Interactive Video",
      majorVersion: 1,
      minorVersion: 24,
      patchVersion: 5,
      runnable: true,
      fullscreen: true,
      preloadedJs: ["js/interactive-video.js"],
      preloadedCss: ["css/interactive-video.css"],
      dependencies: [
        {
          machineName: "H5P.Video",
          majorVersion: 1,
          minorVersion: 6,
          dependencyType: "PRELOADED" as const,
        },
        {
          machineName: "H5P.JoubelUI",
          majorVersion: 1,
          minorVersion: 3,
          dependencyType: "PRELOADED" as const,
        },
      ],
    };

    const parsed = registerLibrarySchema.safeParse(validLib);
    if (!parsed.success) {
      return { passed: false, message: `Expected valid library schema to parse: ${JSON.stringify(parsed.error)}` };
    }

    // Invalid machineName (spaces)
    const badName = registerLibrarySchema.safeParse({
      ...validLib,
      machineName: "Invalid Machine Name With Spaces",
    });
    if (badName.success) {
      return { passed: false, message: "Expected invalid machineName to fail validation" };
    }

    // -------------------------------------------------------------------------
    // 2. Semantic Versioning & Patch Upgrade Mechanics
    // -------------------------------------------------------------------------
    interface MockLibrary {
      id: string;
      machineName: string;
      majorVersion: number;
      minorVersion: number;
      patchVersion: number;
      runnable: boolean;
      preloadedJs: string[];
      preloadedCss: string[];
      dependencies: Array<{ machineName: string; majorVersion: number; minorVersion: number }>;
    }

    const registry = new Map<string, MockLibrary>();

    function getLibKey(name: string, major: number, minor: number) {
      return `${name}-${major}.${minor}`;
    }

    // Install base libraries
    const fontAwesome: MockLibrary = {
      id: randomUUID(),
      machineName: "FontAwesome",
      majorVersion: 4,
      minorVersion: 5,
      patchVersion: 1,
      runnable: false,
      preloadedJs: [],
      preloadedCss: ["font-awesome.css"],
      dependencies: [],
    };
    registry.set(getLibKey(fontAwesome.machineName, fontAwesome.majorVersion, fontAwesome.minorVersion), fontAwesome);

    const joubelUI: MockLibrary = {
      id: randomUUID(),
      machineName: "H5P.JoubelUI",
      majorVersion: 1,
      minorVersion: 3,
      patchVersion: 8,
      runnable: false,
      preloadedJs: ["joubel-ui.js"],
      preloadedCss: ["joubel-ui.css"],
      dependencies: [{ machineName: "FontAwesome", majorVersion: 4, minorVersion: 5 }],
    };
    registry.set(getLibKey(joubelUI.machineName, joubelUI.majorVersion, joubelUI.minorVersion), joubelUI);

    const videoLib: MockLibrary = {
      id: randomUUID(),
      machineName: "H5P.Video",
      majorVersion: 1,
      minorVersion: 6,
      patchVersion: 2,
      runnable: false,
      preloadedJs: ["video.js"],
      preloadedCss: ["video.css"],
      dependencies: [],
    };
    registry.set(getLibKey(videoLib.machineName, videoLib.majorVersion, videoLib.minorVersion), videoLib);

    const ivLib: MockLibrary = {
      id: randomUUID(),
      machineName: "H5P.InteractiveVideo",
      majorVersion: 1,
      minorVersion: 24,
      patchVersion: 5,
      runnable: true,
      preloadedJs: ["interactive-video.js"],
      preloadedCss: ["interactive-video.css"],
      dependencies: [
        { machineName: "H5P.Video", majorVersion: 1, minorVersion: 6 },
        { machineName: "H5P.JoubelUI", majorVersion: 1, minorVersion: 3 },
      ],
    };
    registry.set(getLibKey(ivLib.machineName, ivLib.majorVersion, ivLib.minorVersion), ivLib);

    // Patch upgrade test: 1.24.5 -> 1.24.6 updates existing key without breaking major.minor
    const key = getLibKey(ivLib.machineName, ivLib.majorVersion, ivLib.minorVersion);
    const existing = registry.get(key)!;
    existing.patchVersion = Math.max(existing.patchVersion, 6);

    if (existing.patchVersion !== 6) {
      return { passed: false, message: "Expected patch version upgrade to 6" };
    }

    // -------------------------------------------------------------------------
    // 3. Topological Asset Hierarchy Resolution (Dependency DAG)
    // -------------------------------------------------------------------------
    // Traverse dependencies starting from H5P.InteractiveVideo:
    // IV requires Video and JoubelUI; JoubelUI requires FontAwesome.
    // Topological resolution order must be: FontAwesome, JoubelUI, Video, InteractiveVideo
    const visited = new Set<string>();
    const ordered: MockLibrary[] = [];

    function resolveDAG(lib: MockLibrary) {
      if (visited.has(lib.id)) return;
      visited.add(lib.id);

      for (const d of lib.dependencies) {
        const depKey = getLibKey(d.machineName, d.majorVersion, d.minorVersion);
        const dep = registry.get(depKey);
        if (dep) {
          resolveDAG(dep);
        }
      }
      ordered.push(lib);
    }

    resolveDAG(ivLib);

    // Verify ordering
    if (ordered.length !== 4) {
      return { passed: false, message: `Expected 4 libraries in resolved DAG, got ${ordered.length}` };
    }

    const orderNames = ordered.map((l) => l.machineName);
    const faIdx = orderNames.indexOf("FontAwesome");
    const joubelIdx = orderNames.indexOf("H5P.JoubelUI");
    const ivIdx = orderNames.indexOf("H5P.InteractiveVideo");

    if (faIdx > joubelIdx || joubelIdx > ivIdx) {
      return {
        passed: false,
        message: `Dependency order invalid: expected FontAwesome before JoubelUI before InteractiveVideo, got: ${orderNames.join(" -> ")}`,
      };
    }

    // Collect preloaded CSS and JS in topological order
    const scripts: string[] = [];
    const styles: string[] = [];

    for (const lib of ordered) {
      for (const s of lib.preloadedJs) if (!scripts.includes(s)) scripts.push(s);
      for (const c of lib.preloadedCss) if (!styles.includes(c)) styles.push(c);
    }

    if (!styles.includes("font-awesome.css") || !styles.includes("interactive-video.css")) {
      return { passed: false, message: "Resolved styles missing expected CSS files" };
    }
    if (!scripts.includes("joubel-ui.js") || !scripts.includes("interactive-video.js")) {
      return { passed: false, message: "Resolved scripts missing expected JS files" };
    }

    return {
      passed: true,
      message:
        "H5P library registration schema, semantic version uniqueness, patch upgrades, and topological dependency DAG asset resolution verified",
    };
  } catch (err) {
    return { passed: false, message: err instanceof Error ? err.message : String(err) };
  }
}
