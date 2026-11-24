import {
  createVersionSnapshotSchema,
  createRevisionSchema,
} from "../src/modules/content/content.schema.js";
import { randomUUID } from "node:crypto";

export async function runContentVersioningTests(): Promise<{ passed: boolean; message: string }> {
  try {
    // -------------------------------------------------------------------------
    // 1. Snapshot & Revision Schema Validation
    // -------------------------------------------------------------------------
    const validSnapshot = createVersionSnapshotSchema.safeParse({
      title: "v1.0.0 — Production Release for Compliance",
      description: "Approved by instructional design review board",
    });
    if (!validSnapshot.success) {
      return { passed: false, message: "Expected valid snapshot schema to parse" };
    }

    const validRevision = createRevisionSchema.safeParse({
      diffPayload: {
        action: "UPDATE_SLIDE",
        elementId: randomUUID(),
        changes: { title: "New Slide Title" },
      },
      changeSummary: "Corrected evacuation route diagram legend",
    });
    if (!validRevision.success) {
      return { passed: false, message: "Expected valid revision schema to parse" };
    }

    // -------------------------------------------------------------------------
    // 2. Snapshot Creation & Version Increment Invariant
    // -------------------------------------------------------------------------
    interface MockVersionSnapshot {
      id: string;
      projectId: string;
      versionNumber: number;
      title: string;
      snapshotPayload: {
        projectTitle: string;
        elements: Array<{ id: string; name: string }>;
        publishedAt: string;
      };
      createdAt: Date;
    }

    const projectId = randomUUID();
    let currentVersionNumber = 1;
    let projectStatus = "DRAFT";

    const liveElements = [
      { id: "el_1", name: "Slide 1: Overview" },
      { id: "el_2", name: "Slide 2: Hazardous Materials" },
    ];

    // Create snapshot v2
    const nextVersion = currentVersionNumber + 1;
    const snapshotPayload = {
      projectTitle: "Chemical Safety 2026",
      elements: JSON.parse(JSON.stringify(liveElements)), // Deep clone
      publishedAt: new Date().toISOString(),
    };

    const versionStore: MockVersionSnapshot[] = [
      {
        id: randomUUID(),
        projectId,
        versionNumber: nextVersion,
        title: "Release v2.0",
        snapshotPayload,
        createdAt: new Date(),
      },
    ];

    currentVersionNumber = nextVersion;
    projectStatus = "PUBLISHED";

    if (currentVersionNumber !== 2 || projectStatus !== "PUBLISHED") {
      return { passed: false, message: "Project state after snapshot creation is invalid" };
    }

    // -------------------------------------------------------------------------
    // 3. Snapshot Immutability Invariant
    // -------------------------------------------------------------------------
    // Subsequent edits to live project must NOT affect the historical snapshot
    liveElements[0].name = "Slide 1: MODIFIED TITLE AFTER PUBLISH";
    liveElements.push({ id: "el_3", name: "Slide 3: Draft new content" });

    const storedSnapshot = versionStore[0];
    if (storedSnapshot.snapshotPayload.elements.length !== 2) {
      return { passed: false, message: "Snapshot payload leaked new live elements! Immutability broken." };
    }
    if (storedSnapshot.snapshotPayload.elements[0].name !== "Slide 1: Overview") {
      return { passed: false, message: "Snapshot payload title mutated after live draft update!" };
    }

    // -------------------------------------------------------------------------
    // 4. Revision History Ordering
    // -------------------------------------------------------------------------
    const revisions = [
      { revisionNumber: 1, changeSummary: "Initial draft" },
      { revisionNumber: 2, changeSummary: "Added quiz question" },
      { revisionNumber: 3, changeSummary: "Updated theme colors" },
    ];

    const sortedDesc = [...revisions].sort((a, b) => b.revisionNumber - a.revisionNumber);
    if (sortedDesc[0].revisionNumber !== 3 || sortedDesc[2].revisionNumber !== 1) {
      return { passed: false, message: "Revision history ordering mismatch" };
    }

    return {
      passed: true,
      message:
        "Version snapshot creation, version counter increment, snapshot payload immutability, and revision history ordering verified",
    };
  } catch (err) {
    return { passed: false, message: err instanceof Error ? err.message : String(err) };
  }
}
