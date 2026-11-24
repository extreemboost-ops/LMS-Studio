import crypto from "node:crypto";
import { AppError } from "../../utils/appError.js";

export interface XAPIActor {
  objectType?: "Agent" | "Group";
  name: string;
  mbox?: string; // mailto:learner@institution.edu
  account?: {
    homePage: string;
    name: string;
  };
}

export interface XAPIVerb {
  id: string; // IRI
  display: Record<string, string>;
}

export interface XAPIActivityDefinition {
  name: Record<string, string>;
  description?: Record<string, string>;
  type?: string; // IRI
  extensions?: Record<string, unknown>;
}

export interface XAPIObject {
  objectType?: "Activity" | "Agent" | "StatementRef";
  id: string; // IRI
  definition?: XAPIActivityDefinition;
}

export interface XAPIScore {
  scaled?: number; // -1.0 to 1.0
  raw?: number;
  min?: number;
  max?: number;
}

export interface XAPIResult {
  score?: XAPIScore;
  success?: boolean;
  completion?: boolean;
  response?: string;
  duration?: string; // ISO 8601 duration string e.g. PT12M30S
  extensions?: Record<string, unknown>;
}

export interface XAPIContext {
  registration?: string;
  instructor?: XAPIActor;
  platform?: string;
  language?: string;
  statement?: { id: string };
  contextActivities?: {
    parent?: XAPIObject[];
    grouping?: XAPIObject[];
    category?: XAPIObject[];
    other?: XAPIObject[];
  };
  extensions?: Record<string, unknown>;
}

export interface XAPIStatement {
  id: string;
  timestamp: string;
  actor: XAPIActor;
  verb: XAPIVerb;
  object: XAPIObject;
  result?: XAPIResult;
  context?: XAPIContext;
  authority?: XAPIActor;
  version?: string;
}

export const XAPIVerbs = {
  INITIALIZED: {
    id: "http://adlnet.gov/expapi/verbs/initialized",
    display: { "en-US": "initialized" },
  },
  EXPERIENCED: {
    id: "http://adlnet.gov/expapi/verbs/experienced",
    display: { "en-US": "experienced" },
  },
  INTERACTED: {
    id: "http://adlnet.gov/expapi/verbs/interacted",
    display: { "en-US": "interacted" },
  },
  ANSWERED: {
    id: "http://adlnet.gov/expapi/verbs/answered",
    display: { "en-US": "answered" },
  },
  ATTEMPTED: {
    id: "http://adlnet.gov/expapi/verbs/attempted",
    display: { "en-US": "attempted" },
  },
  PASSED: {
    id: "http://adlnet.gov/expapi/verbs/passed",
    display: { "en-US": "passed" },
  },
  FAILED: {
    id: "http://adlnet.gov/expapi/verbs/failed",
    display: { "en-US": "failed" },
  },
  COMPLETED: {
    id: "http://adlnet.gov/expapi/verbs/completed",
    display: { "en-US": "completed" },
  },
  TERMINATED: {
    id: "http://adlnet.gov/expapi/verbs/terminated",
    display: { "en-US": "terminated" },
  },
};

export class XAPIEngineService {
  private static statementsStore: XAPIStatement[] = [];

  /**
   * Convert duration in seconds into ISO 8601 duration format (PT#H#M#S)
   */
  public static formatIso8601Duration(seconds: number): string {
    const s = Math.max(0, Math.floor(seconds));
    const hours = Math.floor(s / 3600);
    const minutes = Math.floor((s % 3600) / 60);
    const remSeconds = s % 60;

    let res = "PT";
    if (hours > 0) res += `${hours}H`;
    if (minutes > 0 || hours > 0) res += `${minutes}M`;
    res += `${remSeconds}S`;
    return res;
  }

  /**
   * Validates structural compliance of an xAPI Statement
   */
  public static validateStatement(statement: unknown): { isValid: boolean; errors: string[] } {
    const errors: string[] = [];

    if (!statement || typeof statement !== "object") {
      return { isValid: false, errors: ["Statement must be a non-null object"] };
    }

    const s = statement as Partial<XAPIStatement>;

    // Actor validation
    if (!s.actor || typeof s.actor !== "object") {
      errors.push("Statement requires an actor object");
    } else {
      if (!s.actor.name) errors.push("Actor requires a name");
      if (!s.actor.mbox && !s.actor.account) {
        errors.push("Actor requires either an mbox (mailto:...) or an account identifier");
      }
      if (s.actor.mbox && !s.actor.mbox.startsWith("mailto:")) {
        errors.push("Actor mbox must begin with 'mailto:' prefix");
      }
    }

    // Verb validation
    if (!s.verb || typeof s.verb !== "object") {
      errors.push("Statement requires a verb object");
    } else {
      if (!s.verb.id || !s.verb.id.startsWith("http")) {
        errors.push("Verb id must be a valid IRI/URI starting with http");
      }
      if (!s.verb.display || typeof s.verb.display !== "object") {
        errors.push("Verb requires a display mapping object");
      }
    }

    // Object validation
    if (!s.object || typeof s.object !== "object") {
      errors.push("Statement requires an object");
    } else {
      if (!s.object.id || !s.object.id.startsWith("http")) {
        errors.push("Object id must be a valid IRI starting with http");
      }
    }

    // Result validation
    if (s.result) {
      if (s.result.score) {
        const sc = s.result.score;
        if (sc.scaled !== undefined && (sc.scaled < -1 || sc.scaled > 1)) {
          errors.push("Result scaled score must be between -1.0 and 1.0");
        }
      }
    }

    return {
      isValid: errors.length === 0,
      errors,
    };
  }

  /**
   * Creates and registers an xAPI statement
   */
  public static recordStatement(params: {
    actor: XAPIActor;
    verb: XAPIVerb;
    object: XAPIObject;
    result?: XAPIResult;
    context?: XAPIContext;
  }): XAPIStatement {
    // Normalise actor mbox
    const actor: XAPIActor = {
      ...params.actor,
      objectType: "Agent",
      mbox: params.actor.mbox
        ? params.actor.mbox.startsWith("mailto:")
          ? params.actor.mbox
          : `mailto:${params.actor.mbox}`
        : undefined,
    };

    const statement: XAPIStatement = {
      id: crypto.randomUUID(),
      timestamp: new Date().toISOString(),
      actor,
      verb: params.verb,
      object: {
        objectType: "Activity",
        ...params.object,
      },
      result: params.result,
      context: {
        platform: "SCORM & H5P Authoring Studio",
        ...params.context,
      },
      version: "1.0.3",
    };

    const validation = this.validateStatement(statement);
    if (!validation.isValid) {
      throw AppError.badRequest(`xAPI Statement invalid: ${validation.errors.join("; ")}`);
    }

    this.statementsStore.unshift(statement);
    if (this.statementsStore.length > 500) {
      this.statementsStore.pop();
    }

    return statement;
  }

  /**
   * Query statements
   */
  public static getStatements(filter?: {
    actorEmail?: string;
    verbId?: string;
    activityId?: string;
    limit?: number;
  }): XAPIStatement[] {
    let list = [...this.statementsStore];

    if (filter?.actorEmail) {
      const needle = `mailto:${filter.actorEmail}`.toLowerCase();
      list = list.filter((s) => s.actor.mbox?.toLowerCase() === needle);
    }

    if (filter?.verbId) {
      list = list.filter((s) => s.verb.id === filter.verbId);
    }

    if (filter?.activityId) {
      list = list.filter((s) => s.object.id === filter.activityId);
    }

    const limit = filter?.limit || 50;
    return list.slice(0, limit);
  }
}
