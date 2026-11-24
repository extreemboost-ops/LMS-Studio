import crypto from "node:crypto";
import { ZipArchiveService } from "./zip-archive.service.js";
import { StorageService } from "../storage/storage.service.js";

export interface H5PBundleOptions {
  organizationId: string;
  projectId: string;
  projectTitle: string;
  mainLibrary?: string; // Default: "H5P.InteractiveVideo 1.22"
  language?: string;
  slides?: Array<{ id: string; title: string; elements?: any[] }>;
  questions?: Array<{ id: number; title: string; points: number; options: any[] }>;
}

export interface H5PBundleResult {
  packageId: string;
  storageKey: string;
  filename: string;
  fileSizeBytes: number;
  checksumSha256: string;
  downloadToken: string;
  downloadUrl: string;
}

export class H5PBundlerService {
  /**
   * Bundles project data into a valid .h5p archive
   */
  public static async bundlePackage(options: H5PBundleOptions): Promise<H5PBundleResult> {
    const packageId = crypto.randomUUID();
    const title = options.projectTitle || "Interactive Learning Content";
    const filenameBase = title.toLowerCase().replace(/[^a-z0-9]/g, "-").replace(/-+/g, "-") || "package";
    const filename = `${filenameBase}.h5p`;
    const storageKey = `organizations/${options.organizationId}/h5p/${filenameBase}-${packageId.substring(0, 8)}.h5p`;

    const mainLibrary = options.mainLibrary || "H5P.InteractiveVideo 1.22";
    const language = options.language || "en";

    // 1. Construct h5p.json manifest
    const manifest = {
      title,
      mainLibrary,
      language,
      preloadedDependencies: [
        { machineName: "H5P.InteractiveVideo", majorVersion: 1, minorVersion: 22 },
        { machineName: "H5P.Video", majorVersion: 1, minorVersion: 6 },
        { machineName: "FontAwesome", majorVersion: 4, minorVersion: 5 },
      ],
      embedTypes: ["iframe"],
      license: "U",
      author: "SCORM & H5P Authoring Studio",
    };

    // 2. Construct content/content.json parameter tree
    const contentParams = {
      interactiveVideo: {
        video: {
          files: [
            {
              path: "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4",
              mime: "video/mp4",
            },
          ],
        },
        assets: {
          interactions: (options.questions || []).map((q, idx) => ({
            id: `interaction-${q.id || idx + 1}`,
            x: 20 + idx * 15,
            y: 30 + idx * 10,
            duration: { from: 5 + idx * 10, to: 15 + idx * 10 },
            action: {
              library: "H5P.MultiChoice 1.14",
              params: {
                question: `<p>${q.title}</p>`,
                answers: (q.options || []).map((opt) => ({
                  text: `<div>${opt.text}</div>`,
                  correct: opt.isCorrect === true,
                })),
                behaviour: {
                  singleAnswer: true,
                  randomAnswers: true,
                  showSolutionsRequiresInput: true,
                  confirmCheckDialog: false,
                  confirmRetryDialog: false,
                  autoCheck: false,
                  passPercentage: 80,
                },
              },
            },
          })),
        },
        summary: {
          task: {
            summary: [
              "Always inspect safety equipment prior to operating machinery.",
              "Report hazardous spills immediately to shift management.",
              "Evacuate following designated primary routes when alarms sound.",
            ],
          },
        },
      },
    };

    // 3. Assemble .h5p archive (ZIP container)
    const archiver = new ZipArchiveService();
    archiver.addJson("h5p.json", manifest);
    archiver.addJson("content/content.json", contentParams);

    // Add minimal library metadata stubs
    archiver.addJson("H5P.InteractiveVideo-1.22/library.json", {
      title: "Interactive Video",
      machineName: "H5P.InteractiveVideo",
      majorVersion: 1,
      minorVersion: 22,
      patchVersion: 0,
      runnable: 1,
    });

    const h5pBuffer = archiver.buildZip();

    // 4. Write to storage
    const writeResult = await StorageService.writePackage(
      options.organizationId,
      storageKey,
      h5pBuffer
    );

    // 5. Generate signed download token
    const downloadToken = StorageService.generateSignedDownloadToken(
      storageKey,
      options.organizationId,
      filename,
      1800
    );

    const downloadUrl = `/api/v1/storage/download/${downloadToken}`;

    return {
      packageId,
      storageKey,
      filename,
      fileSizeBytes: writeResult.sizeBytes,
      checksumSha256: writeResult.checksumSha256,
      downloadToken,
      downloadUrl,
    };
  }
}
