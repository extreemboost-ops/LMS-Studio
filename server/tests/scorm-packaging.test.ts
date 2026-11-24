import { SCORMPackagerService } from "../src/modules/scorm/scorm-packager.service.js";
import { createSCORMExportSchema } from "../src/modules/scorm/scorm.schema.js";

interface TestResult {
  name: string;
  passed: boolean;
  error?: string;
}

export async function runScormPackagingTests(): Promise<{ passed: number; failed: number; results: TestResult[] }> {
  const results: TestResult[] = [];

  function assert(name: string, condition: boolean, message?: string) {
    if (condition) {
      results.push({ name, passed: true });
    } else {
      results.push({ name, passed: false, error: message || "Assertion failed" });
    }
  }

  // 1. SCORM 1.2 Manifest Generation
  try {
    const xml12 = SCORMPackagerService.generateScorm12Manifest({
      manifestId: "MANIFEST-TEST-12",
      packageTitle: "Hazard Communication & Safety",
      masteryScorePercent: 85,
      launchFile: "index.html",
      files: ["index.html", "scorm-bridge.js", "content.json"],
    });

    assert("SCORM 1.2 manifest contains schemaversion 1.2", xml12.includes("<schemaversion>1.2</schemaversion>"));
    assert("SCORM 1.2 manifest contains ADL SCORM namespace", xml12.includes("http://www.imsproject.org/xsd/imscp_rootv1p1p2"));
    assert("SCORM 1.2 manifest contains adlcp:masteryscore", xml12.includes("<adlcp:masteryscore>85</adlcp:masteryscore>"));
    assert("SCORM 1.2 manifest declares sco resource", xml12.includes('adlcp:scormtype="sco"'));
    assert("SCORM 1.2 manifest lists launch file", xml12.includes('<file href="index.html"/>'));
  } catch (err: any) {
    assert("SCORM 1.2 manifest generation threw error", false, err.message);
  }

  // 2. SCORM 2004 Manifest Generation
  try {
    const xml2004 = SCORMPackagerService.generateScorm2004Manifest({
      manifestId: "MANIFEST-TEST-2004",
      packageTitle: "Emergency Response Protocols",
      masteryScoreDecimal: 0.8,
      standard: "SCORM_2004_4TH_EDITION",
      launchFile: "index.html",
      files: ["index.html", "scorm-bridge.js"],
    });

    assert("SCORM 2004 manifest contains 2004 4th Edition", xml2004.includes("<schemaversion>2004 4th Edition</schemaversion>"));
    assert("SCORM 2004 manifest contains imsss:sequencing element", xml2004.includes("<imsss:sequencing>"));
    assert("SCORM 2004 manifest contains deliveryControls", xml2004.includes('tracked="true"'));
    assert("SCORM 2004 manifest formats minNormalizedMeasure", xml2004.includes("<imsss:minNormalizedMeasure>0.800</imsss:minNormalizedMeasure>"));
  } catch (err: any) {
    assert("SCORM 2004 manifest generation threw error", false, err.message);
  }

  // 3. XML Entity Escaping
  try {
    const rawTitle = `Biohazards & PPE: "Safety First" <Level 1> 'Warning'`;
    const escaped = SCORMPackagerService.escapeXml(rawTitle);
    const expected = `Biohazards &amp; PPE: &quot;Safety First&quot; &lt;Level 1&gt; &apos;Warning&apos;`;
    assert("SCORMPackagerService.escapeXml escapes dangerous characters", escaped === expected, `Expected "${expected}" but got "${escaped}"`);
  } catch (err: any) {
    assert("XML escaping test threw error", false, err.message);
  }

  // 4. SCORM Client Bridge Generation
  try {
    const bridgeJs = SCORMPackagerService.generateScormClientBridge("SCORM_2004_4TH_EDITION");
    assert("SCORM bridge defines window.ScormBridge", bridgeJs.includes("window.ScormBridge"));
    assert("SCORM bridge includes initialize function", bridgeJs.includes("initialize: function"));
    assert("SCORM bridge includes commit function", bridgeJs.includes("commit: function"));
    assert("SCORM bridge includes terminate function", bridgeJs.includes("terminate: function"));
    assert("SCORM bridge searches window.parent and window.opener", bridgeJs.includes("window.opener"));
  } catch (err: any) {
    assert("SCORM client bridge test threw error", false, err.message);
  }

  // 5. Create SCORM Export Schema validation
  try {
    const validExport = createSCORMExportSchema.safeParse({
      format: "SCORM_2004_4TH_EDITION",
      packageTitle: "Workplace Ergonomics",
      versionString: "1.2.0",
      launchBehavior: "NEW_WINDOW",
      completionCriteria: "BOTH",
      passingScorePercent: 80,
      trackingMode: "SCORE_AND_STATUS",
      masteryScoreDecimal: 0.8,
    });
    assert("createSCORMExportSchema accepts valid export configuration", validExport.success);
  } catch (err: any) {
    assert("SCORM export schema threw error", false, err.message);
  }

  const passed = results.filter((r) => r.passed).length;
  const failed = results.filter((r) => !r.passed).length;
  return { passed, failed, results };
}
