export interface paths {
  "/health/live": {
    parameters: {
      query?: never;
      header?: never;
      path?: never;
      cookie?: never;
    };
    /** getLiveness */
    get: operations["getLiveness"];
    put?: never;
    post?: never;
    delete?: never;
    options?: never;
    head?: never;
    patch?: never;
    trace?: never;
  };
  "/health/ready": {
    parameters: {
      query?: never;
      header?: never;
      path?: never;
      cookie?: never;
    };
    /** getReadiness */
    get: operations["getReadiness"];
    put?: never;
    post?: never;
    delete?: never;
    options?: never;
    head?: never;
    patch?: never;
    trace?: never;
  };
  "/api/v1/status": {
    parameters: {
      query?: never;
      header?: never;
      path?: never;
      cookie?: never;
    };
    /** getServiceStatus */
    get: operations["getServiceStatus"];
    put?: never;
    post?: never;
    delete?: never;
    options?: never;
    head?: never;
    patch?: never;
    trace?: never;
  };
  "/api/v1/auth/session": {
    parameters: {
      query?: never;
      header?: never;
      path?: never;
      cookie?: never;
    };
    /** getAuthSession */
    get: operations["getAuthSession"];
    put?: never;
    post?: never;
    delete?: never;
    options?: never;
    head?: never;
    patch?: never;
    trace?: never;
  };
  "/api/v1/auth/email/request": {
    parameters: {
      query?: never;
      header?: never;
      path?: never;
      cookie?: never;
    };
    get?: never;
    put?: never;
    /** requestEmailCode */
    post: operations["requestEmailCode"];
    delete?: never;
    options?: never;
    head?: never;
    patch?: never;
    trace?: never;
  };
  "/api/v1/auth/email/verify": {
    parameters: {
      query?: never;
      header?: never;
      path?: never;
      cookie?: never;
    };
    get?: never;
    put?: never;
    /** verifyEmailCode */
    post: operations["verifyEmailCode"];
    delete?: never;
    options?: never;
    head?: never;
    patch?: never;
    trace?: never;
  };
  "/api/v1/auth/google/start": {
    parameters: {
      query?: never;
      header?: never;
      path?: never;
      cookie?: never;
    };
    get?: never;
    put?: never;
    /** startGoogle */
    post: operations["startGoogle"];
    delete?: never;
    options?: never;
    head?: never;
    patch?: never;
    trace?: never;
  };
  "/api/v1/auth/google/callback": {
    parameters: {
      query?: never;
      header?: never;
      path?: never;
      cookie?: never;
    };
    /** finishGoogle */
    get: operations["finishGoogle"];
    put?: never;
    post?: never;
    delete?: never;
    options?: never;
    head?: never;
    patch?: never;
    trace?: never;
  };
  "/api/v1/auth/logout": {
    parameters: {
      query?: never;
      header?: never;
      path?: never;
      cookie?: never;
    };
    get?: never;
    put?: never;
    /** logout */
    post: operations["logout"];
    delete?: never;
    options?: never;
    head?: never;
    patch?: never;
    trace?: never;
  };
  "/api/v1/auth/mfa/disable": {
    parameters: {
      query?: never;
      header?: never;
      path?: never;
      cookie?: never;
    };
    get?: never;
    put?: never;
    /** disableMFA */
    post: operations["disableMFA"];
    delete?: never;
    options?: never;
    head?: never;
    patch?: never;
    trace?: never;
  };
  "/api/v1/me/google/unlink": {
    parameters: {
      query?: never;
      header?: never;
      path?: never;
      cookie?: never;
    };
    get?: never;
    put?: never;
    /** unlinkGoogle */
    post: operations["unlinkGoogle"];
    delete?: never;
    options?: never;
    head?: never;
    patch?: never;
    trace?: never;
  };
  "/api/v1/auth/sessions/revoke": {
    parameters: {
      query?: never;
      header?: never;
      path?: never;
      cookie?: never;
    };
    get?: never;
    put?: never;
    /** revokeSessions */
    post: operations["revokeSessions"];
    delete?: never;
    options?: never;
    head?: never;
    patch?: never;
    trace?: never;
  };
  "/api/v1/auth/mfa/enroll": {
    parameters: {
      query?: never;
      header?: never;
      path?: never;
      cookie?: never;
    };
    get?: never;
    put?: never;
    /** enrollMFA */
    post: operations["enrollMFA"];
    delete?: never;
    options?: never;
    head?: never;
    patch?: never;
    trace?: never;
  };
  "/api/v1/auth/mfa/verify": {
    parameters: {
      query?: never;
      header?: never;
      path?: never;
      cookie?: never;
    };
    get?: never;
    put?: never;
    /** verifyMFA */
    post: operations["verifyMFA"];
    delete?: never;
    options?: never;
    head?: never;
    patch?: never;
    trace?: never;
  };
  "/api/v1/auth/mfa/recovery-codes": {
    parameters: {
      query?: never;
      header?: never;
      path?: never;
      cookie?: never;
    };
    get?: never;
    put?: never;
    /** regenerateRecoveryCodes */
    post: operations["regenerateRecoveryCodes"];
    delete?: never;
    options?: never;
    head?: never;
    patch?: never;
    trace?: never;
  };
  "/api/v1/me": {
    parameters: {
      query?: never;
      header?: never;
      path?: never;
      cookie?: never;
    };
    /** getProfile */
    get: operations["getProfile"];
    put?: never;
    post?: never;
    delete?: never;
    options?: never;
    head?: never;
    patch?: never;
    trace?: never;
  };
  "/api/v1/me/profile": {
    parameters: {
      query?: never;
      header?: never;
      path?: never;
      cookie?: never;
    };
    get?: never;
    put?: never;
    /** updateProfile */
    post: operations["updateProfile"];
    delete?: never;
    options?: never;
    head?: never;
    patch?: never;
    trace?: never;
  };
  "/api/v1/me/sessions": {
    parameters: {
      query?: never;
      header?: never;
      path?: never;
      cookie?: never;
    };
    /** getSessions */
    get: operations["getSessions"];
    put?: never;
    post?: never;
    delete?: never;
    options?: never;
    head?: never;
    patch?: never;
    trace?: never;
  };
  "/api/v1/portal/admin": {
    parameters: {
      query?: never;
      header?: never;
      path?: never;
      cookie?: never;
    };
    /** getAdminPortal */
    get: operations["getAdminPortal"];
    put?: never;
    post?: never;
    delete?: never;
    options?: never;
    head?: never;
    patch?: never;
    trace?: never;
  };
  "/api/v1/portal/booster": {
    parameters: {
      query?: never;
      header?: never;
      path?: never;
      cookie?: never;
    };
    /** getBoosterPortal */
    get: operations["getBoosterPortal"];
    put?: never;
    post?: never;
    delete?: never;
    options?: never;
    head?: never;
    patch?: never;
    trace?: never;
  };
  "/api/v1/admin/users": {
    parameters: {
      query?: never;
      header?: never;
      path?: never;
      cookie?: never;
    };
    /** getUsers */
    get: operations["getUsers"];
    put?: never;
    post?: never;
    delete?: never;
    options?: never;
    head?: never;
    patch?: never;
    trace?: never;
  };
  "/api/v1/admin/users/{id}": {
    parameters: {
      query?: never;
      header?: never;
      path?: never;
      cookie?: never;
    };
    /** getUser */
    get: operations["getUser"];
    put?: never;
    post?: never;
    delete?: never;
    options?: never;
    head?: never;
    patch?: never;
    trace?: never;
  };
  "/api/v1/admin/users/{id}/role": {
    parameters: {
      query?: never;
      header?: never;
      path?: never;
      cookie?: never;
    };
    get?: never;
    put?: never;
    /** changeRole */
    post: operations["changeRole"];
    delete?: never;
    options?: never;
    head?: never;
    patch?: never;
    trace?: never;
  };
  "/api/v1/admin/users/{id}/suspension": {
    parameters: {
      query?: never;
      header?: never;
      path?: never;
      cookie?: never;
    };
    get?: never;
    put?: never;
    /** changeSuspension */
    post: operations["changeSuspension"];
    delete?: never;
    options?: never;
    head?: never;
    patch?: never;
    trace?: never;
  };
  "/api/v1/admin/audit": {
    parameters: {
      query?: never;
      header?: never;
      path?: never;
      cookie?: never;
    };
    /** getAudit */
    get: operations["getAudit"];
    put?: never;
    post?: never;
    delete?: never;
    options?: never;
    head?: never;
    patch?: never;
    trace?: never;
  };
  "/api/v1/admin/recoveries": {
    parameters: {
      query?: never;
      header?: never;
      path?: never;
      cookie?: never;
    };
    /** getRecoveries */
    get: operations["getRecoveries"];
    put?: never;
    post?: never;
    delete?: never;
    options?: never;
    head?: never;
    patch?: never;
    trace?: never;
  };
  "/api/v1/admin/recoveries/{id}/resolve": {
    parameters: {
      query?: never;
      header?: never;
      path?: never;
      cookie?: never;
    };
    get?: never;
    put?: never;
    /** resolveRecovery */
    post: operations["resolveRecovery"];
    delete?: never;
    options?: never;
    head?: never;
    patch?: never;
    trace?: never;
  };
}
export type webhooks = Record<string, never>;
export interface components {
  schemas: {
    Health: {
      /** @enum {string} */
      status: "ok" | "not_ready";
    };
    Status: {
      /** @enum {string} */
      service: "booster-plus";
      release: string;
      /** @enum {string} */
      catalog: "prelaunch";
    };
    Problem: {
      type: string;
      title: string;
      status: number;
      code?: string;
    };
    User: {
      id: string;
      email: string;
      display_name: string;
      /** @enum {string} */
      role: "customer" | "booster" | "administrator" | "owner";
      staff_alias: string;
      suspended: boolean;
      mfa_enabled: boolean;
      notify_updates: boolean;
    };
    AuthSession: {
      user: components["schemas"]["User"] | null;
      csrf_token: string;
      google_enabled: boolean;
      google_linked: boolean;
      mfa_required: boolean;
      capabilities: string[];
      terms_version: string;
      terms_url: string;
    };
    EmailRequest: {
      email?: string;
      account_email?: string;
      /** @enum {string} */
      purpose: "login" | "reauth" | "email_change" | "recovery";
      accept_terms?: boolean;
    };
    EmailChallenge: {
      challenge_id: string;
      message: string;
    };
    EmailVerification: {
      challenge_id: string;
      code: string;
    };
    VerificationResult: {
      purpose: string;
    };
    GoogleRequest: {
      /** @enum {string} */
      purpose: "login" | "link" | "reauth";
      accept_terms?: boolean;
    };
    GoogleLocation: {
      /** Format: uri */
      url: string;
    };
    RevokeSessions: {
      id: string;
      all: boolean;
    };
    Enrollment: {
      secret: string;
      url: string;
    };
    MFAVerification: {
      code: string;
    };
    RecoveryCodes: {
      recovery_codes: string[];
    };
    ProfileChange: {
      display_name: string;
      staff_alias: string;
      notify_updates: boolean;
    };
    SessionList: {
      sessions: {
        id: string;
        /** Format: date-time */
        created_at: string;
        /** Format: date-time */
        last_seen_at: string;
        /** Format: date-time */
        expires_at: string;
        current: boolean;
      }[];
    };
    Users: {
      users: components["schemas"]["User"][];
    };
    RoleChange: {
      /** @enum {string} */
      role: "customer" | "booster" | "administrator" | "owner";
    };
    SuspensionChange: {
      suspended: boolean;
    };
    RecoveryDecision: {
      approve: boolean;
      case_reference: string;
    };
    Audits: {
      audits: {
        id: string;
        actor_id?: string;
        actor_reference?: string;
        action: string;
        target_id?: string;
        metadata?: {
          [key: string]: string;
        };
        /** Format: date-time */
        created_at: string;
      }[];
    };
    Recoveries: {
      recoveries: {
        id: string;
        user_id: string;
        new_email: string;
        state: string;
        case_reference?: string;
        /** Format: date-time */
        created_at: string;
        /** Format: date-time */
        expires_at: string;
      }[];
    };
    PortalReady: {
      /** @constant */
      status: "ready";
    };
  };
  responses: never;
  parameters: never;
  requestBodies: never;
  headers: never;
  pathItems: never;
}
export type $defs = Record<string, never>;
export interface operations {
  getLiveness: {
    parameters: {
      query?: never;
      header?: never;
      path?: never;
      cookie?: never;
    };
    requestBody?: never;
    responses: {
      /** @description Successful response */
      200: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          "application/json": components["schemas"]["Health"];
        };
      };
    };
  };
  getReadiness: {
    parameters: {
      query?: never;
      header?: never;
      path?: never;
      cookie?: never;
    };
    requestBody?: never;
    responses: {
      /** @description Successful response */
      200: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          "application/json": components["schemas"]["Health"];
        };
      };
      /** @description Dependencies are unavailable */
      503: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          "application/json": components["schemas"]["Health"];
        };
      };
    };
  };
  getServiceStatus: {
    parameters: {
      query?: never;
      header?: never;
      path?: never;
      cookie?: never;
    };
    requestBody?: never;
    responses: {
      /** @description Successful response */
      200: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          "application/json": components["schemas"]["Status"];
        };
      };
    };
  };
  getAuthSession: {
    parameters: {
      query?: never;
      header?: never;
      path?: never;
      cookie?: never;
    };
    requestBody?: never;
    responses: {
      /** @description Successful response */
      200: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          "application/json": components["schemas"]["AuthSession"];
        };
      };
      /** @description Request rejected; stable public error code. No secrets are returned. */
      default: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          "application/problem+json": components["schemas"]["Problem"];
        };
      };
    };
  };
  requestEmailCode: {
    parameters: {
      query?: never;
      header: {
        "X-CSRF-Token": string;
        Origin: string;
      };
      path?: never;
      cookie?: never;
    };
    requestBody: {
      content: {
        "application/json": components["schemas"]["EmailRequest"];
      };
    };
    responses: {
      /** @description Successful response */
      202: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          "application/json": components["schemas"]["EmailChallenge"];
        };
      };
      /** @description Request rejected; stable public error code. No secrets are returned. */
      default: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          "application/problem+json": components["schemas"]["Problem"];
        };
      };
    };
  };
  verifyEmailCode: {
    parameters: {
      query?: never;
      header: {
        "X-CSRF-Token": string;
        Origin: string;
      };
      path?: never;
      cookie?: never;
    };
    requestBody: {
      content: {
        "application/json": components["schemas"]["EmailVerification"];
      };
    };
    responses: {
      /** @description Successful response */
      200: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          "application/json": components["schemas"]["VerificationResult"];
        };
      };
      /** @description Request rejected; stable public error code. No secrets are returned. */
      default: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          "application/problem+json": components["schemas"]["Problem"];
        };
      };
    };
  };
  startGoogle: {
    parameters: {
      query?: never;
      header: {
        "X-CSRF-Token": string;
        Origin: string;
      };
      path?: never;
      cookie?: never;
    };
    requestBody: {
      content: {
        "application/json": components["schemas"]["GoogleRequest"];
      };
    };
    responses: {
      /** @description Successful response */
      200: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          "application/json": components["schemas"]["GoogleLocation"];
        };
      };
      /** @description Request rejected; stable public error code. No secrets are returned. */
      default: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          "application/problem+json": components["schemas"]["Problem"];
        };
      };
    };
  };
  finishGoogle: {
    parameters: {
      query: {
        state: string;
        code: string;
      };
      header?: never;
      path?: never;
      cookie?: never;
    };
    requestBody?: never;
    responses: {
      /** @description Successful response */
      303: {
        headers: {
          [name: string]: unknown;
        };
        content?: never;
      };
      /** @description Request rejected; stable public error code. No secrets are returned. */
      default: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          "application/problem+json": components["schemas"]["Problem"];
        };
      };
    };
  };
  logout: {
    parameters: {
      query?: never;
      header: {
        "X-CSRF-Token": string;
        Origin: string;
      };
      path?: never;
      cookie?: never;
    };
    requestBody?: never;
    responses: {
      /** @description Successful response */
      204: {
        headers: {
          [name: string]: unknown;
        };
        content?: never;
      };
      /** @description Request rejected; stable public error code. No secrets are returned. */
      default: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          "application/problem+json": components["schemas"]["Problem"];
        };
      };
    };
  };
  disableMFA: {
    parameters: {
      query?: never;
      header: {
        "X-CSRF-Token": string;
        Origin: string;
      };
      path?: never;
      cookie?: never;
    };
    requestBody?: never;
    responses: {
      /** @description Successful response */
      204: {
        headers: {
          [name: string]: unknown;
        };
        content?: never;
      };
      /** @description Request rejected; stable public error code. No secrets are returned. */
      default: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          "application/problem+json": components["schemas"]["Problem"];
        };
      };
    };
  };
  unlinkGoogle: {
    parameters: {
      query?: never;
      header: {
        "X-CSRF-Token": string;
        Origin: string;
      };
      path?: never;
      cookie?: never;
    };
    requestBody?: never;
    responses: {
      /** @description Successful response */
      204: {
        headers: {
          [name: string]: unknown;
        };
        content?: never;
      };
      /** @description Request rejected; stable public error code. No secrets are returned. */
      default: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          "application/problem+json": components["schemas"]["Problem"];
        };
      };
    };
  };
  revokeSessions: {
    parameters: {
      query?: never;
      header: {
        "X-CSRF-Token": string;
        Origin: string;
      };
      path?: never;
      cookie?: never;
    };
    requestBody: {
      content: {
        "application/json": components["schemas"]["RevokeSessions"];
      };
    };
    responses: {
      /** @description Successful response */
      204: {
        headers: {
          [name: string]: unknown;
        };
        content?: never;
      };
      /** @description Request rejected; stable public error code. No secrets are returned. */
      default: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          "application/problem+json": components["schemas"]["Problem"];
        };
      };
    };
  };
  enrollMFA: {
    parameters: {
      query?: never;
      header: {
        "X-CSRF-Token": string;
        Origin: string;
      };
      path?: never;
      cookie?: never;
    };
    requestBody?: never;
    responses: {
      /** @description Successful response */
      200: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          "application/json": components["schemas"]["Enrollment"];
        };
      };
      /** @description Request rejected; stable public error code. No secrets are returned. */
      default: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          "application/problem+json": components["schemas"]["Problem"];
        };
      };
    };
  };
  verifyMFA: {
    parameters: {
      query?: never;
      header: {
        "X-CSRF-Token": string;
        Origin: string;
      };
      path?: never;
      cookie?: never;
    };
    requestBody: {
      content: {
        "application/json": components["schemas"]["MFAVerification"];
      };
    };
    responses: {
      /** @description Successful response */
      200: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          "application/json": components["schemas"]["RecoveryCodes"];
        };
      };
      /** @description Request rejected; stable public error code. No secrets are returned. */
      default: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          "application/problem+json": components["schemas"]["Problem"];
        };
      };
    };
  };
  regenerateRecoveryCodes: {
    parameters: {
      query?: never;
      header: {
        "X-CSRF-Token": string;
        Origin: string;
      };
      path?: never;
      cookie?: never;
    };
    requestBody?: never;
    responses: {
      /** @description Successful response */
      200: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          "application/json": components["schemas"]["RecoveryCodes"];
        };
      };
      /** @description Request rejected; stable public error code. No secrets are returned. */
      default: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          "application/problem+json": components["schemas"]["Problem"];
        };
      };
    };
  };
  getProfile: {
    parameters: {
      query?: never;
      header?: never;
      path?: never;
      cookie?: never;
    };
    requestBody?: never;
    responses: {
      /** @description Successful response */
      200: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          "application/json": components["schemas"]["User"];
        };
      };
      /** @description Request rejected; stable public error code. No secrets are returned. */
      default: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          "application/problem+json": components["schemas"]["Problem"];
        };
      };
    };
  };
  updateProfile: {
    parameters: {
      query?: never;
      header: {
        "X-CSRF-Token": string;
        Origin: string;
      };
      path?: never;
      cookie?: never;
    };
    requestBody: {
      content: {
        "application/json": components["schemas"]["ProfileChange"];
      };
    };
    responses: {
      /** @description Successful response */
      204: {
        headers: {
          [name: string]: unknown;
        };
        content?: never;
      };
      /** @description Request rejected; stable public error code. No secrets are returned. */
      default: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          "application/problem+json": components["schemas"]["Problem"];
        };
      };
    };
  };
  getSessions: {
    parameters: {
      query?: never;
      header?: never;
      path?: never;
      cookie?: never;
    };
    requestBody?: never;
    responses: {
      /** @description Successful response */
      200: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          "application/json": components["schemas"]["SessionList"];
        };
      };
      /** @description Request rejected; stable public error code. No secrets are returned. */
      default: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          "application/problem+json": components["schemas"]["Problem"];
        };
      };
    };
  };
  getAdminPortal: {
    parameters: {
      query?: never;
      header?: never;
      path?: never;
      cookie?: never;
    };
    requestBody?: never;
    responses: {
      /** @description Successful response */
      200: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          "application/json": components["schemas"]["PortalReady"];
        };
      };
      /** @description Request rejected; stable public error code. No secrets are returned. */
      default: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          "application/problem+json": components["schemas"]["Problem"];
        };
      };
    };
  };
  getBoosterPortal: {
    parameters: {
      query?: never;
      header?: never;
      path?: never;
      cookie?: never;
    };
    requestBody?: never;
    responses: {
      /** @description Successful response */
      200: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          "application/json": components["schemas"]["PortalReady"];
        };
      };
      /** @description Request rejected; stable public error code. No secrets are returned. */
      default: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          "application/problem+json": components["schemas"]["Problem"];
        };
      };
    };
  };
  getUsers: {
    parameters: {
      query?: never;
      header?: never;
      path?: never;
      cookie?: never;
    };
    requestBody?: never;
    responses: {
      /** @description Successful response */
      200: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          "application/json": components["schemas"]["Users"];
        };
      };
      /** @description Request rejected; stable public error code. No secrets are returned. */
      default: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          "application/problem+json": components["schemas"]["Problem"];
        };
      };
    };
  };
  getUser: {
    parameters: {
      query?: never;
      header?: never;
      path: {
        id: string;
      };
      cookie?: never;
    };
    requestBody?: never;
    responses: {
      /** @description Successful response */
      200: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          "application/json": components["schemas"]["User"];
        };
      };
      /** @description Request rejected; stable public error code. No secrets are returned. */
      default: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          "application/problem+json": components["schemas"]["Problem"];
        };
      };
    };
  };
  changeRole: {
    parameters: {
      query?: never;
      header: {
        "X-CSRF-Token": string;
        Origin: string;
      };
      path: {
        id: string;
      };
      cookie?: never;
    };
    requestBody: {
      content: {
        "application/json": components["schemas"]["RoleChange"];
      };
    };
    responses: {
      /** @description Successful response */
      204: {
        headers: {
          [name: string]: unknown;
        };
        content?: never;
      };
      /** @description Request rejected; stable public error code. No secrets are returned. */
      default: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          "application/problem+json": components["schemas"]["Problem"];
        };
      };
    };
  };
  changeSuspension: {
    parameters: {
      query?: never;
      header: {
        "X-CSRF-Token": string;
        Origin: string;
      };
      path: {
        id: string;
      };
      cookie?: never;
    };
    requestBody: {
      content: {
        "application/json": components["schemas"]["SuspensionChange"];
      };
    };
    responses: {
      /** @description Successful response */
      204: {
        headers: {
          [name: string]: unknown;
        };
        content?: never;
      };
      /** @description Request rejected; stable public error code. No secrets are returned. */
      default: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          "application/problem+json": components["schemas"]["Problem"];
        };
      };
    };
  };
  getAudit: {
    parameters: {
      query?: never;
      header?: never;
      path?: never;
      cookie?: never;
    };
    requestBody?: never;
    responses: {
      /** @description Successful response */
      200: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          "application/json": components["schemas"]["Audits"];
        };
      };
      /** @description Request rejected; stable public error code. No secrets are returned. */
      default: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          "application/problem+json": components["schemas"]["Problem"];
        };
      };
    };
  };
  getRecoveries: {
    parameters: {
      query?: never;
      header?: never;
      path?: never;
      cookie?: never;
    };
    requestBody?: never;
    responses: {
      /** @description Successful response */
      200: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          "application/json": components["schemas"]["Recoveries"];
        };
      };
      /** @description Request rejected; stable public error code. No secrets are returned. */
      default: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          "application/problem+json": components["schemas"]["Problem"];
        };
      };
    };
  };
  resolveRecovery: {
    parameters: {
      query?: never;
      header: {
        "X-CSRF-Token": string;
        Origin: string;
      };
      path: {
        id: string;
      };
      cookie?: never;
    };
    requestBody: {
      content: {
        "application/json": components["schemas"]["RecoveryDecision"];
      };
    };
    responses: {
      /** @description Successful response */
      204: {
        headers: {
          [name: string]: unknown;
        };
        content?: never;
      };
      /** @description Request rejected; stable public error code. No secrets are returned. */
      default: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          "application/problem+json": components["schemas"]["Problem"];
        };
      };
    };
  };
}
