/**
 * Phase 05: Cloud Packaging, Storage & Export Automation Engine Test Suite
 * Suite 27: Zip Archiver, SCORM/H5P Packaging, Storage Security, Signed Tokens, Async Export Queue
 */

import crypto from "node:crypto";
import { ZipArchiveService, calculateCrc32 } from "../src/modules/export/zip-archive.service.js";
import { StorageService } from "../src/modules/storage/storage.service.js";
import { SCORMBundlerService } from "../src/modules/export/scorm-bundler.service.js";
import { H5PBundlerService } from "../src/modules/export/h5p-bundler.service.js";
import { ExportQueueService } from "../src/modules/export/export-queue.service.js";

interface TestResult {
  name: string;
  passed: boolean;
  error?: string;
}

export async function runCloudStorageExportTests(): Promise<{
  passed: number;
  failed: number;
  results: TestResult[];
}> {
  const results: TestResult[] = [];

  function assert(name: string, condition: boolean, message?: string) {
    if (condition) {
      results.push({ name, passed: true });
    } else {
      results.push({ name, passed: false, error: message || "Assertion failed" });
    }
  }

  const testOrgId = "11111111-1111-4111-a111-111111111111";

  // =========================================================================
  // 1. ZipArchiveService Unit & PKZIP 2.0 Binary Integrity
  // =========================================================================
  try {
    const archiver = new ZipArchiveService();
    const testText = "Hello SCORM and H5P Packaging Engine!";
    const testJson = { version: "1.0.0", status: "ready", timestamp: Date.now() };

    archiver.addFile("test.txt", testText);
    archiver.addJson("metadata.json", testJson);
    archiver.addFile("nested/deep/file.dat", Buffer.from([1, 2, 3, 4, 5, 6, 7, 8]));

    const zipBuffer = archiver.buildZip();

    assert("ZipArchiveService produces non-empty binary buffer", zipBuffer.length > 0);
    assert("Zip binary begins with PK 0x04034b50 local header signature", zipBuffer.readUInt32LE(0) === 0x04034b50);

    // Parse and verify ZIP central directory entries
    const entries = ZipArchiveService.readZipEntries(zipBuffer);
    assert("Zip contains exactly 3 entries", entries.length === 3);

    const txtEntry = entries.find((e) => e.name === "test.txt");
    assert("test.txt entry present in archive", !!txtEntry);
    assert("test.txt uncompressed size matches source string byte length", txtEntry?.uncompressedSize === Buffer.byteLength(testText));
    assert("test.txt CRC-32 matches expected checksum", txtEntry?.crc32 === calculateCrc32(Buffer.from(testText)));

    const jsonEntry = entries.find((e) => e.name === "metadata.json");
    assert("metadata.json entry present in archive", !!jsonEntry);

    const nestedEntry = entries.find((e) => e.name === "nested/deep/file.dat");
    assert("nested/deep/file.dat preserves normalized forward slash directory structure", !!nestedEntry);
  } catch (err: any) {
    assert("ZipArchiveService binary test crashed", false, err.message);
  }

  // =========================================================================
  // 2. SCORM 1.2 & SCORM 2004 Physical Packaging
  // =========================================================================
  try {
    // SCORM 1.2 Package
    const scorm12Result = await SCORMBundlerService.bundlePackage({
      organizationId: testOrgId,
      projectId: "proj-101",
      projectTitle: "Workplace Hazard Identification",
      format: "SCORM_12",
      passingScorePercent: 80,
    });

    assert("SCORM 1.2 bundle generates valid packageId", !!scorm12Result.packageId);
    assert("SCORM 1.2 filename has .zip extension", scorm12Result.filename.endsWith(".zip"));
    assert("SCORM 1.2 package writes to storage with positive byte size", scorm12Result.fileSizeBytes > 1000);
    assert("SCORM 1.2 generates 64-char hex SHA-256 checksum", scorm12Result.checksumSha256.length === 64);
    assert("SCORM 1.2 returns signed download token", !!scorm12Result.downloadToken);

    // Inspect zip contents
    const scorm12Zip = StorageService.readPackage(scorm12Result.storageKey);
    const scorm12Entries = ZipArchiveService.readZipEntries(scorm12Zip);
    const entryNames12 = scorm12Entries.map((e) => e.name);

    assert("SCORM 1.2 zip includes imsmanifest.xml", entryNames12.includes("imsmanifest.xml"));
    assert("SCORM 1.2 zip includes index.html launch file", entryNames12.includes("index.html"));
    assert("SCORM 1.2 zip includes scorm-bridge.js runtime adapter", entryNames12.includes("scorm-bridge.js"));
    assert("SCORM 1.2 zip includes course-data.json payload", entryNames12.includes("course-data.json"));

    // SCORM 2004 Package
    const scorm2004Result = await SCORMBundlerService.bundlePackage({
      organizationId: testOrgId,
      projectId: "proj-102",
      projectTitle: "Advanced Chemical Safety Protocols",
      format: "SCORM_2004_4TH_EDITION",
      passingScorePercent: 85,
    });

    assert("SCORM 2004 4th Edition bundle generates package", !!scorm2004Result.packageId);
    assert("SCORM 2004 storage key has valid tenant path prefix", scorm2004Result.storageKey.startsWith(`organizations/${testOrgId}/scorm/`));

    const scorm2004Zip = StorageService.readPackage(scorm2004Result.storageKey);
    const scorm2004Entries = ZipArchiveService.readZipEntries(scorm2004Zip);
    assert("SCORM 2004 zip includes imsmanifest.xml", scorm2004Entries.some((e) => e.name === "imsmanifest.xml"));

    // Cleanup test artifacts
    StorageService.deletePackage(scorm12Result.storageKey);
    StorageService.deletePackage(scorm2004Result.storageKey);
  } catch (err: any) {
    assert("SCORM packaging test crashed", false, err.message);
  }

  // =========================================================================
  // 3. H5P .h5p Physical Package Bundler
  // =========================================================================
  try {
    const h5pResult = await H5PBundlerService.bundlePackage({
      organizationId: testOrgId,
      projectId: "proj-201",
      projectTitle: "Industrial Machine Safeguards",
      mainLibrary: "H5P.InteractiveVideo 1.22",
      questions: [
        {
          id: 1,
          title: "Which safety interlock must be engaged prior to startup?",
          points: 5,
          options: [
            { text: "Primary emergency shutdown collar", isCorrect: true },
            { text: "Optional dust baffle", isCorrect: false },
          ],
        },
      ],
    });

    assert("H5P bundle returns valid package identifier", !!h5pResult.packageId);
    assert("H5P package filename has .h5p extension", h5pResult.filename.endsWith(".h5p"));
    assert("H5P file size exceeds 500 bytes", h5pResult.fileSizeBytes > 500);
    assert("H5P storage key organized under tenant h5p folder", h5pResult.storageKey.startsWith(`organizations/${testOrgId}/h5p/`));

    // Inspect .h5p entries
    const h5pZip = StorageService.readPackage(h5pResult.storageKey);
    const h5pEntries = ZipArchiveService.readZipEntries(h5pZip);
    const h5pEntryNames = h5pEntries.map((e) => e.name);

    assert("H5P zip package contains root h5p.json manifest", h5pEntryNames.includes("h5p.json"));
    assert("H5P zip package contains content/content.json payload", h5pEntryNames.includes("content/content.json"));
    assert("H5P zip package contains preloaded library metadata", h5pEntryNames.includes("H5P.InteractiveVideo-1.22/library.json"));

    // Cleanup
    StorageService.deletePackage(h5pResult.storageKey);
  } catch (err: any) {
    assert("H5P packaging test crashed", false, err.message);
  }

  // =========================================================================
  // 4. Cloud Storage Security & Path Traversal Exploit Defense
  // =========================================================================
  try {
    // Path Traversal Attack Vectors
    let caughtTraversal1 = false;
    try {
      StorageService.sanitizeStorageKey("../../etc/passwd");
    } catch {
      caughtTraversal1 = true;
    }
    assert("StorageService blocks relative parent directory traversal (../../etc/passwd)", caughtTraversal1);

    let caughtTraversal2 = false;
    try {
      StorageService.sanitizeStorageKey("organizations/tenant-1/../../system32/cmd.exe");
    } catch {
      caughtTraversal2 = true;
    }
    assert("StorageService blocks nested directory traversal escapes", caughtTraversal2);

    let caughtNullByte = false;
    try {
      StorageService.sanitizeStorageKey("organizations/tenant-1/package.zip\0.jpg");
    } catch {
      caughtNullByte = true;
    }
    assert("StorageService blocks null byte injection attacks", caughtNullByte);

    // Safe writing & reading roundtrip
    const safeKey = `organizations/${testOrgId}/test-artifact.dat`;
    const payloadBuffer = Buffer.from("SECURE_STORAGE_PAYLOAD_TEST_DATA_9981");

    const writeRes = await StorageService.writePackage(testOrgId, safeKey, payloadBuffer);
    assert("Storage write succeeds for safe normalized key", writeRes.sizeBytes === payloadBuffer.length);
    assert("Storage package exists on disk", StorageService.packageExists(safeKey));

    const readBack = StorageService.readPackage(safeKey);
    assert("Storage read retrieves exact binary payload", readBack.equals(payloadBuffer));

    StorageService.deletePackage(safeKey);
    assert("Storage package deleted cleanly", !StorageService.packageExists(safeKey));
  } catch (err: any) {
    assert("Storage security test crashed", false, err.message);
  }

  // =========================================================================
  // 5. Signed Download Token Cryptographic Verification & Defense
  // =========================================================================
  try {
    const validKey = `organizations/${testOrgId}/scorm/safety-course.zip`;
    const filename = "safety-course.zip";

    // Valid token with 15-minute expiry
    const token = StorageService.generateSignedDownloadToken(validKey, testOrgId, filename, 900);
    assert("Generated token is a dot-delimited string", typeof token === "string" && token.includes("."));

    const payload = StorageService.verifySignedDownloadToken(token);
    assert("Verified token decodes correct storageKey", payload.storageKey === validKey);
    assert("Verified token decodes correct organizationId", payload.organizationId === testOrgId);
    assert("Verified token decodes sanitized filename", payload.filename === filename);

    // Tampering test: modify payload or signature
    const [payloadB64, signature] = token.split(".");
    const tamperedToken = `${payloadB64}x.${signature}`;
    let caughtTampered = false;
    try {
      StorageService.verifySignedDownloadToken(tamperedToken);
    } catch {
      caughtTampered = true;
    }
    assert("StorageService rejects tampered payload token", caughtTampered);

    const forgedSignatureToken = `${payloadB64}.forged_signature_hex_12345`;
    let caughtForged = false;
    try {
      StorageService.verifySignedDownloadToken(forgedSignatureToken);
    } catch {
      caughtForged = true;
    }
    assert("StorageService rejects token with forged signature", caughtForged);

    // Expired token test: generate token with negative seconds
    const expiredToken = StorageService.generateSignedDownloadToken(validKey, testOrgId, filename, -10);
    let caughtExpired = false;
    try {
      StorageService.verifySignedDownloadToken(expiredToken);
    } catch {
      caughtExpired = true;
    }
    assert("StorageService rejects expired download token", caughtExpired);
  } catch (err: any) {
    assert("Download token test crashed", false, err.message);
  }

  // =========================================================================
  // 6. Async Background Export Queue & Worker Pool
  // =========================================================================
  try {
    const idempotencyKey = `export-test-${Date.now()}`;
    const enqueueInput = {
      organizationId: testOrgId,
      jobType: "EXPORT_SCORM" as const,
      idempotencyKey,
      payload: {
        projectId: "proj-301",
        projectTitle: "Fire Evacuation Procedures",
        format: "SCORM_2004_4TH_EDITION",
        passingScorePercent: 80,
      },
    };

    // 1. Enqueue job
    const job1 = await ExportQueueService.enqueueJob(enqueueInput);
    assert("Enqueued job returns valid job ID", !!job1.id);
    assert("Initial job status is QUEUED", job1.status === "QUEUED");
    assert("Initial job progress is 0%", job1.progress === 0);

    // 2. Idempotency check: duplicate enqueue with same idempotencyKey returns existing job
    const jobDuplicate = await ExportQueueService.enqueueJob(enqueueInput);
    assert("Duplicate export request returns existing job ID (idempotency preserved)", jobDuplicate.id === job1.id);

    // 3. Process job via worker
    const processedJob = await ExportQueueService.processJob(job1.id, "worker-node-alpha");
    assert("Worker processes job to COMPLETED status", processedJob.status === "COMPLETED");
    assert("Completed job has 100% progress", processedJob.progress === 100);
    assert("Completed job includes result with downloadUrl", !!processedJob.result?.downloadUrl);
    assert("Completed job includes storageKey in result", !!processedJob.result?.storageKey);

    // 4. Query status via getJobById
    const fetchedJob = await ExportQueueService.getJobById(job1.id, testOrgId);
    assert("getJobById retrieves identical completed job record", fetchedJob.id === job1.id && fetchedJob.status === "COMPLETED");

    // Clean up created file
    if (processedJob.result?.storageKey) {
      StorageService.deletePackage(processedJob.result.storageKey);
    }
  } catch (err: any) {
    assert("Export queue test crashed", false, err.message);
  }

  const passed = results.filter((r) => r.passed).length;
  const failed = results.filter((r) => !r.passed).length;
  return { passed, failed, results };
}
