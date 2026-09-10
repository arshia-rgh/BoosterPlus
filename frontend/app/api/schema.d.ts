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
  "/api/v1/catalog/games": {
    parameters: {
      query?: never;
      header?: never;
      path?: never;
      cookie?: never;
    };
    /** listCatalogGames */
    get: operations["listCatalogGames"];
    put?: never;
    post?: never;
    delete?: never;
    options?: never;
    head?: never;
    patch?: never;
    trace?: never;
  };
  "/api/v1/catalog/games/{slug}": {
    parameters: {
      query?: never;
      header?: never;
      path?: never;
      cookie?: never;
    };
    /** getCatalogGame */
    get: operations["getCatalogGame"];
    put?: never;
    post?: never;
    delete?: never;
    options?: never;
    head?: never;
    patch?: never;
    trace?: never;
  };
  "/api/v1/catalog/games/{slug}/validate": {
    parameters: {
      query?: never;
      header?: never;
      path?: never;
      cookie?: never;
    };
    get?: never;
    put?: never;
    /** validateCatalogAnswers */
    post: operations["validateCatalogAnswers"];
    delete?: never;
    options?: never;
    head?: never;
    patch?: never;
    trace?: never;
  };
  "/api/v1/admin/catalog/games": {
    parameters: {
      query?: never;
      header?: never;
      path?: never;
      cookie?: never;
    };
    /** listCatalogDrafts */
    get: operations["listCatalogDrafts"];
    put?: never;
    /** createCatalogDraft */
    post: operations["createCatalogDraft"];
    delete?: never;
    options?: never;
    head?: never;
    patch?: never;
    trace?: never;
  };
  "/api/v1/admin/catalog/games/{id}": {
    parameters: {
      query?: never;
      header?: never;
      path?: never;
      cookie?: never;
    };
    /** getCatalogDraft */
    get: operations["getCatalogDraft"];
    put?: never;
    post?: never;
    delete?: never;
    options?: never;
    head?: never;
    patch?: never;
    trace?: never;
  };
  "/api/v1/admin/catalog/games/{id}/preview": {
    parameters: {
      query?: never;
      header?: never;
      path?: never;
      cookie?: never;
    };
    /** previewCatalogDraft */
    get: operations["previewCatalogDraft"];
    put?: never;
    post?: never;
    delete?: never;
    options?: never;
    head?: never;
    patch?: never;
    trace?: never;
  };
  "/api/v1/admin/catalog/games/{id}/history": {
    parameters: {
      query?: never;
      header?: never;
      path?: never;
      cookie?: never;
    };
    /** getCatalogHistory */
    get: operations["getCatalogHistory"];
    put?: never;
    post?: never;
    delete?: never;
    options?: never;
    head?: never;
    patch?: never;
    trace?: never;
  };
  "/api/v1/admin/catalog/games/{id}/save": {
    parameters: {
      query?: never;
      header?: never;
      path?: never;
      cookie?: never;
    };
    get?: never;
    put?: never;
    /** saveCatalogDraft */
    post: operations["saveCatalogDraft"];
    delete?: never;
    options?: never;
    head?: never;
    patch?: never;
    trace?: never;
  };
  "/api/v1/admin/catalog/games/{id}/publish": {
    parameters: {
      query?: never;
      header?: never;
      path?: never;
      cookie?: never;
    };
    get?: never;
    put?: never;
    /** publishCatalogDraft */
    post: operations["publishCatalogDraft"];
    delete?: never;
    options?: never;
    head?: never;
    patch?: never;
    trace?: never;
  };
  "/api/v1/admin/catalog/games/{id}/pause": {
    parameters: {
      query?: never;
      header?: never;
      path?: never;
      cookie?: never;
    };
    get?: never;
    put?: never;
    /** pauseCatalogDraft */
    post: operations["pauseCatalogDraft"];
    delete?: never;
    options?: never;
    head?: never;
    patch?: never;
    trace?: never;
  };
  "/api/v1/admin/catalog/games/{id}/resume": {
    parameters: {
      query?: never;
      header?: never;
      path?: never;
      cookie?: never;
    };
    get?: never;
    put?: never;
    /** resumeCatalogDraft */
    post: operations["resumeCatalogDraft"];
    delete?: never;
    options?: never;
    head?: never;
    patch?: never;
    trace?: never;
  };
  "/api/v1/admin/catalog/games/{id}/archive": {
    parameters: {
      query?: never;
      header?: never;
      path?: never;
      cookie?: never;
    };
    get?: never;
    put?: never;
    /** archiveCatalogDraft */
    post: operations["archiveCatalogDraft"];
    delete?: never;
    options?: never;
    head?: never;
    patch?: never;
    trace?: never;
  };
  "/api/v1/admin/catalog/games/{id}/restore": {
    parameters: {
      query?: never;
      header?: never;
      path?: never;
      cookie?: never;
    };
    get?: never;
    put?: never;
    /** restoreCatalogDraft */
    post: operations["restoreCatalogDraft"];
    delete?: never;
    options?: never;
    head?: never;
    patch?: never;
    trace?: never;
  };
  "/api/v1/admin/catalog/games/{id}/delete": {
    parameters: {
      query?: never;
      header?: never;
      path?: never;
      cookie?: never;
    };
    get?: never;
    put?: never;
    /** deleteCatalogDraft */
    post: operations["deleteCatalogDraft"];
    delete?: never;
    options?: never;
    head?: never;
    patch?: never;
    trace?: never;
  };
  "/api/v1/admin/catalog/games/{id}/validate-preview": {
    parameters: {
      query?: never;
      header?: never;
      path?: never;
      cookie?: never;
    };
    get?: never;
    put?: never;
    /** Validate ordinary answers against a saved administrator draft */
    post: operations["validateCatalogPreview"];
    delete?: never;
    options?: never;
    head?: never;
    patch?: never;
    trace?: never;
  };
  "/api/v1/catalog/games/{slug}/estimate": {
    parameters: {
      query?: never;
      header?: never;
      path?: never;
      cookie?: never;
    };
    get?: never;
    put?: never;
    /** Calculate a versioned, provisional estimate. Never authorizes checkout. */
    post: operations["estimateCatalogPrice"];
    delete?: never;
    options?: never;
    head?: never;
    patch?: never;
    trace?: never;
  };
  "/api/v1/admin/catalog/games/{id}/estimate-preview": {
    parameters: {
      query?: never;
      header?: never;
      path?: never;
      cookie?: never;
    };
    get?: never;
    put?: never;
    /** Calculate a versioned, provisional estimate. Never authorizes checkout. */
    post: operations["previewCatalogPrice"];
    delete?: never;
    options?: never;
    head?: never;
    patch?: never;
    trace?: never;
  };
  "/api/v1/admin/catalog/coupons": {
    parameters: {
      query?: never;
      header?: never;
      path?: never;
      cookie?: never;
    };
    /** listCoupons */
    get: operations["listCoupons"];
    put?: never;
    /** createCoupon */
    post: operations["createCoupon"];
    delete?: never;
    options?: never;
    head?: never;
    patch?: never;
    trace?: never;
  };
  "/api/v1/admin/catalog/coupons/{id}/save": {
    parameters: {
      query?: never;
      header?: never;
      path?: never;
      cookie?: never;
    };
    get?: never;
    put?: never;
    /** saveCoupon */
    post: operations["saveCoupon"];
    delete?: never;
    options?: never;
    head?: never;
    patch?: never;
    trace?: never;
  };
  "/api/v1/admin/catalog/coupons/{id}/history": {
    parameters: {
      query?: never;
      header?: never;
      path?: never;
      cookie?: never;
    };
    /** couponHistory */
    get: operations["couponHistory"];
    put?: never;
    post?: never;
    delete?: never;
    options?: never;
    head?: never;
    patch?: never;
    trace?: never;
  };
  "/api/v1/catalog/games/{slug}/discount": {
    parameters: {
      query?: never;
      header?: never;
      path?: never;
      cookie?: never;
    };
    get?: never;
    put?: never;
    /** Indicative current-price coupon check, limited to 30 attempts per minute per verified client address and signed-in account. Does not reserve a use or authorize payment. */
    post: operations["checkCoupon"];
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
    CatalogConfiguration: {
      /** @constant */
      schema_version: 1;
      name: string;
      description: string;
      asset: string;
      asset_alt: string;
      reviewed: boolean;
      references: components["schemas"]["CatalogReference"][] | null;
      services: components["schemas"]["CatalogServiceDefinition"][] | null;
      packages: components["schemas"]["CatalogPackage"][] | null;
      faqs: components["schemas"]["CatalogFAQ"][] | null;
    };
    CatalogReference: {
      key: string;
      label: string;
      kind: string;
      options: components["schemas"]["CatalogOption"][] | null;
    };
    CatalogOption: {
      key: string;
      label: string;
      units: number;
    };
    CatalogServiceDefinition: {
      key: string;
      name: string;
      description: string;
      evaluator: string;
      fields: components["schemas"]["CatalogField"][] | null;
      rules: components["schemas"]["CatalogRule"][] | null;
      pricing?: components["schemas"]["CatalogPricePlan"];
    };
    CatalogField: {
      key: string;
      label: string;
      help: string;
      /** @enum {string} */
      type:
        | "select"
        | "radio"
        | "rank"
        | "multiselect"
        | "boolean"
        | "integer"
        | "decimal"
        | "short_text"
        | "long_text"
        | "attachment";
      /** @enum {string} */
      stage: "estimate" | "order" | "fulfillment";
      required: boolean;
      reference: string;
      options: components["schemas"]["CatalogOption"][] | null;
      min: string;
      max: string;
      step: string;
      unit: string;
      min_length: number;
      max_length: number;
      min_selections: number;
      max_selections: number;
      default?: string | boolean | string[];
      visible_when?: components["schemas"]["CatalogCondition"];
      required_when?: components["schemas"]["CatalogCondition"];
    };
    CatalogCondition: {
      op: string;
      field: string;
      values: string[] | null;
      children: components["schemas"]["CatalogCondition"][] | null;
    };
    CatalogRule: {
      key: string;
      kind: string;
      message: string;
      when?: components["schemas"]["CatalogCondition"];
      from: string;
      to: string;
      from_units: string;
      to_units: string;
    };
    CatalogPackage: {
      key: string;
      name: string;
      description: string;
      service: string;
      variants: components["schemas"]["CatalogVariant"][] | null;
    };
    CatalogVariant: {
      key: string;
      name: string;
      currency: string;
      amount_minor: string;
      capacity?: number;
      delivery_min_hours: number;
      delivery_max_hours: number;
      required_fields: string[] | null;
      eligibility?: components["schemas"]["CatalogCondition"];
    };
    CatalogFAQ: {
      question: string;
      answer: string;
    };
    CatalogIssue: {
      path: string;
      message: string;
    };
    CatalogValidation: {
      answers: {
        [key: string]: string | boolean | string[];
      };
      issues: components["schemas"]["CatalogIssue"][] | null;
    };
    CatalogDraft: {
      id: string;
      slug: string;
      revision: number;
      published: boolean;
      paused: boolean;
      archived: boolean;
      current_release: string;
      configuration: components["schemas"]["CatalogConfiguration"];
    };
    CatalogListing: {
      games: components["schemas"]["CatalogSummary"][] | null;
      next: string;
    };
    CatalogSummary: {
      id: string;
      slug: string;
      name: string;
      description: string;
      asset: string;
      asset_alt: string;
      paused: boolean;
      published: boolean;
      archived: boolean;
      revision: number;
    };
    CatalogRelease: {
      id: string;
      game_id: string;
      slug: string;
      version: number;
      paused: boolean;
      /** Format: date-time */
      created_at: string;
      configuration: components["schemas"]["CatalogConfiguration"];
    };
    CatalogChange: {
      revision: number;
      configuration: components["schemas"]["CatalogConfiguration"];
    };
    CatalogCreate: {
      slug: string;
      configuration: components["schemas"]["CatalogConfiguration"];
    };
    CatalogValidationInput: {
      release_id: string;
      service: string;
      /** @enum {string} */
      stage: "estimate" | "order";
      package?: string;
      variant?: string;
      answers: {
        [key: string]: string | boolean | string[];
      };
    };
    CatalogProblem: {
      code: string;
      issues?: components["schemas"]["CatalogIssue"][] | null;
    };
    CatalogPreview: {
      draft: components["schemas"]["CatalogDraft"];
      issues: components["schemas"]["CatalogIssue"][] | null;
    };
    CatalogHistory: {
      releases: components["schemas"]["CatalogRelease"][] | null;
    };
    CatalogPreviewInput: {
      /** @description Saved draft revision as a decimal integer string. */
      release_id: string;
      service: string;
      /** @enum {string} */
      stage: "estimate" | "order" | "fulfillment";
      package?: string;
      variant?: string;
      answers: {
        [key: string]: string | boolean | string[];
      };
    };
    CatalogRankPrice: {
      rank: string;
      amount_minor: string;
    };
    CatalogPriceRule: {
      key: string;
      label: string;
      kind: string;
      value: string;
      field: string;
      from: string;
      to: string;
      from_units: string;
      to_units: string;
      intervals: components["schemas"]["CatalogRankPrice"][] | null;
      when?: components["schemas"]["CatalogCondition"];
    };
    CatalogPriceCase: {
      key: string;
      answers: {
        [key: string]: string | boolean | string[];
      };
      outcome: string;
      amount_minor: string;
    };
    CatalogPricePlan: {
      currency: string;
      base_minor: string;
      minimum_minor: string;
      maximum_minor: string;
      rules: components["schemas"]["CatalogPriceRule"][] | null;
      cases: components["schemas"]["CatalogPriceCase"][] | null;
    };
    CatalogPriceLine: {
      key: string;
      label: string;
      amount_minor: string;
    };
    CatalogEstimate: {
      release_id: string;
      evaluator: string;
      expires_at: string;
      outcome: string;
      currency: string;
      amount_minor: string;
      version: number;
      answers: {
        [key: string]: string | boolean | string[];
      };
      lines: components["schemas"]["CatalogPriceLine"][] | null;
      issues: components["schemas"]["CatalogIssue"][] | null;
      discount?: components["schemas"]["CouponDiscount"];
    };
    CatalogEstimateInput: {
      release_id: string;
      service: string;
      answers: {
        [key: string]: string | boolean | string[];
      };
    };
    CouponDefinition: {
      code: string;
      name: string;
      kind: string;
      value: string;
      currency: string;
      starts_at: string;
      ends_at: string;
      minimum_subtotal: string;
      maximum_discount: string;
      enabled: boolean;
      global_limit: number;
      customer_limit: number;
      games: string[] | null;
      services: string[] | null;
      packages: string[] | null;
      categories: string[] | null;
    };
    CouponView: {
      id: string;
      version: number;
      definition: components["schemas"]["CouponDefinition"];
    };
    CouponListing: {
      coupons: components["schemas"]["CouponView"][] | null;
      next: string;
    };
    CouponHistory: {
      coupons: components["schemas"]["CouponView"][] | null;
    };
    CouponSave: {
      version: number;
      definition: components["schemas"]["CouponDefinition"];
    };
    CouponCheck: {
      release_id: string;
      service: string;
      package: string;
      variant: string;
      code: string;
      answers: {
        [key: string]: string | boolean | string[];
      };
    };
    CouponDiscount: {
      coupon_id: string;
      version: number;
      code: string;
      amount_minor: string;
      indicative: boolean;
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
  listCatalogGames: {
    parameters: {
      query?: {
        after?: string;
      };
      header?: never;
      path?: never;
      cookie?: never;
    };
    requestBody?: never;
    responses: {
      /** @description Successful catalog response */
      200: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          "application/json": components["schemas"]["CatalogListing"];
        };
      };
      /** @description Revision changed or availability conflicts; reload the current catalog. */
      409: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          "application/json": components["schemas"]["CatalogProblem"];
        };
      };
      /** @description Configuration/request validation failed. */
      422: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          "application/json": components["schemas"]["CatalogProblem"];
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
  getCatalogGame: {
    parameters: {
      query?: never;
      header?: never;
      path: {
        slug: string;
      };
      cookie?: never;
    };
    requestBody?: never;
    responses: {
      /** @description Successful catalog response */
      200: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          "application/json": components["schemas"]["CatalogRelease"];
        };
      };
      /** @description Revision changed or availability conflicts; reload the current catalog. */
      409: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          "application/json": components["schemas"]["CatalogProblem"];
        };
      };
      /** @description Configuration/request validation failed. */
      422: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          "application/json": components["schemas"]["CatalogProblem"];
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
  validateCatalogAnswers: {
    parameters: {
      query?: never;
      header: {
        "X-CSRF-Token": string;
      };
      path: {
        slug: string;
      };
      cookie?: never;
    };
    requestBody: {
      content: {
        "application/json": components["schemas"]["CatalogValidationInput"];
      };
    };
    responses: {
      /** @description Successful catalog response */
      200: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          "application/json": components["schemas"]["CatalogValidation"];
        };
      };
      /** @description Revision changed or availability conflicts; reload the current catalog. */
      409: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          "application/json": components["schemas"]["CatalogProblem"];
        };
      };
      /** @description Configuration/request validation failed. */
      422: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          "application/json": components["schemas"]["CatalogProblem"];
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
  listCatalogDrafts: {
    parameters: {
      query?: {
        after?: string;
      };
      header?: never;
      path?: never;
      cookie?: never;
    };
    requestBody?: never;
    responses: {
      /** @description Successful catalog response */
      200: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          "application/json": components["schemas"]["CatalogListing"];
        };
      };
      /** @description Revision changed or availability conflicts; reload the current catalog. */
      409: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          "application/json": components["schemas"]["CatalogProblem"];
        };
      };
      /** @description Configuration/request validation failed. */
      422: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          "application/json": components["schemas"]["CatalogProblem"];
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
  createCatalogDraft: {
    parameters: {
      query?: never;
      header: {
        "X-CSRF-Token": string;
      };
      path?: never;
      cookie?: never;
    };
    requestBody: {
      content: {
        "application/json": components["schemas"]["CatalogCreate"];
      };
    };
    responses: {
      /** @description Successful catalog response */
      201: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          "application/json": components["schemas"]["CatalogDraft"];
        };
      };
      /** @description Revision changed or availability conflicts; reload the current catalog. */
      409: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          "application/json": components["schemas"]["CatalogProblem"];
        };
      };
      /** @description Configuration/request validation failed. */
      422: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          "application/json": components["schemas"]["CatalogProblem"];
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
  getCatalogDraft: {
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
      /** @description Successful catalog response */
      200: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          "application/json": components["schemas"]["CatalogDraft"];
        };
      };
      /** @description Revision changed or availability conflicts; reload the current catalog. */
      409: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          "application/json": components["schemas"]["CatalogProblem"];
        };
      };
      /** @description Configuration/request validation failed. */
      422: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          "application/json": components["schemas"]["CatalogProblem"];
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
  previewCatalogDraft: {
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
      /** @description Successful catalog response */
      200: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          "application/json": components["schemas"]["CatalogPreview"];
        };
      };
      /** @description Revision changed or availability conflicts; reload the current catalog. */
      409: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          "application/json": components["schemas"]["CatalogProblem"];
        };
      };
      /** @description Configuration/request validation failed. */
      422: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          "application/json": components["schemas"]["CatalogProblem"];
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
  getCatalogHistory: {
    parameters: {
      query?: {
        before?: number;
      };
      header?: never;
      path: {
        id: string;
      };
      cookie?: never;
    };
    requestBody?: never;
    responses: {
      /** @description Successful catalog response */
      200: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          "application/json": components["schemas"]["CatalogHistory"];
        };
      };
      /** @description Revision changed or availability conflicts; reload the current catalog. */
      409: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          "application/json": components["schemas"]["CatalogProblem"];
        };
      };
      /** @description Configuration/request validation failed. */
      422: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          "application/json": components["schemas"]["CatalogProblem"];
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
  saveCatalogDraft: {
    parameters: {
      query?: never;
      header: {
        "X-CSRF-Token": string;
      };
      path: {
        id: string;
      };
      cookie?: never;
    };
    requestBody: {
      content: {
        "application/json": components["schemas"]["CatalogChange"];
      };
    };
    responses: {
      /** @description Successful catalog response */
      200: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          "application/json": components["schemas"]["CatalogDraft"];
        };
      };
      /** @description Revision changed or availability conflicts; reload the current catalog. */
      409: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          "application/json": components["schemas"]["CatalogProblem"];
        };
      };
      /** @description Configuration/request validation failed. */
      422: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          "application/json": components["schemas"]["CatalogProblem"];
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
  publishCatalogDraft: {
    parameters: {
      query?: never;
      header: {
        "X-CSRF-Token": string;
      };
      path: {
        id: string;
      };
      cookie?: never;
    };
    requestBody: {
      content: {
        "application/json": components["schemas"]["CatalogChange"];
      };
    };
    responses: {
      /** @description Successful catalog response */
      200: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          "application/json": components["schemas"]["CatalogDraft"];
        };
      };
      /** @description Revision changed or availability conflicts; reload the current catalog. */
      409: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          "application/json": components["schemas"]["CatalogProblem"];
        };
      };
      /** @description Configuration/request validation failed. */
      422: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          "application/json": components["schemas"]["CatalogProblem"];
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
  pauseCatalogDraft: {
    parameters: {
      query?: never;
      header: {
        "X-CSRF-Token": string;
      };
      path: {
        id: string;
      };
      cookie?: never;
    };
    requestBody: {
      content: {
        "application/json": components["schemas"]["CatalogChange"];
      };
    };
    responses: {
      /** @description Successful catalog response */
      200: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          "application/json": components["schemas"]["CatalogDraft"];
        };
      };
      /** @description Revision changed or availability conflicts; reload the current catalog. */
      409: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          "application/json": components["schemas"]["CatalogProblem"];
        };
      };
      /** @description Configuration/request validation failed. */
      422: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          "application/json": components["schemas"]["CatalogProblem"];
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
  resumeCatalogDraft: {
    parameters: {
      query?: never;
      header: {
        "X-CSRF-Token": string;
      };
      path: {
        id: string;
      };
      cookie?: never;
    };
    requestBody: {
      content: {
        "application/json": components["schemas"]["CatalogChange"];
      };
    };
    responses: {
      /** @description Successful catalog response */
      200: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          "application/json": components["schemas"]["CatalogDraft"];
        };
      };
      /** @description Revision changed or availability conflicts; reload the current catalog. */
      409: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          "application/json": components["schemas"]["CatalogProblem"];
        };
      };
      /** @description Configuration/request validation failed. */
      422: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          "application/json": components["schemas"]["CatalogProblem"];
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
  archiveCatalogDraft: {
    parameters: {
      query?: never;
      header: {
        "X-CSRF-Token": string;
      };
      path: {
        id: string;
      };
      cookie?: never;
    };
    requestBody: {
      content: {
        "application/json": components["schemas"]["CatalogChange"];
      };
    };
    responses: {
      /** @description Successful catalog response */
      200: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          "application/json": components["schemas"]["CatalogDraft"];
        };
      };
      /** @description Revision changed or availability conflicts; reload the current catalog. */
      409: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          "application/json": components["schemas"]["CatalogProblem"];
        };
      };
      /** @description Configuration/request validation failed. */
      422: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          "application/json": components["schemas"]["CatalogProblem"];
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
  restoreCatalogDraft: {
    parameters: {
      query?: never;
      header: {
        "X-CSRF-Token": string;
      };
      path: {
        id: string;
      };
      cookie?: never;
    };
    requestBody: {
      content: {
        "application/json": components["schemas"]["CatalogChange"];
      };
    };
    responses: {
      /** @description Successful catalog response */
      200: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          "application/json": components["schemas"]["CatalogDraft"];
        };
      };
      /** @description Revision changed or availability conflicts; reload the current catalog. */
      409: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          "application/json": components["schemas"]["CatalogProblem"];
        };
      };
      /** @description Configuration/request validation failed. */
      422: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          "application/json": components["schemas"]["CatalogProblem"];
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
  deleteCatalogDraft: {
    parameters: {
      query?: never;
      header: {
        "X-CSRF-Token": string;
      };
      path: {
        id: string;
      };
      cookie?: never;
    };
    requestBody: {
      content: {
        "application/json": components["schemas"]["CatalogChange"];
      };
    };
    responses: {
      /** @description Unpublished game deleted. */
      204: {
        headers: {
          [name: string]: unknown;
        };
        content?: never;
      };
      /** @description Revision changed or availability conflicts; reload the current catalog. */
      409: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          "application/json": components["schemas"]["CatalogProblem"];
        };
      };
      /** @description Configuration/request validation failed. */
      422: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          "application/json": components["schemas"]["CatalogProblem"];
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
  validateCatalogPreview: {
    parameters: {
      query?: never;
      header: {
        "X-CSRF-Token": string;
      };
      path: {
        id: string;
      };
      cookie?: never;
    };
    requestBody: {
      content: {
        "application/json": components["schemas"]["CatalogPreviewInput"];
      };
    };
    responses: {
      /** @description Successful catalog response */
      200: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          "application/json": components["schemas"]["CatalogValidation"];
        };
      };
      /** @description Revision changed or availability conflicts; reload the current catalog. */
      409: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          "application/json": components["schemas"]["CatalogProblem"];
        };
      };
      /** @description Configuration/request validation failed. */
      422: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          "application/json": components["schemas"]["CatalogProblem"];
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
  estimateCatalogPrice: {
    parameters: {
      query?: never;
      header: {
        "X-CSRF-Token": string;
      };
      path: {
        slug: string;
      };
      cookie?: never;
    };
    requestBody: {
      content: {
        "application/json": components["schemas"]["CatalogEstimateInput"];
      };
    };
    responses: {
      /** @description Successful catalog response */
      200: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          "application/json": components["schemas"]["CatalogEstimate"];
        };
      };
      /** @description Revision changed or availability conflicts; reload the current catalog. */
      409: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          "application/json": components["schemas"]["CatalogProblem"];
        };
      };
      /** @description Configuration/request validation failed. */
      422: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          "application/json": components["schemas"]["CatalogProblem"];
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
  previewCatalogPrice: {
    parameters: {
      query?: never;
      header: {
        "X-CSRF-Token": string;
      };
      path: {
        id: string;
      };
      cookie?: never;
    };
    requestBody: {
      content: {
        "application/json": components["schemas"]["CatalogEstimateInput"];
      };
    };
    responses: {
      /** @description Successful catalog response */
      200: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          "application/json": components["schemas"]["CatalogEstimate"];
        };
      };
      /** @description Revision changed or availability conflicts; reload the current catalog. */
      409: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          "application/json": components["schemas"]["CatalogProblem"];
        };
      };
      /** @description Configuration/request validation failed. */
      422: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          "application/json": components["schemas"]["CatalogProblem"];
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
  listCoupons: {
    parameters: {
      query?: {
        after?: string;
      };
      header?: never;
      path?: never;
      cookie?: never;
    };
    requestBody?: never;
    responses: {
      /** @description Successful catalog response */
      200: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          "application/json": components["schemas"]["CouponListing"];
        };
      };
      /** @description Revision changed or availability conflicts; reload the current catalog. */
      409: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          "application/json": components["schemas"]["CatalogProblem"];
        };
      };
      /** @description Configuration/request validation failed. */
      422: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          "application/json": components["schemas"]["CatalogProblem"];
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
  createCoupon: {
    parameters: {
      query?: never;
      header: {
        "X-CSRF-Token": string;
      };
      path?: never;
      cookie?: never;
    };
    requestBody: {
      content: {
        "application/json": components["schemas"]["CouponSave"];
      };
    };
    responses: {
      /** @description Successful catalog response */
      201: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          "application/json": components["schemas"]["CouponView"];
        };
      };
      /** @description Revision changed or availability conflicts; reload the current catalog. */
      409: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          "application/json": components["schemas"]["CatalogProblem"];
        };
      };
      /** @description Configuration/request validation failed. */
      422: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          "application/json": components["schemas"]["CatalogProblem"];
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
  saveCoupon: {
    parameters: {
      query?: never;
      header: {
        "X-CSRF-Token": string;
      };
      path: {
        id: string;
      };
      cookie?: never;
    };
    requestBody: {
      content: {
        "application/json": components["schemas"]["CouponSave"];
      };
    };
    responses: {
      /** @description Successful catalog response */
      200: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          "application/json": components["schemas"]["CouponView"];
        };
      };
      /** @description Revision changed or availability conflicts; reload the current catalog. */
      409: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          "application/json": components["schemas"]["CatalogProblem"];
        };
      };
      /** @description Configuration/request validation failed. */
      422: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          "application/json": components["schemas"]["CatalogProblem"];
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
  couponHistory: {
    parameters: {
      query?: {
        before?: number;
      };
      header?: never;
      path: {
        id: string;
      };
      cookie?: never;
    };
    requestBody?: never;
    responses: {
      /** @description Successful catalog response */
      200: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          "application/json": components["schemas"]["CouponHistory"];
        };
      };
      /** @description Revision changed or availability conflicts; reload the current catalog. */
      409: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          "application/json": components["schemas"]["CatalogProblem"];
        };
      };
      /** @description Configuration/request validation failed. */
      422: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          "application/json": components["schemas"]["CatalogProblem"];
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
  checkCoupon: {
    parameters: {
      query?: never;
      header: {
        "X-CSRF-Token": string;
      };
      path: {
        slug: string;
      };
      cookie?: never;
    };
    requestBody: {
      content: {
        "application/json": components["schemas"]["CouponCheck"];
      };
    };
    responses: {
      /** @description Successful catalog response */
      200: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          "application/json": components["schemas"]["CatalogEstimate"];
        };
      };
      /** @description Revision changed or availability conflicts; reload the current catalog. */
      409: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          "application/json": components["schemas"]["CatalogProblem"];
        };
      };
      /** @description Configuration/request validation failed. */
      422: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          "application/json": components["schemas"]["CatalogProblem"];
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
}
