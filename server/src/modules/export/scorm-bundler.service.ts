import crypto from "node:crypto";
import { ZipArchiveService } from "./zip-archive.service.js";
import { StorageService } from "../storage/storage.service.js";
import { SCORMPackagerService } from "../scorm/scorm-packager.service.js";
import { CreateSCORMExportInput } from "../scorm/scorm.schema.js";

export interface SCORMBundleOptions {
  organizationId: string;
  projectId: string;
  projectTitle: string;
  versionString?: string;
  format: "SCORM_12" | "SCORM_2004_3RD_EDITION" | "SCORM_2004_4TH_EDITION";
  passingScorePercent?: number;
  launchBehavior?: "NEW_WINDOW" | "LMS_FRAME";
  slides?: Array<{ id: string; title: string; elements?: any[] }>;
  questions?: Array<{ id: number; title: string; points: number; options: any[] }>;
}

export interface SCORMBundleResult {
  packageId: string;
  manifestId: string;
  storageKey: string;
  filename: string;
  fileSizeBytes: number;
  checksumSha256: string;
  downloadToken: string;
  downloadUrl: string;
}

export class SCORMBundlerService {
  /**
   * Generates a fully standalone, responsive index.html launch file for the SCORM package
   */
  public static generateLaunchHtml(params: {
    title: string;
    format: string;
    passingScorePercent: number;
  }): string {
    const isScorm2004 = params.format.includes("2004");
    const apiName = isScorm2004 ? "API_1484_11" : "API";

    return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${SCORMPackagerService.escapeXml(params.title)}</title>
  <style>
    :root {
      --primary: #0284c7;
      --bg: #f8fafc;
      --card-bg: #ffffff;
      --text: #0f172a;
      --muted: #64748b;
      --border: #e2e8f0;
      --success: #16a34a;
    }
    * { box-sizing: border-box; margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; }
    body { background: var(--bg); color: var(--text); display: flex; flex-direction: column; min-height: 100vh; }
    header { background: #0f172a; color: #fff; padding: 16px 24px; display: flex; justify-content: space-between; align-items: center; }
    header h1 { font-size: 1.1rem; font-weight: 600; }
    .status-badge { font-size: 0.75rem; background: #1e293b; padding: 4px 10px; border-radius: 999px; color: #38bdf8; }
    main { flex: 1; max-width: 900px; width: 100%; margin: 30px auto; padding: 0 20px; }
    .card { background: var(--card-bg); border: 1px solid var(--border); border-radius: 12px; padding: 32px; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.05); }
    .card h2 { font-size: 1.5rem; margin-bottom: 12px; }
    .card p { color: var(--muted); line-height: 1.6; margin-bottom: 24px; }
    .quiz-options { display: flex; flex-direction: column; gap: 10px; margin-bottom: 24px; }
    .quiz-opt { padding: 14px 18px; border: 1px solid var(--border); border-radius: 8px; cursor: pointer; display: flex; align-items: center; gap: 12px; font-weight: 500; transition: 0.15s; }
    .quiz-opt:hover { border-color: var(--primary); background: #f0f9ff; }
    .quiz-opt.selected { border-color: var(--primary); background: #e0f2fe; color: var(--primary); }
    .footer-actions { display: flex; justify-content: space-between; align-items: center; margin-top: 32px; padding-top: 20px; border-top: 1px solid var(--border); }
    button.btn { background: var(--primary); color: #fff; border: none; padding: 10px 22px; border-radius: 8px; font-weight: 600; cursor: pointer; }
    button.btn:disabled { opacity: 0.5; cursor: not-allowed; }
    .feedback { padding: 16px; border-radius: 8px; margin-top: 20px; display: none; }
    .feedback.show { display: block; background: #f0fdf4; border: 1px solid #bbf7d0; color: #166534; }
  </style>
  <script src="scorm-bridge.js"></script>
</head>
<body>
  <header>
    <h1>${SCORMPackagerService.escapeXml(params.title)}</h1>
    <span class="status-badge" id="scorm-status">Connecting to ${apiName}…</span>
  </header>
  <main>
    <div class="card">
      <h2 id="lesson-title">Knowledge Check & Certification</h2>
      <p id="lesson-prompt">Select the correct procedure below to complete this module and record your grade.</p>
      <div class="quiz-options" id="options-container"></div>
      <div class="feedback" id="feedback-box"></div>
      <div class="footer-actions">
        <span id="score-display">Required Passing Score: ${params.passingScorePercent}%</span>
        <button class="btn" id="submit-btn" disabled onclick="submitAssessment()">Submit & Record Score</button>
      </div>
    </div>
  </main>
  <script>
    let selectedOptionIndex = null;
    let questionsData = [];

    window.addEventListener("DOMContentLoaded", async () => {
      SCORMBridge.init();
      document.getElementById("scorm-status").innerText = "LMS Connected (" + SCORMBridge.format + ")";

      try {
        const res = await fetch("course-data.json");
        const data = await res.json();
        questionsData = data.questions || [];
        renderQuiz();
      } catch (e) {
        renderDefaultQuiz();
      }
    });

    function renderDefaultQuiz() {
      const container = document.getElementById("options-container");
      container.innerHTML = \`
        <div class="quiz-opt" onclick="selectOption(0)">A. Secure the area, alert others, and follow standard safety protocols</div>
        <div class="quiz-opt" onclick="selectOption(1)">B. Bypass safety protocols to save time</div>
        <div class="quiz-opt" onclick="selectOption(2)">C. Ignore hazard reports until end of shift</div>
      \`;
    }

    function renderQuiz() {
      if (!questionsData.length) return renderDefaultQuiz();
      const q = questionsData[0];
      document.getElementById("lesson-title").innerText = q.title;
      const container = document.getElementById("options-container");
      container.innerHTML = "";
      q.options.forEach((opt, idx) => {
        const div = document.createElement("div");
        div.className = "quiz-opt";
        div.innerText = String.fromCharCode(65 + idx) + ". " + opt.text;
        div.onclick = () => selectOption(idx, opt.isCorrect);
        container.appendChild(div);
      });
    }

    let isSelectionCorrect = false;
    function selectOption(idx, isCorrect = idx === 0) {
      selectedOptionIndex = idx;
      isSelectionCorrect = isCorrect;
      const items = document.querySelectorAll(".quiz-opt");
      items.forEach((item, i) => {
        item.classList.toggle("selected", i === idx);
      });
      document.getElementById("submit-btn").disabled = false;
    }

    function submitAssessment() {
      const score = isSelectionCorrect ? 100 : 0;
      const passed = score >= ${params.passingScorePercent};
      SCORMBridge.recordScore(score, passed);
      
      const fb = document.getElementById("feedback-box");
      fb.className = "feedback show";
      fb.innerHTML = "<b>" + (passed ? "Module Passed!" : "Review Required") + "</b><br>Score recorded: " + score + "% (" + (passed ? "Passed" : "Failed") + "). Your learning record has been submitted to the LMS.";
      document.getElementById("submit-btn").disabled = true;
    }

    window.addEventListener("beforeunload", () => {
      SCORMBridge.terminate();
    });
  </script>
</body>
</html>`;
  }

  /**
   * Generates scorm-bridge.js supporting both SCORM 1.2 and SCORM 2004 APIs
   */
  public static generateScormBridgeScript(format: string, passingScorePercent: number): string {
    const isScorm2004 = format.includes("2004");

    return `/**
 * SCORM & H5P Authoring Studio Runtime Bridge
 * Auto-detects SCORM 1.2 (API) and SCORM 2004 (API_1484_11)
 */
const SCORMBridge = (() => {
  let api = null;
  const is2004 = ${isScorm2004};
  const passingScore = ${passingScorePercent};

  function findAPI(win) {
    let attempts = 0;
    while (win && !win.API && !win.API_1484_11 && attempts < 10) {
      if (win.parent && win.parent !== win) {
        win = win.parent;
      } else if (win.opener) {
        win = win.opener;
      } else {
        break;
      }
      attempts++;
    }
    return is2004 ? (win ? win.API_1484_11 : null) : (win ? win.API : null);
  }

  return {
    format: is2004 ? "SCORM 2004" : "SCORM 1.2",
    init() {
      api = findAPI(window);
      if (!api) {
        console.warn("[SCORMBridge] No LMS API found. Running in standalone preview mode.");
        return false;
      }
      if (is2004) {
        api.Initialize("");
        api.SetValue("cmi.completion_status", "incomplete");
        api.SetValue("cmi.success_status", "unknown");
        api.SetValue("cmi.scaled_passing_score", (passingScore / 100).toFixed(2));
      } else {
        api.LMSInitialize("");
        api.LMSSetValue("cmi.core.lesson_status", "incomplete");
      }
      this.commit();
      return true;
    },
    setValue(key, val) {
      if (!api) return;
      if (is2004) {
        api.SetValue(key, String(val));
      } else {
        api.LMSSetValue(key, String(val));
      }
    },
    commit() {
      if (!api) return;
      if (is2004) {
        api.Commit("");
      } else {
        api.LMSCommit("");
      }
    },
    recordScore(scorePercent, passed) {
      if (!api) return;
      if (is2004) {
        api.SetValue("cmi.score.raw", String(scorePercent));
        api.SetValue("cmi.score.scaled", (scorePercent / 100).toFixed(2));
        api.SetValue("cmi.score.min", "0");
        api.SetValue("cmi.score.max", "100");
        api.SetValue("cmi.completion_status", "completed");
        api.SetValue("cmi.success_status", passed ? "passed" : "failed");
      } else {
        api.LMSSetValue("cmi.core.score.raw", String(scorePercent));
        api.LMSSetValue("cmi.core.score.min", "0");
        api.LMSSetValue("cmi.core.score.max", "100");
        api.LMSSetValue("cmi.core.lesson_status", passed ? "passed" : "failed");
      }
      this.commit();
    },
    terminate() {
      if (!api) return;
      if (is2004) {
        api.Terminate("");
      } else {
        api.LMSFinish("");
      }
      api = null;
    }
  };
})();
`;
  }

  /**
   * Assemble and package a real SCORM zip file
   */
  public static async bundlePackage(options: SCORMBundleOptions): Promise<SCORMBundleResult> {
    const packageId = crypto.randomUUID();
    const manifestId = `MANIFEST-${packageId.substring(0, 8).toUpperCase()}`;
    const sanitizedTitle = options.projectTitle || "Course Package";
    const filenameBase = sanitizedTitle.toLowerCase().replace(/[^a-z0-9]/g, "-").replace(/-+/g, "-") || "package";
    const filename = `${filenameBase}.zip`;
    const storageKey = `organizations/${options.organizationId}/scorm/${filenameBase}-${packageId.substring(0, 8)}.zip`;

    const passingScorePercent = options.passingScorePercent ?? 80;
    const isScorm2004 = options.format.includes("2004");

    const filesInPackage = [
      "index.html",
      "scorm-bridge.js",
      "course-data.json",
      "imsmanifest.xml",
    ];

    // 1. Generate Manifest XML
    let manifestXml: string;
    if (isScorm2004) {
      manifestXml = SCORMPackagerService.generateScorm2004Manifest({
        manifestId,
        packageTitle: sanitizedTitle,
        masteryScoreDecimal: passingScorePercent / 100,
        standard: options.format as "SCORM_2004_3RD_EDITION" | "SCORM_2004_4TH_EDITION",
        launchFile: "index.html",
        files: filesInPackage,
      });
    } else {
      manifestXml = SCORMPackagerService.generateScorm12Manifest({
        manifestId,
        packageTitle: sanitizedTitle,
        masteryScorePercent: passingScorePercent,
        launchFile: "index.html",
        files: filesInPackage,
      });
    }

    // 2. Generate Launch HTML and Bridge Script
    const launchHtml = this.generateLaunchHtml({
      title: sanitizedTitle,
      format: options.format,
      passingScorePercent,
    });
    const bridgeScript = this.generateScormBridgeScript(options.format, passingScorePercent);

    // 3. Serialized Course Data
    const courseData = {
      title: sanitizedTitle,
      format: options.format,
      passingScorePercent,
      slides: options.slides || [
        { id: "s-1", title: "Introduction & Safety Core", elements: [] },
      ],
      questions: options.questions || [
        {
          id: 1,
          title: "What is the primary action in case of workplace emergency?",
          points: 10,
          options: [
            { text: "Secure the area, alert others, and follow standard safety protocols", isCorrect: true },
            { text: "Bypass safety protocols to save time", isCorrect: false },
            { text: "Ignore hazard reports until end of shift", isCorrect: false },
          ],
        },
      ],
    };

    // 4. Build ZIP Archive
    const archiver = new ZipArchiveService();
    archiver.addFile("imsmanifest.xml", manifestXml);
    archiver.addFile("index.html", launchHtml);
    archiver.addFile("scorm-bridge.js", bridgeScript);
    archiver.addJson("course-data.json", courseData);

    // Schema definition stubs
    archiver.addFile("imscp_rootv1p1p2.xsd", `<?xml version="1.0"?><xs:schema xmlns:xs="http://www.w3.org/2001/XMLSchema"></xs:schema>`);
    archiver.addFile("adlcp_rootv1p1p2.xsd", `<?xml version="1.0"?><xs:schema xmlns:xs="http://www.w3.org/2001/XMLSchema"></xs:schema>`);

    const zipBuffer = archiver.buildZip();

    // 5. Write to Storage
    const writeResult = await StorageService.writePackage(
      options.organizationId,
      storageKey,
      zipBuffer
    );

    // 6. Generate Signed Download Token
    const downloadToken = StorageService.generateSignedDownloadToken(
      storageKey,
      options.organizationId,
      filename,
      1800 // 30 minutes
    );

    const downloadUrl = `/api/v1/storage/download/${downloadToken}`;

    return {
      packageId,
      manifestId,
      storageKey,
      filename,
      fileSizeBytes: writeResult.sizeBytes,
      checksumSha256: writeResult.checksumSha256,
      downloadToken,
      downloadUrl,
    };
  }
}
