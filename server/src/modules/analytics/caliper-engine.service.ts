import crypto from "node:crypto";
import { AppError } from "../../utils/appError.js";

export type CaliperEventType =
  | "AssessmentEvent"
  | "AssessmentItemEvent"
  | "MediaEvent"
  | "ViewEvent"
  | "NavigationEvent";

export type CaliperAction =
  | "Started"
  | "Submitted"
  | "Paused"
  | "Resumed"
  | "Ended"
  | "Completed"
  | "Skipped"
  | "Viewed"
  | "NavigatedTo";

export interface CaliperEntity {
  id: string; // IRI or URN
  type: string; // "Person" | "SoftwareApplication" | "DigitalResource" | "Assessment" | "MediaObject"
  name?: string;
  description?: string;
  dateCreated?: string;
  dateModified?: string;
  extensions?: Record<string, unknown>;
}

export interface CaliperEvent {
  "@context": string;
  id: string;
  type: CaliperEventType;
  actor: CaliperEntity;
  action: CaliperAction;
  object: CaliperEntity;
  eventTime: string;
  edApp?: CaliperEntity;
  group?: CaliperEntity;
  membership?: CaliperEntity;
  federatedSession?: {
    id: string;
    type: "LtiSession" | "Session";
    user?: CaliperEntity;
  };
  generated?: CaliperEntity;
}

export class CaliperEngineService {
  private static eventsStore: CaliperEvent[] = [];

  private static defaultEdApp: CaliperEntity = {
    id: "https://studio.northstar.internal/app",
    type: "SoftwareApplication",
    name: "SCORM & H5P Authoring Studio",
  };

  /**
   * Validate a Caliper Analytics v1.2 Event payload
   */
  public static validateEvent(event: unknown): { isValid: boolean; errors: string[] } {
    const errors: string[] = [];

    if (!event || typeof event !== "object") {
      return { isValid: false, errors: ["Caliper event must be a non-null object"] };
    }

    const e = event as Partial<CaliperEvent>;

    if (e["@context"] !== "http://purl.imsglobal.org/ctx/caliper/v1p2") {
      errors.push("Caliper event must specify @context: 'http://purl.imsglobal.org/ctx/caliper/v1p2'");
    }

    if (!e.id || (!e.id.startsWith("urn:uuid:") && !e.id.startsWith("http"))) {
      errors.push("Caliper event id must be a valid URN (urn:uuid:...) or IRI");
    }

    if (!e.type) {
      errors.push("Caliper event requires a type");
    }

    if (!e.actor || typeof e.actor !== "object" || !e.actor.id) {
      errors.push("Caliper event requires an actor entity with id and type");
    }

    if (!e.action) {
      errors.push("Caliper event requires an action");
    }

    if (!e.object || typeof e.object !== "object" || !e.object.id) {
      errors.push("Caliper event requires a target object entity with id and type");
    }

    if (!e.eventTime) {
      errors.push("Caliper event requires an eventTime ISO-8601 string");
    }

    return {
      isValid: errors.length === 0,
      errors,
    };
  }

  /**
   * Record a Caliper Event
   */
  public static recordEvent(params: {
    type: CaliperEventType;
    actor: CaliperEntity;
    action: CaliperAction;
    object: CaliperEntity;
    generated?: CaliperEntity;
    sessionId?: string;
  }): CaliperEvent {
    const event: CaliperEvent = {
      "@context": "http://purl.imsglobal.org/ctx/caliper/v1p2",
      id: `urn:uuid:${crypto.randomUUID()}`,
      type: params.type,
      actor: {
        ...params.actor,
        type: params.actor.type || "Person",
      },
      action: params.action,
      object: params.object,
      eventTime: new Date().toISOString(),
      edApp: this.defaultEdApp,
      generated: params.generated,
      federatedSession: params.sessionId
        ? {
            id: `urn:session:${params.sessionId}`,
            type: "Session",
          }
        : undefined,
    };

    const validation = this.validateEvent(event);
    if (!validation.isValid) {
      throw AppError.badRequest(`Caliper event invalid: ${validation.errors.join("; ")}`);
    }

    this.eventsStore.unshift(event);
    if (this.eventsStore.length > 500) {
      this.eventsStore.pop();
    }

    return event;
  }

  /**
   * Query Caliper events
   */
  public static getEvents(filter?: {
    actorId?: string;
    eventType?: CaliperEventType;
    action?: CaliperAction;
    limit?: number;
  }): CaliperEvent[] {
    let list = [...this.eventsStore];

    if (filter?.actorId) {
      list = list.filter((e) => e.actor.id === filter.actorId);
    }

    if (filter?.eventType) {
      list = list.filter((e) => e.type === filter.eventType);
    }

    if (filter?.action) {
      list = list.filter((e) => e.action === filter.action);
    }

    const limit = filter?.limit || 50;
    return list.slice(0, limit);
  }
}
