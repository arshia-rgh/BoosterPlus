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
  "/api/v1/orders": {
    parameters: {
      query?: never;
      header?: never;
      path?: never;
      cookie?: never;
    };
    /** customerOrders */
    get: operations["customerOrders"];
    put?: never;
    /** Idempotent request creation, limited to 20 per hour per address and signed-in customer. Packages reserve current capacity and coupon usage atomically; custom requests require a quote. Never marks payment verified. */
    post: operations["createOrder"];
    delete?: never;
    options?: never;
    head?: never;
    patch?: never;
    trace?: never;
  };
  "/api/v1/orders/{id}": {
    parameters: {
      query?: never;
      header?: never;
      path?: never;
      cookie?: never;
    };
    /** customerOrder */
    get: operations["customerOrder"];
    put?: never;
    post?: never;
    delete?: never;
    options?: never;
    head?: never;
    patch?: never;
    trace?: never;
  };
  "/api/v1/orders/{id}/events": {
    parameters: {
      query?: never;
      header?: never;
      path?: never;
      cookie?: never;
    };
    /** customerOrderEvents */
    get: operations["customerOrderEvents"];
    put?: never;
    post?: never;
    delete?: never;
    options?: never;
    head?: never;
    patch?: never;
    trace?: never;
  };
  "/api/v1/orders/{id}/quotes": {
    parameters: {
      query?: never;
      header?: never;
      path?: never;
      cookie?: never;
    };
    /** customerOrderQuotes */
    get: operations["customerOrderQuotes"];
    put?: never;
    post?: never;
    delete?: never;
    options?: never;
    head?: never;
    patch?: never;
    trace?: never;
  };
  "/api/v1/orders/{id}/accept": {
    parameters: {
      query?: never;
      header?: never;
      path?: never;
      cookie?: never;
    };
    get?: never;
    put?: never;
    /** customerAcceptOrder */
    post: operations["customerAcceptOrder"];
    delete?: never;
    options?: never;
    head?: never;
    patch?: never;
    trace?: never;
  };
  "/api/v1/orders/{id}/decline": {
    parameters: {
      query?: never;
      header?: never;
      path?: never;
      cookie?: never;
    };
    get?: never;
    put?: never;
    /** customerDeclineOrder */
    post: operations["customerDeclineOrder"];
    delete?: never;
    options?: never;
    head?: never;
    patch?: never;
    trace?: never;
  };
  "/api/v1/orders/{id}/cancel": {
    parameters: {
      query?: never;
      header?: never;
      path?: never;
      cookie?: never;
    };
    get?: never;
    put?: never;
    /** customerCancelOrder */
    post: operations["customerCancelOrder"];
    delete?: never;
    options?: never;
    head?: never;
    patch?: never;
    trace?: never;
  };
  "/api/v1/admin/orders": {
    parameters: {
      query?: never;
      header?: never;
      path?: never;
      cookie?: never;
    };
    /** adminOrders */
    get: operations["adminOrders"];
    put?: never;
    post?: never;
    delete?: never;
    options?: never;
    head?: never;
    patch?: never;
    trace?: never;
  };
  "/api/v1/admin/orders/{id}": {
    parameters: {
      query?: never;
      header?: never;
      path?: never;
      cookie?: never;
    };
    /** adminOrder */
    get: operations["adminOrder"];
    put?: never;
    post?: never;
    delete?: never;
    options?: never;
    head?: never;
    patch?: never;
    trace?: never;
  };
  "/api/v1/admin/orders/{id}/events": {
    parameters: {
      query?: never;
      header?: never;
      path?: never;
      cookie?: never;
    };
    /** adminOrderEvents */
    get: operations["adminOrderEvents"];
    put?: never;
    post?: never;
    delete?: never;
    options?: never;
    head?: never;
    patch?: never;
    trace?: never;
  };
  "/api/v1/admin/orders/{id}/quotes": {
    parameters: {
      query?: never;
      header?: never;
      path?: never;
      cookie?: never;
    };
    /** adminOrderQuotes */
    get: operations["adminOrderQuotes"];
    put?: never;
    post?: never;
    delete?: never;
    options?: never;
    head?: never;
    patch?: never;
    trace?: never;
  };
  "/api/v1/admin/orders/{id}/clarify": {
    parameters: {
      query?: never;
      header?: never;
      path?: never;
      cookie?: never;
    };
    get?: never;
    put?: never;
    /** adminClarifyOrder */
    post: operations["adminClarifyOrder"];
    delete?: never;
    options?: never;
    head?: never;
    patch?: never;
    trace?: never;
  };
  "/api/v1/admin/orders/{id}/reject": {
    parameters: {
      query?: never;
      header?: never;
      path?: never;
      cookie?: never;
    };
    get?: never;
    put?: never;
    /** adminRejectOrder */
    post: operations["adminRejectOrder"];
    delete?: never;
    options?: never;
    head?: never;
    patch?: never;
    trace?: never;
  };
  "/api/v1/admin/orders/{id}/cancel": {
    parameters: {
      query?: never;
      header?: never;
      path?: never;
      cookie?: never;
    };
    get?: never;
    put?: never;
    /** adminCancelOrder */
    post: operations["adminCancelOrder"];
    delete?: never;
    options?: never;
    head?: never;
    patch?: never;
    trace?: never;
  };
  "/api/v1/admin/orders/{id}/quote": {
    parameters: {
      query?: never;
      header?: never;
      path?: never;
      cookie?: never;
    };
    get?: never;
    put?: never;
    /** Requires recent primary and authenticator verification. Creates immutable revision, supersedes prior quote, and requires new customer acceptance. */
    post: operations["issueOrderQuote"];
    delete?: never;
    options?: never;
    head?: never;
    patch?: never;
    trace?: never;
  };
  "/api/v1/orders/{id}/revise": {
    parameters: {
      query?: never;
      header?: never;
      path?: never;
      cookie?: never;
    };
    get?: never;
    put?: never;
    /** reviseOrder */
    post: operations["reviseOrder"];
    delete?: never;
    options?: never;
    head?: never;
    patch?: never;
    trace?: never;
  };
  "/api/v1/orders/{id}/validate": {
    parameters: {
      query?: never;
      header?: never;
      path?: never;
      cookie?: never;
    };
    get?: never;
    put?: never;
    /** validateOrderRevision */
    post: operations["validateOrderRevision"];
    delete?: never;
    options?: never;
    head?: never;
    patch?: never;
    trace?: never;
  };
  "/api/v1/orders/{id}/reorder": {
    parameters: {
      query?: never;
      header?: never;
      path?: never;
      cookie?: never;
    };
    /** prepareReorder */
    get: operations["prepareReorder"];
    put?: never;
    post?: never;
    delete?: never;
    options?: never;
    head?: never;
    patch?: never;
    trace?: never;
  };
  "/api/v1/me/favorites": {
    parameters: {
      query?: never;
      header?: never;
      path?: never;
      cookie?: never;
    };
    /** listFavorites */
    get: operations["listFavorites"];
    put?: never;
    /** saveFavorite */
    post: operations["saveFavorite"];
    delete?: never;
    options?: never;
    head?: never;
    patch?: never;
    trace?: never;
  };
  "/api/v1/me/favorites/{id}/remove": {
    parameters: {
      query?: never;
      header?: never;
      path?: never;
      cookie?: never;
    };
    get?: never;
    put?: never;
    /** removeFavorite */
    post: operations["removeFavorite"];
    delete?: never;
    options?: never;
    head?: never;
    patch?: never;
    trace?: never;
  };
  "/api/v1/conversations": {
    parameters: {
      query?: never;
      header?: never;
      path?: never;
      cookie?: never;
    };
    /** customerConversations */
    get: operations["customerConversations"];
    put?: never;
    /** Create authenticated pre-sales support or an order’s single private thread. Idempotent, limited to 20 attempts/hour per address and account. */
    post: operations["customerCreateConversation"];
    delete?: never;
    options?: never;
    head?: never;
    patch?: never;
    trace?: never;
  };
  "/api/v1/conversations/{id}": {
    parameters: {
      query?: never;
      header?: never;
      path?: never;
      cookie?: never;
    };
    /** customerConversation */
    get: operations["customerConversation"];
    put?: never;
    post?: never;
    delete?: never;
    options?: never;
    head?: never;
    patch?: never;
    trace?: never;
  };
  "/api/v1/conversations/{id}/messages": {
    parameters: {
      query?: never;
      header?: never;
      path?: never;
      cookie?: never;
    };
    /** Forward backfill with after, or latest/earlier window with before (0 means latest). Mutually exclusive cursors; up to 50 visible messages. Customer sequences exclude internal notes. */
    get: operations["customerConversationMessages"];
    put?: never;
    /** Immutable, idempotent send with transactional notices and audit. Internal visibility requires the staff endpoint. Limited to 60 attempts/minute per address and account. */
    post: operations["customerSendConversationMessage"];
    delete?: never;
    options?: never;
    head?: never;
    patch?: never;
    trace?: never;
  };
  "/api/v1/conversations/{id}/read": {
    parameters: {
      query?: never;
      header?: never;
      path?: never;
      cookie?: never;
    };
    get?: never;
    put?: never;
    /** customerReadConversation */
    post: operations["customerReadConversation"];
    delete?: never;
    options?: never;
    head?: never;
    patch?: never;
    trace?: never;
  };
  "/api/v1/conversations/{id}/stream": {
    parameters: {
      query?: never;
      header?: never;
      path?: never;
      cookie?: never;
    };
    /** Eight-second SSE stream, reconnectable using Last-Event-ID. Sends change cursor hints and heartbeats only, rechecks live session authority, and excludes internal activity from customer cursors. Polling/backfill remains authoritative. */
    get: operations["customerConversationStream"];
    put?: never;
    post?: never;
    delete?: never;
    options?: never;
    head?: never;
    patch?: never;
    trace?: never;
  };
  "/api/v1/admin/conversations": {
    parameters: {
      query?: never;
      header?: never;
      path?: never;
      cookie?: never;
    };
    /** staffConversations */
    get: operations["staffConversations"];
    put?: never;
    /** Create authenticated pre-sales support or an order’s single private thread. Idempotent, limited to 20 attempts/hour per address and account. */
    post: operations["staffCreateConversation"];
    delete?: never;
    options?: never;
    head?: never;
    patch?: never;
    trace?: never;
  };
  "/api/v1/admin/conversations/{id}": {
    parameters: {
      query?: never;
      header?: never;
      path?: never;
      cookie?: never;
    };
    /** staffConversation */
    get: operations["staffConversation"];
    put?: never;
    post?: never;
    delete?: never;
    options?: never;
    head?: never;
    patch?: never;
    trace?: never;
  };
  "/api/v1/admin/conversations/{id}/messages": {
    parameters: {
      query?: never;
      header?: never;
      path?: never;
      cookie?: never;
    };
    /** Forward backfill with after, or latest/earlier window with before (0 means latest). Mutually exclusive cursors; up to 50 visible messages. Customer sequences exclude internal notes. */
    get: operations["staffConversationMessages"];
    put?: never;
    /** Immutable, idempotent send with transactional notices and audit. Internal visibility requires the staff endpoint. Limited to 60 attempts/minute per address and account. */
    post: operations["staffSendConversationMessage"];
    delete?: never;
    options?: never;
    head?: never;
    patch?: never;
    trace?: never;
  };
  "/api/v1/admin/conversations/{id}/read": {
    parameters: {
      query?: never;
      header?: never;
      path?: never;
      cookie?: never;
    };
    get?: never;
    put?: never;
    /** staffReadConversation */
    post: operations["staffReadConversation"];
    delete?: never;
    options?: never;
    head?: never;
    patch?: never;
    trace?: never;
  };
  "/api/v1/admin/conversations/{id}/stream": {
    parameters: {
      query?: never;
      header?: never;
      path?: never;
      cookie?: never;
    };
    /** Eight-second SSE stream, reconnectable using Last-Event-ID. Sends change cursor hints and heartbeats only, rechecks live session authority, and excludes internal activity from customer cursors. Polling/backfill remains authoritative. */
    get: operations["staffConversationStream"];
    put?: never;
    post?: never;
    delete?: never;
    options?: never;
    head?: never;
    patch?: never;
    trace?: never;
  };
  "/api/v1/admin/conversations/{id}/state": {
    parameters: {
      query?: never;
      header?: never;
      path?: never;
      cookie?: never;
    };
    get?: never;
    put?: never;
    /** staffStateConversation */
    post: operations["staffStateConversation"];
    delete?: never;
    options?: never;
    head?: never;
    patch?: never;
    trace?: never;
  };
  "/api/v1/admin/conversations/{id}/assign": {
    parameters: {
      query?: never;
      header?: never;
      path?: never;
      cookie?: never;
    };
    get?: never;
    put?: never;
    /** staffAssignConversation */
    post: operations["staffAssignConversation"];
    delete?: never;
    options?: never;
    head?: never;
    patch?: never;
    trace?: never;
  };
  "/api/v1/admin/conversations/{id}/link": {
    parameters: {
      query?: never;
      header?: never;
      path?: never;
      cookie?: never;
    };
    get?: never;
    put?: never;
    /** staffLinkConversation */
    post: operations["staffLinkConversation"];
    delete?: never;
    options?: never;
    head?: never;
    patch?: never;
    trace?: never;
  };
  "/api/v1/me/notifications": {
    parameters: {
      query?: never;
      header?: never;
      path?: never;
      cookie?: never;
    };
    /** listActivityNotices */
    get: operations["listActivityNotices"];
    put?: never;
    post?: never;
    delete?: never;
    options?: never;
    head?: never;
    patch?: never;
    trace?: never;
  };
  "/api/v1/me/notifications/{id}/read": {
    parameters: {
      query?: never;
      header?: never;
      path?: never;
      cookie?: never;
    };
    get?: never;
    put?: never;
    /** readActivityNotice */
    post: operations["readActivityNotice"];
    delete?: never;
    options?: never;
    head?: never;
    patch?: never;
    trace?: never;
  };
  "/api/v1/admin/notifications/deliveries": {
    parameters: {
      query?: never;
      header?: never;
      path?: never;
      cookie?: never;
    };
    /** activityEmailDeliveries */
    get: operations["activityEmailDeliveries"];
    put?: never;
    post?: never;
    delete?: never;
    options?: never;
    head?: never;
    patch?: never;
    trace?: never;
  };
  "/api/v1/admin/notifications/deliveries/{id}/retry": {
    parameters: {
      query?: never;
      header?: never;
      path?: never;
      cookie?: never;
    };
    get?: never;
    put?: never;
    /** Requires recent staff primary and authenticator verification; restarts only failed activity jobs with audit. Running/completed jobs cannot be restarted. */
    post: operations["retryActivityEmail"];
    delete?: never;
    options?: never;
    head?: never;
    patch?: never;
    trace?: never;
  };
  "/api/v1/media": {
    parameters: {
      query?: never;
      header?: never;
      path?: never;
      cookie?: never;
    };
    get?: never;
    put?: never;
    /** Reserve private quota and immutable checksum, scope and audience. JPEG/PNG/WebP only, 4 MiB and 4 million pixels maximum. Intent expires in 24 hours. */
    post: operations["customerCreateMediaIntent"];
    delete?: never;
    options?: never;
    head?: never;
    patch?: never;
    trace?: never;
  };
  "/api/v1/media/{id}": {
    parameters: {
      query?: never;
      header?: never;
      path?: never;
      cookie?: never;
    };
    /** Read scoped upload state, including exhausted scan jobs. */
    get: operations["customerGetMedia"];
    put?: never;
    post?: never;
    delete?: never;
    options?: never;
    head?: never;
    patch?: never;
    trace?: never;
  };
  "/api/v1/media/{id}/bytes": {
    parameters: {
      query?: never;
      header?: never;
      path?: never;
      cookie?: never;
    };
    get?: never;
    /** Authenticated CSRF-protected binary upload matching the intent checksum. No customer-supplied object key. */
    put: operations["customerUploadMedia"];
    post?: never;
    delete?: never;
    options?: never;
    head?: never;
    patch?: never;
    trace?: never;
  };
  "/api/v1/media/{id}/finalize": {
    parameters: {
      query?: never;
      header?: never;
      path?: never;
      cookie?: never;
    };
    get?: never;
    put?: never;
    /** Queue idempotent malware scan and image sanitization. Quarantined bytes cannot be downloaded. */
    post: operations["customerFinalizeMedia"];
    delete?: never;
    options?: never;
    head?: never;
    patch?: never;
    trace?: never;
  };
  "/api/v1/media/{id}/grant": {
    parameters: {
      query?: never;
      header?: never;
      path?: never;
      cookie?: never;
    };
    get?: never;
    put?: never;
    /** Issue a one-minute, session-bound private download URL after checking current access. */
    post: operations["customerGrantMedia"];
    delete?: never;
    options?: never;
    head?: never;
    patch?: never;
    trace?: never;
  };
  "/api/v1/media/{id}/content": {
    parameters: {
      query?: never;
      header?: never;
      path?: never;
      cookie?: never;
    };
    /** Validate signature and current session/membership; return sanitized bytes only, as an attachment. */
    get: operations["customerDownloadMedia"];
    put?: never;
    post?: never;
    delete?: never;
    options?: never;
    head?: never;
    patch?: never;
    trace?: never;
  };
  "/api/v1/media/{id}/retry": {
    parameters: {
      query?: never;
      header?: never;
      path?: never;
      cookie?: never;
    };
    get?: never;
    put?: never;
    /** Retry only an exhausted scan for an owned, unbound, unexpired upload. Staff require recent authentication. */
    post: operations["customerRetryMedia"];
    delete?: never;
    options?: never;
    head?: never;
    patch?: never;
    trace?: never;
  };
  "/api/v1/media/{id}/remove": {
    parameters: {
      query?: never;
      header?: never;
      path?: never;
      cookie?: never;
    };
    get?: never;
    put?: never;
    /** Discard an owned unbound upload; cleanup retries deletion in private storage. */
    post: operations["customerRemoveMedia"];
    delete?: never;
    options?: never;
    head?: never;
    patch?: never;
    trace?: never;
  };
  "/api/v1/admin/media": {
    parameters: {
      query?: never;
      header?: never;
      path?: never;
      cookie?: never;
    };
    get?: never;
    put?: never;
    /** Reserve private quota and immutable checksum, scope and audience. JPEG/PNG/WebP only, 4 MiB and 4 million pixels maximum. Intent expires in 24 hours. */
    post: operations["staffCreateMediaIntent"];
    delete?: never;
    options?: never;
    head?: never;
    patch?: never;
    trace?: never;
  };
  "/api/v1/admin/media/{id}": {
    parameters: {
      query?: never;
      header?: never;
      path?: never;
      cookie?: never;
    };
    /** Read scoped upload state, including exhausted scan jobs. */
    get: operations["staffGetMedia"];
    put?: never;
    post?: never;
    delete?: never;
    options?: never;
    head?: never;
    patch?: never;
    trace?: never;
  };
  "/api/v1/admin/media/{id}/bytes": {
    parameters: {
      query?: never;
      header?: never;
      path?: never;
      cookie?: never;
    };
    get?: never;
    /** Authenticated CSRF-protected binary upload matching the intent checksum. No customer-supplied object key. */
    put: operations["staffUploadMedia"];
    post?: never;
    delete?: never;
    options?: never;
    head?: never;
    patch?: never;
    trace?: never;
  };
  "/api/v1/admin/media/{id}/finalize": {
    parameters: {
      query?: never;
      header?: never;
      path?: never;
      cookie?: never;
    };
    get?: never;
    put?: never;
    /** Queue idempotent malware scan and image sanitization. Quarantined bytes cannot be downloaded. */
    post: operations["staffFinalizeMedia"];
    delete?: never;
    options?: never;
    head?: never;
    patch?: never;
    trace?: never;
  };
  "/api/v1/admin/media/{id}/grant": {
    parameters: {
      query?: never;
      header?: never;
      path?: never;
      cookie?: never;
    };
    get?: never;
    put?: never;
    /** Issue a one-minute, session-bound private download URL after checking current access. */
    post: operations["staffGrantMedia"];
    delete?: never;
    options?: never;
    head?: never;
    patch?: never;
    trace?: never;
  };
  "/api/v1/admin/media/{id}/content": {
    parameters: {
      query?: never;
      header?: never;
      path?: never;
      cookie?: never;
    };
    /** Validate signature and current session/membership; return sanitized bytes only, as an attachment. */
    get: operations["staffDownloadMedia"];
    put?: never;
    post?: never;
    delete?: never;
    options?: never;
    head?: never;
    patch?: never;
    trace?: never;
  };
  "/api/v1/admin/media/{id}/retry": {
    parameters: {
      query?: never;
      header?: never;
      path?: never;
      cookie?: never;
    };
    get?: never;
    put?: never;
    /** Retry only an exhausted scan for an owned, unbound, unexpired upload. Staff require recent authentication. */
    post: operations["staffRetryMedia"];
    delete?: never;
    options?: never;
    head?: never;
    patch?: never;
    trace?: never;
  };
  "/api/v1/admin/media/{id}/remove": {
    parameters: {
      query?: never;
      header?: never;
      path?: never;
      cookie?: never;
    };
    get?: never;
    put?: never;
    /** Discard an owned unbound upload; cleanup retries deletion in private storage. */
    post: operations["staffRemoveMedia"];
    delete?: never;
    options?: never;
    head?: never;
    patch?: never;
    trace?: never;
  };
  "/api/v1/fulfillment/{id}": {
    parameters: {
      query?: never;
      header?: never;
      path?: never;
      cookie?: never;
    };
    /** Paid-order fulfillment with live resource authorization */
    get: operations["accountFulfillmentget_id"];
    put?: never;
    post?: never;
    delete?: never;
    options?: never;
    head?: never;
    patch?: never;
    trace?: never;
  };
  "/api/v1/fulfillment/{id}/handoff": {
    parameters: {
      query?: never;
      header?: never;
      path?: never;
      cookie?: never;
    };
    get?: never;
    put?: never;
    /** Paid-order fulfillment with live resource authorization */
    post: operations["accountFulfillmentpost_id_handoff"];
    delete?: never;
    options?: never;
    head?: never;
    patch?: never;
    trace?: never;
  };
  "/api/v1/fulfillment/{id}/secret": {
    parameters: {
      query?: never;
      header?: never;
      path?: never;
      cookie?: never;
    };
    /** Paid-order fulfillment with live resource authorization */
    get: operations["accountFulfillmentget_id_secret"];
    put?: never;
    /** Paid-order fulfillment with live resource authorization */
    post: operations["accountFulfillmentpost_id_secret"];
    delete?: never;
    options?: never;
    head?: never;
    patch?: never;
    trace?: never;
  };
  "/api/v1/fulfillment/{id}/secret/revoke": {
    parameters: {
      query?: never;
      header?: never;
      path?: never;
      cookie?: never;
    };
    get?: never;
    put?: never;
    /** Paid-order fulfillment with live resource authorization */
    post: operations["accountFulfillmentpost_id_secret_revoke"];
    delete?: never;
    options?: never;
    head?: never;
    patch?: never;
    trace?: never;
  };
  "/api/v1/admin/fulfillment/{id}": {
    parameters: {
      query?: never;
      header?: never;
      path?: never;
      cookie?: never;
    };
    /** Paid-order fulfillment with live resource authorization */
    get: operations["adminFulfillmentget_id"];
    put?: never;
    post?: never;
    delete?: never;
    options?: never;
    head?: never;
    patch?: never;
    trace?: never;
  };
  "/api/v1/admin/fulfillment": {
    parameters: {
      query?: never;
      header?: never;
      path?: never;
      cookie?: never;
    };
    /** Paid-order fulfillment with live resource authorization */
    get: operations["adminFulfillmentget"];
    put?: never;
    post?: never;
    delete?: never;
    options?: never;
    head?: never;
    patch?: never;
    trace?: never;
  };
  "/api/v1/admin/fulfillment/{id}/secret/reveal": {
    parameters: {
      query?: never;
      header?: never;
      path?: never;
      cookie?: never;
    };
    get?: never;
    put?: never;
    /** Paid-order fulfillment with live resource authorization */
    post: operations["adminFulfillmentpost_id_secret_reveal"];
    delete?: never;
    options?: never;
    head?: never;
    patch?: never;
    trace?: never;
  };
  "/api/v1/admin/fulfillment/{id}/start": {
    parameters: {
      query?: never;
      header?: never;
      path?: never;
      cookie?: never;
    };
    get?: never;
    put?: never;
    /** Paid-order fulfillment with live resource authorization */
    post: operations["adminFulfillmentpost_id_start"];
    delete?: never;
    options?: never;
    head?: never;
    patch?: never;
    trace?: never;
  };
  "/api/v1/admin/fulfillment/{id}/resume": {
    parameters: {
      query?: never;
      header?: never;
      path?: never;
      cookie?: never;
    };
    get?: never;
    put?: never;
    /** Paid-order fulfillment with live resource authorization */
    post: operations["adminFulfillmentpost_id_resume"];
    delete?: never;
    options?: never;
    head?: never;
    patch?: never;
    trace?: never;
  };
  "/api/v1/admin/fulfillment/{id}/hold": {
    parameters: {
      query?: never;
      header?: never;
      path?: never;
      cookie?: never;
    };
    get?: never;
    put?: never;
    /** Paid-order fulfillment with live resource authorization */
    post: operations["adminFulfillmentpost_id_hold"];
    delete?: never;
    options?: never;
    head?: never;
    patch?: never;
    trace?: never;
  };
  "/api/v1/admin/fulfillment/{id}/progress": {
    parameters: {
      query?: never;
      header?: never;
      path?: never;
      cookie?: never;
    };
    get?: never;
    put?: never;
    /** Paid-order fulfillment with live resource authorization */
    post: operations["adminFulfillmentpost_id_progress"];
    delete?: never;
    options?: never;
    head?: never;
    patch?: never;
    trace?: never;
  };
  "/api/v1/admin/fulfillment/{id}/submit_completion": {
    parameters: {
      query?: never;
      header?: never;
      path?: never;
      cookie?: never;
    };
    get?: never;
    put?: never;
    /** Paid-order fulfillment with live resource authorization */
    post: operations["adminFulfillmentpost_id_submit_completion"];
    delete?: never;
    options?: never;
    head?: never;
    patch?: never;
    trace?: never;
  };
  "/api/v1/admin/fulfillment/{id}/approve_completion": {
    parameters: {
      query?: never;
      header?: never;
      path?: never;
      cookie?: never;
    };
    get?: never;
    put?: never;
    /** Paid-order fulfillment with live resource authorization */
    post: operations["adminFulfillmentpost_id_approve_completion"];
    delete?: never;
    options?: never;
    head?: never;
    patch?: never;
    trace?: never;
  };
  "/api/v1/admin/fulfillment/{id}/return_completion": {
    parameters: {
      query?: never;
      header?: never;
      path?: never;
      cookie?: never;
    };
    get?: never;
    put?: never;
    /** Paid-order fulfillment with live resource authorization */
    post: operations["adminFulfillmentpost_id_return_completion"];
    delete?: never;
    options?: never;
    head?: never;
    patch?: never;
    trace?: never;
  };
  "/api/v1/admin/fulfillment/{id}/estimate": {
    parameters: {
      query?: never;
      header?: never;
      path?: never;
      cookie?: never;
    };
    get?: never;
    put?: never;
    /** Paid-order fulfillment with live resource authorization */
    post: operations["adminFulfillmentpost_id_estimate"];
    delete?: never;
    options?: never;
    head?: never;
    patch?: never;
    trace?: never;
  };
  "/api/v1/admin/fulfillment/staff": {
    parameters: {
      query?: never;
      header?: never;
      path?: never;
      cookie?: never;
    };
    /** Paid-order fulfillment with live resource authorization */
    get: operations["adminFulfillmentget_staff"];
    put?: never;
    post?: never;
    delete?: never;
    options?: never;
    head?: never;
    patch?: never;
    trace?: never;
  };
  "/api/v1/admin/fulfillment/{id}/assign": {
    parameters: {
      query?: never;
      header?: never;
      path?: never;
      cookie?: never;
    };
    get?: never;
    put?: never;
    /** Paid-order fulfillment with live resource authorization */
    post: operations["adminFulfillmentpost_id_assign"];
    delete?: never;
    options?: never;
    head?: never;
    patch?: never;
    trace?: never;
  };
  "/api/v1/booster/fulfillment/{id}": {
    parameters: {
      query?: never;
      header?: never;
      path?: never;
      cookie?: never;
    };
    /** Paid-order fulfillment with live resource authorization */
    get: operations["boosterFulfillmentget_id"];
    put?: never;
    post?: never;
    delete?: never;
    options?: never;
    head?: never;
    patch?: never;
    trace?: never;
  };
  "/api/v1/booster/fulfillment": {
    parameters: {
      query?: never;
      header?: never;
      path?: never;
      cookie?: never;
    };
    /** Paid-order fulfillment with live resource authorization */
    get: operations["boosterFulfillmentget"];
    put?: never;
    post?: never;
    delete?: never;
    options?: never;
    head?: never;
    patch?: never;
    trace?: never;
  };
  "/api/v1/booster/fulfillment/{id}/secret/reveal": {
    parameters: {
      query?: never;
      header?: never;
      path?: never;
      cookie?: never;
    };
    get?: never;
    put?: never;
    /** Paid-order fulfillment with live resource authorization */
    post: operations["boosterFulfillmentpost_id_secret_reveal"];
    delete?: never;
    options?: never;
    head?: never;
    patch?: never;
    trace?: never;
  };
  "/api/v1/booster/fulfillment/{id}/start": {
    parameters: {
      query?: never;
      header?: never;
      path?: never;
      cookie?: never;
    };
    get?: never;
    put?: never;
    /** Paid-order fulfillment with live resource authorization */
    post: operations["boosterFulfillmentpost_id_start"];
    delete?: never;
    options?: never;
    head?: never;
    patch?: never;
    trace?: never;
  };
  "/api/v1/booster/fulfillment/{id}/resume": {
    parameters: {
      query?: never;
      header?: never;
      path?: never;
      cookie?: never;
    };
    get?: never;
    put?: never;
    /** Paid-order fulfillment with live resource authorization */
    post: operations["boosterFulfillmentpost_id_resume"];
    delete?: never;
    options?: never;
    head?: never;
    patch?: never;
    trace?: never;
  };
  "/api/v1/booster/fulfillment/{id}/hold": {
    parameters: {
      query?: never;
      header?: never;
      path?: never;
      cookie?: never;
    };
    get?: never;
    put?: never;
    /** Paid-order fulfillment with live resource authorization */
    post: operations["boosterFulfillmentpost_id_hold"];
    delete?: never;
    options?: never;
    head?: never;
    patch?: never;
    trace?: never;
  };
  "/api/v1/booster/fulfillment/{id}/progress": {
    parameters: {
      query?: never;
      header?: never;
      path?: never;
      cookie?: never;
    };
    get?: never;
    put?: never;
    /** Paid-order fulfillment with live resource authorization */
    post: operations["boosterFulfillmentpost_id_progress"];
    delete?: never;
    options?: never;
    head?: never;
    patch?: never;
    trace?: never;
  };
  "/api/v1/booster/fulfillment/{id}/submit_completion": {
    parameters: {
      query?: never;
      header?: never;
      path?: never;
      cookie?: never;
    };
    get?: never;
    put?: never;
    /** Paid-order fulfillment with live resource authorization */
    post: operations["boosterFulfillmentpost_id_submit_completion"];
    delete?: never;
    options?: never;
    head?: never;
    patch?: never;
    trace?: never;
  };
  "/api/v1/booster/calendar": {
    parameters: {
      query?: never;
      header?: never;
      path?: never;
      cookie?: never;
    };
    /** Private scheduling with live assignment and overlap checks */
    get: operations["getSchedulingbooster_calendar"];
    put?: never;
    /** Private scheduling with live assignment and overlap checks */
    post: operations["postSchedulingbooster_calendar"];
    delete?: never;
    options?: never;
    head?: never;
    patch?: never;
    trace?: never;
  };
  "/api/v1/booster/calendar/windows": {
    parameters: {
      query?: never;
      header?: never;
      path?: never;
      cookie?: never;
    };
    get?: never;
    put?: never;
    /** Private scheduling with live assignment and overlap checks */
    post: operations["postSchedulingbooster_calendar_windows"];
    delete?: never;
    options?: never;
    head?: never;
    patch?: never;
    trace?: never;
  };
  "/api/v1/booster/calendar/windows/{window}/remove": {
    parameters: {
      query?: never;
      header?: never;
      path?: never;
      cookie?: never;
    };
    get?: never;
    put?: never;
    /** Private scheduling with live assignment and overlap checks */
    post: operations["postSchedulingbooster_calendar_windows_window_remove"];
    delete?: never;
    options?: never;
    head?: never;
    patch?: never;
    trace?: never;
  };
  "/api/v1/admin/staff/{staff}/calendar": {
    parameters: {
      query?: never;
      header?: never;
      path?: never;
      cookie?: never;
    };
    /** Private scheduling with live assignment and overlap checks */
    get: operations["getSchedulingadmin_staff_staff_calendar"];
    put?: never;
    /** Private scheduling with live assignment and overlap checks */
    post: operations["postSchedulingadmin_staff_staff_calendar"];
    delete?: never;
    options?: never;
    head?: never;
    patch?: never;
    trace?: never;
  };
  "/api/v1/admin/staff/{staff}/calendar/windows": {
    parameters: {
      query?: never;
      header?: never;
      path?: never;
      cookie?: never;
    };
    get?: never;
    put?: never;
    /** Private scheduling with live assignment and overlap checks */
    post: operations["postSchedulingadmin_staff_staff_calendar_windows"];
    delete?: never;
    options?: never;
    head?: never;
    patch?: never;
    trace?: never;
  };
  "/api/v1/admin/staff/{staff}/calendar/windows/{window}/remove": {
    parameters: {
      query?: never;
      header?: never;
      path?: never;
      cookie?: never;
    };
    get?: never;
    put?: never;
    /** Private scheduling with live assignment and overlap checks */
    post: operations["postSchedulingadmin_staff_staff_calendar_windows_window_remove"];
    delete?: never;
    options?: never;
    head?: never;
    patch?: never;
    trace?: never;
  };
  "/api/v1/fulfillment/{id}/bookings": {
    parameters: {
      query?: never;
      header?: never;
      path?: never;
      cookie?: never;
    };
    /** Private scheduling with live assignment and overlap checks */
    get: operations["getSchedulingfulfillment_id_bookings"];
    put?: never;
    /** Private scheduling with live assignment and overlap checks */
    post: operations["postSchedulingfulfillment_id_bookings"];
    delete?: never;
    options?: never;
    head?: never;
    patch?: never;
    trace?: never;
  };
  "/api/v1/fulfillment/{id}/slots": {
    parameters: {
      query?: never;
      header?: never;
      path?: never;
      cookie?: never;
    };
    /** Private scheduling with live assignment and overlap checks */
    get: operations["getSchedulingfulfillment_id_slots"];
    put?: never;
    post?: never;
    delete?: never;
    options?: never;
    head?: never;
    patch?: never;
    trace?: never;
  };
  "/api/v1/fulfillment/{id}/bookings/{booking}/cancel": {
    parameters: {
      query?: never;
      header?: never;
      path?: never;
      cookie?: never;
    };
    get?: never;
    put?: never;
    /** Private scheduling with live assignment and overlap checks */
    post: operations["postSchedulingfulfillment_id_bookings_booking_cancel"];
    delete?: never;
    options?: never;
    head?: never;
    patch?: never;
    trace?: never;
  };
  "/api/v1/admin/fulfillment/{id}/bookings": {
    parameters: {
      query?: never;
      header?: never;
      path?: never;
      cookie?: never;
    };
    /** Private scheduling with live assignment and overlap checks */
    get: operations["getSchedulingadmin_fulfillment_id_bookings"];
    put?: never;
    post?: never;
    delete?: never;
    options?: never;
    head?: never;
    patch?: never;
    trace?: never;
  };
  "/api/v1/admin/fulfillment/{id}/slots": {
    parameters: {
      query?: never;
      header?: never;
      path?: never;
      cookie?: never;
    };
    /** Private scheduling with live assignment and overlap checks */
    get: operations["getSchedulingadmin_fulfillment_id_slots"];
    put?: never;
    post?: never;
    delete?: never;
    options?: never;
    head?: never;
    patch?: never;
    trace?: never;
  };
  "/api/v1/admin/fulfillment/{id}/bookings/{booking}/cancel": {
    parameters: {
      query?: never;
      header?: never;
      path?: never;
      cookie?: never;
    };
    get?: never;
    put?: never;
    /** Private scheduling with live assignment and overlap checks */
    post: operations["postSchedulingadmin_fulfillment_id_bookings_booking_cancel"];
    delete?: never;
    options?: never;
    head?: never;
    patch?: never;
    trace?: never;
  };
  "/api/v1/admin/fulfillment/{id}/bookings/{booking}/confirm": {
    parameters: {
      query?: never;
      header?: never;
      path?: never;
      cookie?: never;
    };
    get?: never;
    put?: never;
    /** Private scheduling with live assignment and overlap checks */
    post: operations["postSchedulingadmin_fulfillment_id_bookings_booking_confirm"];
    delete?: never;
    options?: never;
    head?: never;
    patch?: never;
    trace?: never;
  };
  "/api/v1/admin/fulfillment/{id}/bookings/{booking}/attended": {
    parameters: {
      query?: never;
      header?: never;
      path?: never;
      cookie?: never;
    };
    get?: never;
    put?: never;
    /** Private scheduling with live assignment and overlap checks */
    post: operations["postSchedulingadmin_fulfillment_id_bookings_booking_attended"];
    delete?: never;
    options?: never;
    head?: never;
    patch?: never;
    trace?: never;
  };
  "/api/v1/admin/fulfillment/{id}/bookings/{booking}/no_show": {
    parameters: {
      query?: never;
      header?: never;
      path?: never;
      cookie?: never;
    };
    get?: never;
    put?: never;
    /** Private scheduling with live assignment and overlap checks */
    post: operations["postSchedulingadmin_fulfillment_id_bookings_booking_no_show"];
    delete?: never;
    options?: never;
    head?: never;
    patch?: never;
    trace?: never;
  };
  "/api/v1/booster/fulfillment/{id}/bookings": {
    parameters: {
      query?: never;
      header?: never;
      path?: never;
      cookie?: never;
    };
    /** Private scheduling with live assignment and overlap checks */
    get: operations["getSchedulingbooster_fulfillment_id_bookings"];
    put?: never;
    post?: never;
    delete?: never;
    options?: never;
    head?: never;
    patch?: never;
    trace?: never;
  };
  "/api/v1/booster/fulfillment/{id}/slots": {
    parameters: {
      query?: never;
      header?: never;
      path?: never;
      cookie?: never;
    };
    /** Private scheduling with live assignment and overlap checks */
    get: operations["getSchedulingbooster_fulfillment_id_slots"];
    put?: never;
    post?: never;
    delete?: never;
    options?: never;
    head?: never;
    patch?: never;
    trace?: never;
  };
  "/api/v1/booster/fulfillment/{id}/bookings/{booking}/cancel": {
    parameters: {
      query?: never;
      header?: never;
      path?: never;
      cookie?: never;
    };
    get?: never;
    put?: never;
    /** Private scheduling with live assignment and overlap checks */
    post: operations["postSchedulingbooster_fulfillment_id_bookings_booking_cancel"];
    delete?: never;
    options?: never;
    head?: never;
    patch?: never;
    trace?: never;
  };
  "/api/v1/booster/fulfillment/{id}/bookings/{booking}/confirm": {
    parameters: {
      query?: never;
      header?: never;
      path?: never;
      cookie?: never;
    };
    get?: never;
    put?: never;
    /** Private scheduling with live assignment and overlap checks */
    post: operations["postSchedulingbooster_fulfillment_id_bookings_booking_confirm"];
    delete?: never;
    options?: never;
    head?: never;
    patch?: never;
    trace?: never;
  };
  "/api/v1/booster/fulfillment/{id}/bookings/{booking}/attended": {
    parameters: {
      query?: never;
      header?: never;
      path?: never;
      cookie?: never;
    };
    get?: never;
    put?: never;
    /** Private scheduling with live assignment and overlap checks */
    post: operations["postSchedulingbooster_fulfillment_id_bookings_booking_attended"];
    delete?: never;
    options?: never;
    head?: never;
    patch?: never;
    trace?: never;
  };
  "/api/v1/booster/fulfillment/{id}/bookings/{booking}/no_show": {
    parameters: {
      query?: never;
      header?: never;
      path?: never;
      cookie?: never;
    };
    get?: never;
    put?: never;
    /** Private scheduling with live assignment and overlap checks */
    post: operations["postSchedulingbooster_fulfillment_id_bookings_booking_no_show"];
    delete?: never;
    options?: never;
    head?: never;
    patch?: never;
    trace?: never;
  };
  "/api/v1/admin/fulfillment/{id}/conversation": {
    parameters: {
      query?: never;
      header?: never;
      path?: never;
      cookie?: never;
    };
    get?: never;
    put?: never;
    /** Explicitly share a separate paid-order coordination thread after recent staff factors */
    post: operations["openFulfillmentCoordination"];
    delete?: never;
    options?: never;
    head?: never;
    patch?: never;
    trace?: never;
  };
  "/api/v1/admin/conversations/{id}/sharing": {
    parameters: {
      query?: never;
      header?: never;
      path?: never;
      cookie?: never;
    };
    get?: never;
    put?: never;
    /** Pause or resume assigned booster sharing with recent staff factors and expected thread version */
    post: operations["changeBoosterConversationSharing"];
    delete?: never;
    options?: never;
    head?: never;
    patch?: never;
    trace?: never;
  };
  "/api/v1/admin/fulfillment/{id}/forecast/preview": {
    parameters: {
      query?: never;
      header?: never;
      path?: never;
      cookie?: never;
    };
    get?: never;
    put?: never;
    /** Review operational delivery range */
    post: operations["adminDeliveryForecastPreview"];
    delete?: never;
    options?: never;
    head?: never;
    patch?: never;
    trace?: never;
  };
  "/api/v1/admin/fulfillment/{id}/forecast/apply": {
    parameters: {
      query?: never;
      header?: never;
      path?: never;
      cookie?: never;
    };
    get?: never;
    put?: never;
    /** Apply unchanged reviewed range with recent primary and authenticator verification */
    post: operations["adminDeliveryForecastApply"];
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
      fulfillment?: components["schemas"]["FulfillmentPolicy"];
      delivery?: components["schemas"]["DeliveryPolicy"];
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
      /**
       * @description Defaults to estimate; package validation always requires order fields.
       * @enum {string}
       */
      stage?: "estimate" | "order";
    };
    CouponDiscount: {
      coupon_id: string;
      version: number;
      code: string;
      amount_minor: string;
      indicative: boolean;
    };
    OrderProblem: {
      /** @enum {string} */
      code: "order_invalid" | "order_conflict";
      issues?: components["schemas"]["CatalogIssue"][];
    };
    OrderCreate: {
      /** Format: uuid */
      request_key: string;
      release_id: string;
      slug: string;
      service: string;
      package: string;
      variant: string;
      /** @enum {string} */
      kind: "custom" | "package";
      answers: {
        [key: string]: string | boolean | string[];
      };
      coupon_code: string;
      accept_terms: boolean;
      terms_version: string;
      /** @description Package price comparison only. Server resolves authoritative price; empty for custom requests. */
      expected_amount: string;
      expected_coupon_version: number;
    };
    OrderSummary: {
      id: string;
      /** @enum {string} */
      kind: "custom" | "package";
      /** @enum {string} */
      state:
        | "submitted"
        | "needs_information"
        | "quoted"
        | "awaiting_payment"
        | "queued"
        | "in_progress"
        | "on_hold"
        | "completed"
        | "rejected"
        | "cancelled"
        | "expired";
      slug: string;
      service: string;
      package: string;
      variant: string;
      game_name: string;
      version: number;
      /** Format: date-time */
      created_at: string;
      /** Format: date-time */
      updated_at: string;
    };
    OrderCommercial: {
      quote_id: string;
      currency: string;
      subtotal_minor: string;
      amount_minor: string;
      scope: string;
      reason: string;
      terms_version: string;
      revision: number;
      discount?: components["schemas"]["CouponDiscount"];
      lines: components["schemas"]["CatalogPriceLine"][];
      delivery_min_hours: number;
      delivery_max_hours: number;
      /** Format: date-time */
      expires_at: string;
    };
    OrderQuote: {
      id: string;
      /** @enum {string} */
      state: "issued" | "accepted" | "superseded" | "declined";
      data: components["schemas"]["OrderCommercial"];
    };
    OrderContract: {
      id: string;
      /** @enum {string} */
      payment_state:
        | "unissued"
        | "invoice_pending"
        | "awaiting_payment"
        | "funds_detected"
        | "settled"
        | "retired";
      data: components["schemas"]["OrderCommercial"];
    };
    OrderDetail: {
      order: components["schemas"]["OrderSummary"];
      offer: components["schemas"]["CatalogRelease"];
      answers: {
        [key: string]: string | boolean | string[];
      };
      estimate: components["schemas"]["CatalogEstimate"];
      coupon_code: string;
      quote?: components["schemas"]["OrderQuote"];
      contract?: components["schemas"]["OrderContract"];
    };
    OrderListing: {
      orders: components["schemas"]["OrderSummary"][];
      next: string;
    };
    OrderQuoteInput: {
      version: number;
      amount_minor: string;
      /** @enum {string} */
      currency: "USD" | "EUR" | "GBP";
      scope: string;
      reason: string;
      lines: components["schemas"]["CatalogPriceLine"][];
      delivery_min_hours: number;
      delivery_max_hours: number;
      /** Format: date-time */
      expires_at: string;
    };
    OrderAction: {
      version: number;
      quote_id: string;
      accept_terms: boolean;
      terms_version: string;
      message: string;
    };
    OrderRevision: {
      version: number;
      answers: {
        [key: string]: string | boolean | string[];
      };
      coupon_code: string;
    };
    OrderEvent: {
      id: string;
      version: number;
      action: string;
      message: string;
      actor_role: string;
      /** Format: date-time */
      created_at: string;
    };
    OrderEvents: {
      events: components["schemas"]["OrderEvent"][];
    };
    OrderQuotes: {
      quotes: components["schemas"]["OrderQuote"][];
    };
    OrderReorder: {
      offer: components["schemas"]["CatalogRelease"];
      service: string;
      package: string;
      variant: string;
      kind: string;
      answers: {
        [key: string]: string | boolean | string[];
      };
      issues: components["schemas"]["CatalogIssue"][];
    };
    FavoriteInput: {
      /** @enum {string} */
      kind: "game" | "service" | "package";
      slug: string;
      service: string;
      package: string;
    };
    Favorite: {
      id: string;
      kind: string;
      slug: string;
      service: string;
      package: string;
      name: string;
      available: boolean;
    };
    Favorites: {
      favorites: components["schemas"]["Favorite"][];
      next: string;
    };
    ConversationProblem: {
      /** @enum {string} */
      code: "conversation_invalid" | "conversation_conflict";
      issues?: components["schemas"]["CatalogIssue"][];
    };
    Conversation: {
      id: string;
      order_id: string;
      linked_order_id: string;
      subject: string;
      slug: string;
      assigned_to?: string;
      /** @enum {string} */
      kind: "order" | "presales" | "fulfillment";
      /** @enum {string} */
      state: "open" | "waiting" | "resolved";
      version: number;
      sequence: number;
      unread: number;
      /** Format: date-time */
      created_at: string;
      /** Format: date-time */
      updated_at: string;
      booster_shared: boolean;
    };
    ConversationCreate: {
      /** Format: uuid */
      request_key: string;
      /** @enum {string} */
      kind: "order" | "presales";
      order_id: string;
      subject: string;
      slug: string;
    };
    ConversationSend: {
      /** Format: uuid */
      request_key: string;
      body: string;
      /** @enum {string} */
      visibility: "public" | "internal";
      attachments?: string[];
      /**
       * @description Proof requires a shared fulfillment scope, staff authority and ready same-uploader public images.
       * @enum {string}
       */
      purpose?: "" | "message" | "proof";
    };
    ConversationChange: {
      version: number;
      state: string;
      assigned_to: string;
      order_id: string;
      booster_shared?: boolean;
    };
    ConversationRead: {
      sequence: number;
    };
    ConversationMessage: {
      id: string;
      sender_label: string;
      sender_role: string;
      sender_id?: string;
      body: string;
      sequence: number;
      /** @enum {string} */
      visibility: "public" | "internal";
      /** Format: date-time */
      created_at: string;
      attachments?: string[];
      /** @enum {string} */
      purpose: "message" | "proof";
    };
    ConversationMessages: {
      messages: components["schemas"]["ConversationMessage"][];
      next: number;
      latest: number;
    };
    ConversationListing: {
      conversations: components["schemas"]["Conversation"][];
      next: string;
    };
    ActivityNotice: {
      id: string;
      kind: string;
      href: string;
      read: boolean;
      /** Format: date-time */
      created_at: string;
    };
    ActivityNotices: {
      notifications: components["schemas"]["ActivityNotice"][];
      next: string;
    };
    ActivityDelivery: {
      id: string;
      state: string;
      attempts: number;
      last_error: string;
      /** Format: date-time */
      created_at: string;
    };
    ActivityDeliveries: {
      deliveries: components["schemas"]["ActivityDelivery"][];
    };
    MediaIntent: {
      /** Format: uuid */
      request_key: string;
      /** Format: uuid */
      conversation_id: string;
      /** @enum {string} */
      visibility: "public" | "internal";
      checksum: string;
      size: number;
      /** @enum {string} */
      content_type: "image/png" | "image/jpeg" | "image/webp";
    };
    MediaFile: {
      id: string;
      /** @enum {string} */
      state:
        | "pending"
        | "uploaded"
        | "queued"
        | "ready"
        | "rejected"
        | "deleted"
        | "scan_failed";
      size: number;
      content_type: string;
      /** Format: date-time */
      expires_at: string;
    };
    MediaGrant: {
      /** @description Same-origin private URL; expires after one minute, bound to the active session. */
      url: string;
    };
    MediaProblem: {
      /** @enum {string} */
      code: "media_invalid" | "media_conflict";
    };
    FulfillmentPolicy: {
      /** @enum {string} */
      mode: "account" | "together" | "selection";
      field: string;
      account_value: string;
      together_value: string;
      secret_hours: number;
      share_fields: string[] | null;
    };
    FulfillmentView: {
      order_id: string;
      game: string;
      service: string;
      state: string;
      mode: string;
      alias: string;
      note: string;
      order_version: number;
      version: number;
      progress: number;
      secret_hours: number;
      completion_pending: boolean;
      /** Format: date-time */
      estimated_start: string | null;
      /** Format: date-time */
      estimated_finish: string | null;
      /** Format: date-time */
      updated_at: string;
      shared: {
        key: string;
        label: string;
        value: string | boolean | string[];
      }[];
      assigned_id?: string;
      handoff?: {
        [key: string]: string | boolean | string[];
      };
      access_version: number;
      coordination_id: string;
      coordination_shared: boolean;
      forecast?: components["schemas"]["DeliveryForecast"];
      forecast_review: boolean;
    };
    FulfillmentListing: {
      items: components["schemas"]["FulfillmentView"][];
      next: string;
    };
    FulfillmentAssignment: {
      version: number;
      order_version: number;
      assigned_id: string;
      reason: string;
    };
    FulfillmentUpdate: {
      version: number;
      order_version: number;
      note: string;
      progress: number;
      /** Format: date-time */
      estimated_start: string | null;
      /** Format: date-time */
      estimated_finish: string | null;
    };
    FulfillmentHandoff: {
      version: number;
      order_version: number;
      answers: {
        [key: string]: string | boolean | string[];
      };
    };
    FulfillmentSecretInput: {
      version: number;
      work_version: number;
      /** Format: uuid */
      request_key: string;
      /** Format: date-time */
      expires_at: string;
      /** Format: byte */
      value: string;
    };
    FulfillmentSecretView: {
      version: number;
      state: string;
      /** Format: date-time */
      expires_at: string | null;
    };
    FulfillmentSecretReveal: {
      /** Format: byte */
      value: string;
    };
    FulfillmentSecretRevoke: {
      version: number;
    };
    FulfillmentStaff: {
      staff: {
        id: string;
        alias: string;
        role: string;
      }[];
    };
    FulfillmentEmpty: Record<string, never>;
    FulfillmentProblem: {
      /** @enum {string} */
      code: "fulfillment_conflict" | "fulfillment_invalid";
      issues?: components["schemas"]["CatalogIssue"][];
    };
    CalendarLocalTime: {
      local: string;
      zone: string;
      /** @enum {string} */
      occurrence: "" | "first" | "second";
    };
    StaffCalendarProfile: {
      version: number;
      timezone: string;
      enabled: boolean;
      game_tags: string[];
      region_tags: string[];
    };
    AvailabilityWindow: {
      id: string;
      version: number;
      /** Format: date-time */
      starts_at: string;
      /** Format: date-time */
      ends_at: string;
      timezone: string;
      active: boolean;
    };
    StaffCalendar: {
      profile: components["schemas"]["StaffCalendarProfile"];
      windows: components["schemas"]["AvailabilityWindow"][];
      next: string;
    };
    AvailabilityInput: {
      /** Format: uuid */
      request_key: string;
      start: components["schemas"]["CalendarLocalTime"];
      end: components["schemas"]["CalendarLocalTime"];
    };
    BookingHistory: {
      version: number;
      state: string;
      note: string;
      actor_role: string;
      /** Format: date-time */
      created_at: string;
    };
    BookingView: {
      id: string;
      order_id: string;
      version: number;
      previous_id: string;
      /** Format: date-time */
      starts_at: string;
      /** Format: date-time */
      ends_at: string;
      timezone: string;
      state: string;
      history: components["schemas"]["BookingHistory"][];
    };
    BookingListing: {
      items: components["schemas"]["BookingView"][];
      next: string;
    };
    BookingInput: {
      work_version: number;
      /** Format: uuid */
      request_key: string;
      availability_id: string;
      start: components["schemas"]["CalendarLocalTime"];
      end: components["schemas"]["CalendarLocalTime"];
      previous_id: string;
      previous_version: number;
      note: string;
    };
    BookingAction: {
      version: number;
      note: string;
    };
    BookingSlots: {
      items: {
        availability_id: string;
        /** Format: date-time */
        starts_at: string;
        /** Format: date-time */
        ends_at: string;
        timezone: string;
      }[];
      next: string;
    };
    DeliveryCalendar: {
      zone: string;
      windows:
        | {
            weekday: number;
            start: string;
            end: string;
          }[]
        | null;
      closures: string[] | null;
    };
    DeliveryRule: {
      key: string;
      /** @enum {string} */
      mode: "account" | "together";
      when?: components["schemas"]["CatalogCondition"];
      min_minutes: number;
      max_minutes: number;
      wait_min_minutes: number;
      wait_max_minutes: number;
      workload_minutes: number;
    };
    DeliveryPolicy: {
      calendar: components["schemas"]["DeliveryCalendar"];
      rules: components["schemas"]["DeliveryRule"][] | null;
    };
    DeliveryForecast: {
      /** Format: date-time */
      calculated_at: string;
      rule: string;
      zone: string;
      /** Format: date-time */
      start_earliest: string;
      /** Format: date-time */
      start_latest: string;
      /** Format: date-time */
      finish_earliest: string;
      /** Format: date-time */
      finish_latest: string;
    };
    DeliveryForecastPreview: {
      /** @enum {string} */
      status: "ready" | "needs_review";
      reason: string;
      basis: string;
      forecast: components["schemas"]["DeliveryForecast"] | null;
    };
    DeliveryForecastApply: {
      version: number;
      order_version: number;
      /** Format: date-time */
      calculated_at: string;
      basis: string;
      note: string;
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
  customerOrders: {
    parameters: {
      query?: {
        after?: string;
        state?: string;
        search?: string;
      };
      header?: never;
      path?: never;
      cookie?: never;
    };
    requestBody?: never;
    responses: {
      /** @description Successful private order response */
      200: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          "application/json": components["schemas"]["OrderListing"];
        };
      };
      /** @description Reload changed state or correct validation issues. */
      409: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          "application/json": components["schemas"]["OrderProblem"];
        };
      };
      /** @description Reload changed state or correct validation issues. */
      422: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          "application/json": components["schemas"]["OrderProblem"];
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
  createOrder: {
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
        "application/json": components["schemas"]["OrderCreate"];
      };
    };
    responses: {
      /** @description Successful private order response */
      200: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          "application/json": components["schemas"]["OrderDetail"];
        };
      };
      /** @description Reload changed state or correct validation issues. */
      409: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          "application/json": components["schemas"]["OrderProblem"];
        };
      };
      /** @description Reload changed state or correct validation issues. */
      422: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          "application/json": components["schemas"]["OrderProblem"];
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
  customerOrder: {
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
      /** @description Successful private order response */
      200: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          "application/json": components["schemas"]["OrderDetail"];
        };
      };
      /** @description Reload changed state or correct validation issues. */
      409: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          "application/json": components["schemas"]["OrderProblem"];
        };
      };
      /** @description Reload changed state or correct validation issues. */
      422: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          "application/json": components["schemas"]["OrderProblem"];
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
  customerOrderEvents: {
    parameters: {
      query?: {
        after?: string;
      };
      header?: never;
      path: {
        id: string;
      };
      cookie?: never;
    };
    requestBody?: never;
    responses: {
      /** @description Successful private order response */
      200: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          "application/json": components["schemas"]["OrderEvents"];
        };
      };
      /** @description Reload changed state or correct validation issues. */
      409: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          "application/json": components["schemas"]["OrderProblem"];
        };
      };
      /** @description Reload changed state or correct validation issues. */
      422: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          "application/json": components["schemas"]["OrderProblem"];
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
  customerOrderQuotes: {
    parameters: {
      query?: {
        before?: string;
      };
      header?: never;
      path: {
        id: string;
      };
      cookie?: never;
    };
    requestBody?: never;
    responses: {
      /** @description Successful private order response */
      200: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          "application/json": components["schemas"]["OrderQuotes"];
        };
      };
      /** @description Reload changed state or correct validation issues. */
      409: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          "application/json": components["schemas"]["OrderProblem"];
        };
      };
      /** @description Reload changed state or correct validation issues. */
      422: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          "application/json": components["schemas"]["OrderProblem"];
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
  customerAcceptOrder: {
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
        "application/json": components["schemas"]["OrderAction"];
      };
    };
    responses: {
      /** @description Successful private order response */
      200: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          "application/json": components["schemas"]["OrderDetail"];
        };
      };
      /** @description Reload changed state or correct validation issues. */
      409: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          "application/json": components["schemas"]["OrderProblem"];
        };
      };
      /** @description Reload changed state or correct validation issues. */
      422: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          "application/json": components["schemas"]["OrderProblem"];
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
  customerDeclineOrder: {
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
        "application/json": components["schemas"]["OrderAction"];
      };
    };
    responses: {
      /** @description Successful private order response */
      200: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          "application/json": components["schemas"]["OrderDetail"];
        };
      };
      /** @description Reload changed state or correct validation issues. */
      409: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          "application/json": components["schemas"]["OrderProblem"];
        };
      };
      /** @description Reload changed state or correct validation issues. */
      422: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          "application/json": components["schemas"]["OrderProblem"];
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
  customerCancelOrder: {
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
        "application/json": components["schemas"]["OrderAction"];
      };
    };
    responses: {
      /** @description Successful private order response */
      200: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          "application/json": components["schemas"]["OrderDetail"];
        };
      };
      /** @description Reload changed state or correct validation issues. */
      409: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          "application/json": components["schemas"]["OrderProblem"];
        };
      };
      /** @description Reload changed state or correct validation issues. */
      422: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          "application/json": components["schemas"]["OrderProblem"];
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
  adminOrders: {
    parameters: {
      query?: {
        after?: string;
        state?: string;
        search?: string;
      };
      header?: never;
      path?: never;
      cookie?: never;
    };
    requestBody?: never;
    responses: {
      /** @description Successful private order response */
      200: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          "application/json": components["schemas"]["OrderListing"];
        };
      };
      /** @description Reload changed state or correct validation issues. */
      409: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          "application/json": components["schemas"]["OrderProblem"];
        };
      };
      /** @description Reload changed state or correct validation issues. */
      422: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          "application/json": components["schemas"]["OrderProblem"];
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
  adminOrder: {
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
      /** @description Successful private order response */
      200: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          "application/json": components["schemas"]["OrderDetail"];
        };
      };
      /** @description Reload changed state or correct validation issues. */
      409: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          "application/json": components["schemas"]["OrderProblem"];
        };
      };
      /** @description Reload changed state or correct validation issues. */
      422: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          "application/json": components["schemas"]["OrderProblem"];
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
  adminOrderEvents: {
    parameters: {
      query?: {
        after?: string;
      };
      header?: never;
      path: {
        id: string;
      };
      cookie?: never;
    };
    requestBody?: never;
    responses: {
      /** @description Successful private order response */
      200: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          "application/json": components["schemas"]["OrderEvents"];
        };
      };
      /** @description Reload changed state or correct validation issues. */
      409: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          "application/json": components["schemas"]["OrderProblem"];
        };
      };
      /** @description Reload changed state or correct validation issues. */
      422: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          "application/json": components["schemas"]["OrderProblem"];
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
  adminOrderQuotes: {
    parameters: {
      query?: {
        before?: string;
      };
      header?: never;
      path: {
        id: string;
      };
      cookie?: never;
    };
    requestBody?: never;
    responses: {
      /** @description Successful private order response */
      200: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          "application/json": components["schemas"]["OrderQuotes"];
        };
      };
      /** @description Reload changed state or correct validation issues. */
      409: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          "application/json": components["schemas"]["OrderProblem"];
        };
      };
      /** @description Reload changed state or correct validation issues. */
      422: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          "application/json": components["schemas"]["OrderProblem"];
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
  adminClarifyOrder: {
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
        "application/json": components["schemas"]["OrderAction"];
      };
    };
    responses: {
      /** @description Successful private order response */
      200: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          "application/json": components["schemas"]["OrderDetail"];
        };
      };
      /** @description Reload changed state or correct validation issues. */
      409: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          "application/json": components["schemas"]["OrderProblem"];
        };
      };
      /** @description Reload changed state or correct validation issues. */
      422: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          "application/json": components["schemas"]["OrderProblem"];
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
  adminRejectOrder: {
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
        "application/json": components["schemas"]["OrderAction"];
      };
    };
    responses: {
      /** @description Successful private order response */
      200: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          "application/json": components["schemas"]["OrderDetail"];
        };
      };
      /** @description Reload changed state or correct validation issues. */
      409: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          "application/json": components["schemas"]["OrderProblem"];
        };
      };
      /** @description Reload changed state or correct validation issues. */
      422: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          "application/json": components["schemas"]["OrderProblem"];
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
  adminCancelOrder: {
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
        "application/json": components["schemas"]["OrderAction"];
      };
    };
    responses: {
      /** @description Successful private order response */
      200: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          "application/json": components["schemas"]["OrderDetail"];
        };
      };
      /** @description Reload changed state or correct validation issues. */
      409: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          "application/json": components["schemas"]["OrderProblem"];
        };
      };
      /** @description Reload changed state or correct validation issues. */
      422: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          "application/json": components["schemas"]["OrderProblem"];
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
  issueOrderQuote: {
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
        "application/json": components["schemas"]["OrderQuoteInput"];
      };
    };
    responses: {
      /** @description Successful private order response */
      200: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          "application/json": components["schemas"]["OrderDetail"];
        };
      };
      /** @description Reload changed state or correct validation issues. */
      409: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          "application/json": components["schemas"]["OrderProblem"];
        };
      };
      /** @description Reload changed state or correct validation issues. */
      422: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          "application/json": components["schemas"]["OrderProblem"];
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
  reviseOrder: {
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
        "application/json": components["schemas"]["OrderRevision"];
      };
    };
    responses: {
      /** @description Successful private order response */
      200: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          "application/json": components["schemas"]["OrderDetail"];
        };
      };
      /** @description Reload changed state or correct validation issues. */
      409: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          "application/json": components["schemas"]["OrderProblem"];
        };
      };
      /** @description Reload changed state or correct validation issues. */
      422: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          "application/json": components["schemas"]["OrderProblem"];
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
  validateOrderRevision: {
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
        "application/json": components["schemas"]["CatalogValidationInput"];
      };
    };
    responses: {
      /** @description Successful private order response */
      200: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          "application/json": components["schemas"]["CatalogValidation"];
        };
      };
      /** @description Reload changed state or correct validation issues. */
      409: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          "application/json": components["schemas"]["OrderProblem"];
        };
      };
      /** @description Reload changed state or correct validation issues. */
      422: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          "application/json": components["schemas"]["OrderProblem"];
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
  prepareReorder: {
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
      /** @description Successful private order response */
      200: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          "application/json": components["schemas"]["OrderReorder"];
        };
      };
      /** @description Reload changed state or correct validation issues. */
      409: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          "application/json": components["schemas"]["OrderProblem"];
        };
      };
      /** @description Reload changed state or correct validation issues. */
      422: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          "application/json": components["schemas"]["OrderProblem"];
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
  listFavorites: {
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
      /** @description Successful private order response */
      200: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          "application/json": components["schemas"]["Favorites"];
        };
      };
      /** @description Reload changed state or correct validation issues. */
      409: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          "application/json": components["schemas"]["OrderProblem"];
        };
      };
      /** @description Reload changed state or correct validation issues. */
      422: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          "application/json": components["schemas"]["OrderProblem"];
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
  saveFavorite: {
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
        "application/json": components["schemas"]["FavoriteInput"];
      };
    };
    responses: {
      /** @description Successful private order response */
      200: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          "application/json": components["schemas"]["Favorite"];
        };
      };
      /** @description Reload changed state or correct validation issues. */
      409: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          "application/json": components["schemas"]["OrderProblem"];
        };
      };
      /** @description Reload changed state or correct validation issues. */
      422: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          "application/json": components["schemas"]["OrderProblem"];
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
  removeFavorite: {
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
    requestBody?: never;
    responses: {
      /** @description Successful private order response */
      204: {
        headers: {
          [name: string]: unknown;
        };
        content?: never;
      };
      /** @description Reload changed state or correct validation issues. */
      409: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          "application/json": components["schemas"]["OrderProblem"];
        };
      };
      /** @description Reload changed state or correct validation issues. */
      422: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          "application/json": components["schemas"]["OrderProblem"];
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
  customerConversations: {
    parameters: {
      query?: {
        after?: string;
        state?: string;
        assigned?: string;
        order_id?: string;
      };
      header?: never;
      path?: never;
      cookie?: never;
    };
    requestBody?: never;
    responses: {
      /** @description Successful private response */
      200: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          "application/json": components["schemas"]["ConversationListing"];
        };
      };
      /** @description Correct validation or reload current state. */
      409: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          "application/json": components["schemas"]["ConversationProblem"];
        };
      };
      /** @description Correct validation or reload current state. */
      422: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          "application/json": components["schemas"]["ConversationProblem"];
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
  customerCreateConversation: {
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
        "application/json": components["schemas"]["ConversationCreate"];
      };
    };
    responses: {
      /** @description Successful private response */
      200: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          "application/json": components["schemas"]["Conversation"];
        };
      };
      /** @description Correct validation or reload current state. */
      409: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          "application/json": components["schemas"]["ConversationProblem"];
        };
      };
      /** @description Correct validation or reload current state. */
      422: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          "application/json": components["schemas"]["ConversationProblem"];
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
  customerConversation: {
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
      /** @description Successful private response */
      200: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          "application/json": components["schemas"]["Conversation"];
        };
      };
      /** @description Correct validation or reload current state. */
      409: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          "application/json": components["schemas"]["ConversationProblem"];
        };
      };
      /** @description Correct validation or reload current state. */
      422: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          "application/json": components["schemas"]["ConversationProblem"];
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
  customerConversationMessages: {
    parameters: {
      query?: {
        after?: string;
        before?: string;
      };
      header?: never;
      path: {
        id: string;
      };
      cookie?: never;
    };
    requestBody?: never;
    responses: {
      /** @description Successful private response */
      200: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          "application/json": components["schemas"]["ConversationMessages"];
        };
      };
      /** @description Correct validation or reload current state. */
      409: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          "application/json": components["schemas"]["ConversationProblem"];
        };
      };
      /** @description Correct validation or reload current state. */
      422: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          "application/json": components["schemas"]["ConversationProblem"];
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
  customerSendConversationMessage: {
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
        "application/json": components["schemas"]["ConversationSend"];
      };
    };
    responses: {
      /** @description Successful private response */
      200: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          "application/json": components["schemas"]["ConversationMessage"];
        };
      };
      /** @description Correct validation or reload current state. */
      409: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          "application/json": components["schemas"]["ConversationProblem"];
        };
      };
      /** @description Correct validation or reload current state. */
      422: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          "application/json": components["schemas"]["ConversationProblem"];
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
  customerReadConversation: {
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
        "application/json": components["schemas"]["ConversationRead"];
      };
    };
    responses: {
      /** @description Successful private response */
      204: {
        headers: {
          [name: string]: unknown;
        };
        content?: never;
      };
      /** @description Correct validation or reload current state. */
      409: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          "application/json": components["schemas"]["ConversationProblem"];
        };
      };
      /** @description Correct validation or reload current state. */
      422: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          "application/json": components["schemas"]["ConversationProblem"];
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
  customerConversationStream: {
    parameters: {
      query?: {
        after?: string;
      };
      header?: {
        "Last-Event-ID"?: string;
      };
      path: {
        id: string;
      };
      cookie?: never;
    };
    requestBody?: never;
    responses: {
      /** @description Private server-sent change cursor hints. */
      200: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          "text/event-stream": string;
        };
      };
      /** @description Correct validation or reload current state. */
      409: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          "application/json": components["schemas"]["ConversationProblem"];
        };
      };
      /** @description Correct validation or reload current state. */
      422: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          "application/json": components["schemas"]["ConversationProblem"];
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
  staffConversations: {
    parameters: {
      query?: {
        after?: string;
        state?: string;
        assigned?: string;
        order_id?: string;
      };
      header?: never;
      path?: never;
      cookie?: never;
    };
    requestBody?: never;
    responses: {
      /** @description Successful private response */
      200: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          "application/json": components["schemas"]["ConversationListing"];
        };
      };
      /** @description Correct validation or reload current state. */
      409: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          "application/json": components["schemas"]["ConversationProblem"];
        };
      };
      /** @description Correct validation or reload current state. */
      422: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          "application/json": components["schemas"]["ConversationProblem"];
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
  staffCreateConversation: {
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
        "application/json": components["schemas"]["ConversationCreate"];
      };
    };
    responses: {
      /** @description Successful private response */
      200: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          "application/json": components["schemas"]["Conversation"];
        };
      };
      /** @description Correct validation or reload current state. */
      409: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          "application/json": components["schemas"]["ConversationProblem"];
        };
      };
      /** @description Correct validation or reload current state. */
      422: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          "application/json": components["schemas"]["ConversationProblem"];
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
  staffConversation: {
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
      /** @description Successful private response */
      200: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          "application/json": components["schemas"]["Conversation"];
        };
      };
      /** @description Correct validation or reload current state. */
      409: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          "application/json": components["schemas"]["ConversationProblem"];
        };
      };
      /** @description Correct validation or reload current state. */
      422: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          "application/json": components["schemas"]["ConversationProblem"];
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
  staffConversationMessages: {
    parameters: {
      query?: {
        after?: string;
        before?: string;
      };
      header?: never;
      path: {
        id: string;
      };
      cookie?: never;
    };
    requestBody?: never;
    responses: {
      /** @description Successful private response */
      200: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          "application/json": components["schemas"]["ConversationMessages"];
        };
      };
      /** @description Correct validation or reload current state. */
      409: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          "application/json": components["schemas"]["ConversationProblem"];
        };
      };
      /** @description Correct validation or reload current state. */
      422: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          "application/json": components["schemas"]["ConversationProblem"];
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
  staffSendConversationMessage: {
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
        "application/json": components["schemas"]["ConversationSend"];
      };
    };
    responses: {
      /** @description Successful private response */
      200: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          "application/json": components["schemas"]["ConversationMessage"];
        };
      };
      /** @description Correct validation or reload current state. */
      409: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          "application/json": components["schemas"]["ConversationProblem"];
        };
      };
      /** @description Correct validation or reload current state. */
      422: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          "application/json": components["schemas"]["ConversationProblem"];
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
  staffReadConversation: {
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
        "application/json": components["schemas"]["ConversationRead"];
      };
    };
    responses: {
      /** @description Successful private response */
      204: {
        headers: {
          [name: string]: unknown;
        };
        content?: never;
      };
      /** @description Correct validation or reload current state. */
      409: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          "application/json": components["schemas"]["ConversationProblem"];
        };
      };
      /** @description Correct validation or reload current state. */
      422: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          "application/json": components["schemas"]["ConversationProblem"];
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
  staffConversationStream: {
    parameters: {
      query?: {
        after?: string;
      };
      header?: {
        "Last-Event-ID"?: string;
      };
      path: {
        id: string;
      };
      cookie?: never;
    };
    requestBody?: never;
    responses: {
      /** @description Private server-sent change cursor hints. */
      200: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          "text/event-stream": string;
        };
      };
      /** @description Correct validation or reload current state. */
      409: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          "application/json": components["schemas"]["ConversationProblem"];
        };
      };
      /** @description Correct validation or reload current state. */
      422: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          "application/json": components["schemas"]["ConversationProblem"];
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
  staffStateConversation: {
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
        "application/json": components["schemas"]["ConversationChange"];
      };
    };
    responses: {
      /** @description Successful private response */
      200: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          "application/json": components["schemas"]["Conversation"];
        };
      };
      /** @description Correct validation or reload current state. */
      409: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          "application/json": components["schemas"]["ConversationProblem"];
        };
      };
      /** @description Correct validation or reload current state. */
      422: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          "application/json": components["schemas"]["ConversationProblem"];
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
  staffAssignConversation: {
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
        "application/json": components["schemas"]["ConversationChange"];
      };
    };
    responses: {
      /** @description Successful private response */
      200: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          "application/json": components["schemas"]["Conversation"];
        };
      };
      /** @description Correct validation or reload current state. */
      409: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          "application/json": components["schemas"]["ConversationProblem"];
        };
      };
      /** @description Correct validation or reload current state. */
      422: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          "application/json": components["schemas"]["ConversationProblem"];
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
  staffLinkConversation: {
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
        "application/json": components["schemas"]["ConversationChange"];
      };
    };
    responses: {
      /** @description Successful private response */
      200: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          "application/json": components["schemas"]["Conversation"];
        };
      };
      /** @description Correct validation or reload current state. */
      409: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          "application/json": components["schemas"]["ConversationProblem"];
        };
      };
      /** @description Correct validation or reload current state. */
      422: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          "application/json": components["schemas"]["ConversationProblem"];
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
  listActivityNotices: {
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
      /** @description Successful private response */
      200: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          "application/json": components["schemas"]["ActivityNotices"];
        };
      };
      /** @description Correct validation or reload current state. */
      409: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          "application/json": components["schemas"]["ConversationProblem"];
        };
      };
      /** @description Correct validation or reload current state. */
      422: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          "application/json": components["schemas"]["ConversationProblem"];
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
  readActivityNotice: {
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
    requestBody?: never;
    responses: {
      /** @description Successful private response */
      204: {
        headers: {
          [name: string]: unknown;
        };
        content?: never;
      };
      /** @description Correct validation or reload current state. */
      409: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          "application/json": components["schemas"]["ConversationProblem"];
        };
      };
      /** @description Correct validation or reload current state. */
      422: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          "application/json": components["schemas"]["ConversationProblem"];
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
  activityEmailDeliveries: {
    parameters: {
      query?: never;
      header?: never;
      path?: never;
      cookie?: never;
    };
    requestBody?: never;
    responses: {
      /** @description Successful private response */
      200: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          "application/json": components["schemas"]["ActivityDeliveries"];
        };
      };
      /** @description Correct validation or reload current state. */
      409: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          "application/json": components["schemas"]["ConversationProblem"];
        };
      };
      /** @description Correct validation or reload current state. */
      422: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          "application/json": components["schemas"]["ConversationProblem"];
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
  retryActivityEmail: {
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
    requestBody?: never;
    responses: {
      /** @description Successful private response */
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
  customerCreateMediaIntent: {
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
        "application/json": components["schemas"]["MediaIntent"];
      };
    };
    responses: {
      /** @description Successful private response */
      200: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          "application/json": components["schemas"]["MediaFile"];
        };
      };
      /** @description Correct validation or reload current state. */
      409: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          "application/json": components["schemas"]["MediaProblem"];
        };
      };
      /** @description Correct validation or reload current state. */
      422: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          "application/json": components["schemas"]["MediaProblem"];
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
  customerGetMedia: {
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
      /** @description Successful private response */
      200: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          "application/json": components["schemas"]["MediaFile"];
        };
      };
      /** @description Correct validation or reload current state. */
      409: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          "application/json": components["schemas"]["MediaProblem"];
        };
      };
      /** @description Correct validation or reload current state. */
      422: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          "application/json": components["schemas"]["MediaProblem"];
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
  customerUploadMedia: {
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
        "application/octet-stream": string;
      };
    };
    responses: {
      /** @description Operation completed. */
      204: {
        headers: {
          [name: string]: unknown;
        };
        content?: never;
      };
      /** @description Correct validation or reload current state. */
      409: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          "application/json": components["schemas"]["MediaProblem"];
        };
      };
      /** @description Correct validation or reload current state. */
      422: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          "application/json": components["schemas"]["MediaProblem"];
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
  customerFinalizeMedia: {
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
    requestBody?: never;
    responses: {
      /** @description Successful private response */
      200: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          "application/json": components["schemas"]["MediaFile"];
        };
      };
      /** @description Correct validation or reload current state. */
      409: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          "application/json": components["schemas"]["MediaProblem"];
        };
      };
      /** @description Correct validation or reload current state. */
      422: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          "application/json": components["schemas"]["MediaProblem"];
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
  customerGrantMedia: {
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
    requestBody?: never;
    responses: {
      /** @description Successful private response */
      200: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          "application/json": components["schemas"]["MediaGrant"];
        };
      };
      /** @description Correct validation or reload current state. */
      409: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          "application/json": components["schemas"]["MediaProblem"];
        };
      };
      /** @description Correct validation or reload current state. */
      422: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          "application/json": components["schemas"]["MediaProblem"];
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
  customerDownloadMedia: {
    parameters: {
      query: {
        expires: string;
        signature: string;
      };
      header?: never;
      path: {
        id: string;
      };
      cookie?: never;
    };
    requestBody?: never;
    responses: {
      /** @description Private sanitized image; no-store and attachment disposition. */
      200: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          "image/png": string;
          "image/jpeg": string;
        };
      };
      /** @description Correct validation or reload current state. */
      409: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          "application/json": components["schemas"]["MediaProblem"];
        };
      };
      /** @description Correct validation or reload current state. */
      422: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          "application/json": components["schemas"]["MediaProblem"];
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
  customerRetryMedia: {
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
    requestBody?: never;
    responses: {
      /** @description Operation completed. */
      204: {
        headers: {
          [name: string]: unknown;
        };
        content?: never;
      };
      /** @description Correct validation or reload current state. */
      409: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          "application/json": components["schemas"]["MediaProblem"];
        };
      };
      /** @description Correct validation or reload current state. */
      422: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          "application/json": components["schemas"]["MediaProblem"];
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
  customerRemoveMedia: {
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
    requestBody?: never;
    responses: {
      /** @description Operation completed. */
      204: {
        headers: {
          [name: string]: unknown;
        };
        content?: never;
      };
      /** @description Correct validation or reload current state. */
      409: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          "application/json": components["schemas"]["MediaProblem"];
        };
      };
      /** @description Correct validation or reload current state. */
      422: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          "application/json": components["schemas"]["MediaProblem"];
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
  staffCreateMediaIntent: {
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
        "application/json": components["schemas"]["MediaIntent"];
      };
    };
    responses: {
      /** @description Successful private response */
      200: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          "application/json": components["schemas"]["MediaFile"];
        };
      };
      /** @description Correct validation or reload current state. */
      409: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          "application/json": components["schemas"]["MediaProblem"];
        };
      };
      /** @description Correct validation or reload current state. */
      422: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          "application/json": components["schemas"]["MediaProblem"];
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
  staffGetMedia: {
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
      /** @description Successful private response */
      200: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          "application/json": components["schemas"]["MediaFile"];
        };
      };
      /** @description Correct validation or reload current state. */
      409: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          "application/json": components["schemas"]["MediaProblem"];
        };
      };
      /** @description Correct validation or reload current state. */
      422: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          "application/json": components["schemas"]["MediaProblem"];
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
  staffUploadMedia: {
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
        "application/octet-stream": string;
      };
    };
    responses: {
      /** @description Operation completed. */
      204: {
        headers: {
          [name: string]: unknown;
        };
        content?: never;
      };
      /** @description Correct validation or reload current state. */
      409: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          "application/json": components["schemas"]["MediaProblem"];
        };
      };
      /** @description Correct validation or reload current state. */
      422: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          "application/json": components["schemas"]["MediaProblem"];
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
  staffFinalizeMedia: {
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
    requestBody?: never;
    responses: {
      /** @description Successful private response */
      200: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          "application/json": components["schemas"]["MediaFile"];
        };
      };
      /** @description Correct validation or reload current state. */
      409: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          "application/json": components["schemas"]["MediaProblem"];
        };
      };
      /** @description Correct validation or reload current state. */
      422: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          "application/json": components["schemas"]["MediaProblem"];
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
  staffGrantMedia: {
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
    requestBody?: never;
    responses: {
      /** @description Successful private response */
      200: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          "application/json": components["schemas"]["MediaGrant"];
        };
      };
      /** @description Correct validation or reload current state. */
      409: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          "application/json": components["schemas"]["MediaProblem"];
        };
      };
      /** @description Correct validation or reload current state. */
      422: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          "application/json": components["schemas"]["MediaProblem"];
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
  staffDownloadMedia: {
    parameters: {
      query: {
        expires: string;
        signature: string;
      };
      header?: never;
      path: {
        id: string;
      };
      cookie?: never;
    };
    requestBody?: never;
    responses: {
      /** @description Private sanitized image; no-store and attachment disposition. */
      200: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          "image/png": string;
          "image/jpeg": string;
        };
      };
      /** @description Correct validation or reload current state. */
      409: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          "application/json": components["schemas"]["MediaProblem"];
        };
      };
      /** @description Correct validation or reload current state. */
      422: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          "application/json": components["schemas"]["MediaProblem"];
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
  staffRetryMedia: {
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
    requestBody?: never;
    responses: {
      /** @description Operation completed. */
      204: {
        headers: {
          [name: string]: unknown;
        };
        content?: never;
      };
      /** @description Correct validation or reload current state. */
      409: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          "application/json": components["schemas"]["MediaProblem"];
        };
      };
      /** @description Correct validation or reload current state. */
      422: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          "application/json": components["schemas"]["MediaProblem"];
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
  staffRemoveMedia: {
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
    requestBody?: never;
    responses: {
      /** @description Operation completed. */
      204: {
        headers: {
          [name: string]: unknown;
        };
        content?: never;
      };
      /** @description Correct validation or reload current state. */
      409: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          "application/json": components["schemas"]["MediaProblem"];
        };
      };
      /** @description Correct validation or reload current state. */
      422: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          "application/json": components["schemas"]["MediaProblem"];
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
  accountFulfillmentget_id: {
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
      /** @description Successful private order response */
      200: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          "application/json": components["schemas"]["FulfillmentView"];
        };
      };
      /** @description Reload changed state or correct validation issues. */
      409: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          "application/json": components["schemas"]["FulfillmentProblem"];
        };
      };
      /** @description Reload changed state or correct validation issues. */
      422: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          "application/json": components["schemas"]["FulfillmentProblem"];
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
  accountFulfillmentpost_id_handoff: {
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
        "application/json": components["schemas"]["FulfillmentHandoff"];
      };
    };
    responses: {
      /** @description Successful private order response */
      200: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          "application/json": components["schemas"]["FulfillmentView"];
        };
      };
      /** @description Reload changed state or correct validation issues. */
      409: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          "application/json": components["schemas"]["FulfillmentProblem"];
        };
      };
      /** @description Reload changed state or correct validation issues. */
      422: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          "application/json": components["schemas"]["FulfillmentProblem"];
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
  accountFulfillmentget_id_secret: {
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
      /** @description Successful private order response */
      200: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          "application/json": components["schemas"]["FulfillmentSecretView"];
        };
      };
      /** @description Reload changed state or correct validation issues. */
      409: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          "application/json": components["schemas"]["FulfillmentProblem"];
        };
      };
      /** @description Reload changed state or correct validation issues. */
      422: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          "application/json": components["schemas"]["FulfillmentProblem"];
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
  accountFulfillmentpost_id_secret: {
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
        "application/json": components["schemas"]["FulfillmentSecretInput"];
      };
    };
    responses: {
      /** @description Successful private order response */
      200: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          "application/json": components["schemas"]["FulfillmentSecretView"];
        };
      };
      /** @description Reload changed state or correct validation issues. */
      409: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          "application/json": components["schemas"]["FulfillmentProblem"];
        };
      };
      /** @description Reload changed state or correct validation issues. */
      422: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          "application/json": components["schemas"]["FulfillmentProblem"];
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
  accountFulfillmentpost_id_secret_revoke: {
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
        "application/json": components["schemas"]["FulfillmentSecretRevoke"];
      };
    };
    responses: {
      /** @description Live credentials revoked */
      204: {
        headers: {
          [name: string]: unknown;
        };
        content?: never;
      };
      /** @description Reload changed state or correct validation issues. */
      409: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          "application/json": components["schemas"]["FulfillmentProblem"];
        };
      };
      /** @description Reload changed state or correct validation issues. */
      422: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          "application/json": components["schemas"]["FulfillmentProblem"];
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
  adminFulfillmentget_id: {
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
      /** @description Successful private order response */
      200: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          "application/json": components["schemas"]["FulfillmentView"];
        };
      };
      /** @description Reload changed state or correct validation issues. */
      409: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          "application/json": components["schemas"]["FulfillmentProblem"];
        };
      };
      /** @description Reload changed state or correct validation issues. */
      422: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          "application/json": components["schemas"]["FulfillmentProblem"];
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
  adminFulfillmentget: {
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
      /** @description Successful private order response */
      200: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          "application/json": components["schemas"]["FulfillmentListing"];
        };
      };
      /** @description Reload changed state or correct validation issues. */
      409: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          "application/json": components["schemas"]["FulfillmentProblem"];
        };
      };
      /** @description Reload changed state or correct validation issues. */
      422: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          "application/json": components["schemas"]["FulfillmentProblem"];
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
  adminFulfillmentpost_id_secret_reveal: {
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
        "application/json": components["schemas"]["FulfillmentEmpty"];
      };
    };
    responses: {
      /** @description Successful private order response */
      200: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          "application/json": components["schemas"]["FulfillmentSecretReveal"];
        };
      };
      /** @description Reload changed state or correct validation issues. */
      409: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          "application/json": components["schemas"]["FulfillmentProblem"];
        };
      };
      /** @description Reload changed state or correct validation issues. */
      422: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          "application/json": components["schemas"]["FulfillmentProblem"];
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
  adminFulfillmentpost_id_start: {
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
        "application/json": components["schemas"]["FulfillmentUpdate"];
      };
    };
    responses: {
      /** @description Successful private order response */
      200: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          "application/json": components["schemas"]["FulfillmentView"];
        };
      };
      /** @description Reload changed state or correct validation issues. */
      409: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          "application/json": components["schemas"]["FulfillmentProblem"];
        };
      };
      /** @description Reload changed state or correct validation issues. */
      422: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          "application/json": components["schemas"]["FulfillmentProblem"];
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
  adminFulfillmentpost_id_resume: {
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
        "application/json": components["schemas"]["FulfillmentUpdate"];
      };
    };
    responses: {
      /** @description Successful private order response */
      200: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          "application/json": components["schemas"]["FulfillmentView"];
        };
      };
      /** @description Reload changed state or correct validation issues. */
      409: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          "application/json": components["schemas"]["FulfillmentProblem"];
        };
      };
      /** @description Reload changed state or correct validation issues. */
      422: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          "application/json": components["schemas"]["FulfillmentProblem"];
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
  adminFulfillmentpost_id_hold: {
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
        "application/json": components["schemas"]["FulfillmentUpdate"];
      };
    };
    responses: {
      /** @description Successful private order response */
      200: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          "application/json": components["schemas"]["FulfillmentView"];
        };
      };
      /** @description Reload changed state or correct validation issues. */
      409: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          "application/json": components["schemas"]["FulfillmentProblem"];
        };
      };
      /** @description Reload changed state or correct validation issues. */
      422: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          "application/json": components["schemas"]["FulfillmentProblem"];
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
  adminFulfillmentpost_id_progress: {
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
        "application/json": components["schemas"]["FulfillmentUpdate"];
      };
    };
    responses: {
      /** @description Successful private order response */
      200: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          "application/json": components["schemas"]["FulfillmentView"];
        };
      };
      /** @description Reload changed state or correct validation issues. */
      409: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          "application/json": components["schemas"]["FulfillmentProblem"];
        };
      };
      /** @description Reload changed state or correct validation issues. */
      422: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          "application/json": components["schemas"]["FulfillmentProblem"];
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
  adminFulfillmentpost_id_submit_completion: {
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
        "application/json": components["schemas"]["FulfillmentUpdate"];
      };
    };
    responses: {
      /** @description Successful private order response */
      200: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          "application/json": components["schemas"]["FulfillmentView"];
        };
      };
      /** @description Reload changed state or correct validation issues. */
      409: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          "application/json": components["schemas"]["FulfillmentProblem"];
        };
      };
      /** @description Reload changed state or correct validation issues. */
      422: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          "application/json": components["schemas"]["FulfillmentProblem"];
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
  adminFulfillmentpost_id_approve_completion: {
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
        "application/json": components["schemas"]["FulfillmentUpdate"];
      };
    };
    responses: {
      /** @description Successful private order response */
      200: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          "application/json": components["schemas"]["FulfillmentView"];
        };
      };
      /** @description Reload changed state or correct validation issues. */
      409: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          "application/json": components["schemas"]["FulfillmentProblem"];
        };
      };
      /** @description Reload changed state or correct validation issues. */
      422: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          "application/json": components["schemas"]["FulfillmentProblem"];
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
  adminFulfillmentpost_id_return_completion: {
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
        "application/json": components["schemas"]["FulfillmentUpdate"];
      };
    };
    responses: {
      /** @description Successful private order response */
      200: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          "application/json": components["schemas"]["FulfillmentView"];
        };
      };
      /** @description Reload changed state or correct validation issues. */
      409: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          "application/json": components["schemas"]["FulfillmentProblem"];
        };
      };
      /** @description Reload changed state or correct validation issues. */
      422: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          "application/json": components["schemas"]["FulfillmentProblem"];
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
  adminFulfillmentpost_id_estimate: {
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
        "application/json": components["schemas"]["FulfillmentUpdate"];
      };
    };
    responses: {
      /** @description Successful private order response */
      200: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          "application/json": components["schemas"]["FulfillmentView"];
        };
      };
      /** @description Reload changed state or correct validation issues. */
      409: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          "application/json": components["schemas"]["FulfillmentProblem"];
        };
      };
      /** @description Reload changed state or correct validation issues. */
      422: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          "application/json": components["schemas"]["FulfillmentProblem"];
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
  adminFulfillmentget_staff: {
    parameters: {
      query?: never;
      header?: never;
      path?: never;
      cookie?: never;
    };
    requestBody?: never;
    responses: {
      /** @description Successful private order response */
      200: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          "application/json": components["schemas"]["FulfillmentStaff"];
        };
      };
      /** @description Reload changed state or correct validation issues. */
      409: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          "application/json": components["schemas"]["FulfillmentProblem"];
        };
      };
      /** @description Reload changed state or correct validation issues. */
      422: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          "application/json": components["schemas"]["FulfillmentProblem"];
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
  adminFulfillmentpost_id_assign: {
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
        "application/json": components["schemas"]["FulfillmentAssignment"];
      };
    };
    responses: {
      /** @description Successful private order response */
      200: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          "application/json": components["schemas"]["FulfillmentView"];
        };
      };
      /** @description Reload changed state or correct validation issues. */
      409: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          "application/json": components["schemas"]["FulfillmentProblem"];
        };
      };
      /** @description Reload changed state or correct validation issues. */
      422: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          "application/json": components["schemas"]["FulfillmentProblem"];
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
  boosterFulfillmentget_id: {
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
      /** @description Successful private order response */
      200: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          "application/json": components["schemas"]["FulfillmentView"];
        };
      };
      /** @description Reload changed state or correct validation issues. */
      409: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          "application/json": components["schemas"]["FulfillmentProblem"];
        };
      };
      /** @description Reload changed state or correct validation issues. */
      422: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          "application/json": components["schemas"]["FulfillmentProblem"];
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
  boosterFulfillmentget: {
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
      /** @description Successful private order response */
      200: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          "application/json": components["schemas"]["FulfillmentListing"];
        };
      };
      /** @description Reload changed state or correct validation issues. */
      409: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          "application/json": components["schemas"]["FulfillmentProblem"];
        };
      };
      /** @description Reload changed state or correct validation issues. */
      422: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          "application/json": components["schemas"]["FulfillmentProblem"];
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
  boosterFulfillmentpost_id_secret_reveal: {
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
        "application/json": components["schemas"]["FulfillmentEmpty"];
      };
    };
    responses: {
      /** @description Successful private order response */
      200: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          "application/json": components["schemas"]["FulfillmentSecretReveal"];
        };
      };
      /** @description Reload changed state or correct validation issues. */
      409: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          "application/json": components["schemas"]["FulfillmentProblem"];
        };
      };
      /** @description Reload changed state or correct validation issues. */
      422: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          "application/json": components["schemas"]["FulfillmentProblem"];
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
  boosterFulfillmentpost_id_start: {
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
        "application/json": components["schemas"]["FulfillmentUpdate"];
      };
    };
    responses: {
      /** @description Successful private order response */
      200: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          "application/json": components["schemas"]["FulfillmentView"];
        };
      };
      /** @description Reload changed state or correct validation issues. */
      409: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          "application/json": components["schemas"]["FulfillmentProblem"];
        };
      };
      /** @description Reload changed state or correct validation issues. */
      422: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          "application/json": components["schemas"]["FulfillmentProblem"];
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
  boosterFulfillmentpost_id_resume: {
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
        "application/json": components["schemas"]["FulfillmentUpdate"];
      };
    };
    responses: {
      /** @description Successful private order response */
      200: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          "application/json": components["schemas"]["FulfillmentView"];
        };
      };
      /** @description Reload changed state or correct validation issues. */
      409: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          "application/json": components["schemas"]["FulfillmentProblem"];
        };
      };
      /** @description Reload changed state or correct validation issues. */
      422: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          "application/json": components["schemas"]["FulfillmentProblem"];
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
  boosterFulfillmentpost_id_hold: {
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
        "application/json": components["schemas"]["FulfillmentUpdate"];
      };
    };
    responses: {
      /** @description Successful private order response */
      200: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          "application/json": components["schemas"]["FulfillmentView"];
        };
      };
      /** @description Reload changed state or correct validation issues. */
      409: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          "application/json": components["schemas"]["FulfillmentProblem"];
        };
      };
      /** @description Reload changed state or correct validation issues. */
      422: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          "application/json": components["schemas"]["FulfillmentProblem"];
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
  boosterFulfillmentpost_id_progress: {
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
        "application/json": components["schemas"]["FulfillmentUpdate"];
      };
    };
    responses: {
      /** @description Successful private order response */
      200: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          "application/json": components["schemas"]["FulfillmentView"];
        };
      };
      /** @description Reload changed state or correct validation issues. */
      409: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          "application/json": components["schemas"]["FulfillmentProblem"];
        };
      };
      /** @description Reload changed state or correct validation issues. */
      422: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          "application/json": components["schemas"]["FulfillmentProblem"];
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
  boosterFulfillmentpost_id_submit_completion: {
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
        "application/json": components["schemas"]["FulfillmentUpdate"];
      };
    };
    responses: {
      /** @description Successful private order response */
      200: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          "application/json": components["schemas"]["FulfillmentView"];
        };
      };
      /** @description Reload changed state or correct validation issues. */
      409: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          "application/json": components["schemas"]["FulfillmentProblem"];
        };
      };
      /** @description Reload changed state or correct validation issues. */
      422: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          "application/json": components["schemas"]["FulfillmentProblem"];
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
  getSchedulingbooster_calendar: {
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
      /** @description Successful private order response */
      200: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          "application/json": components["schemas"]["StaffCalendar"];
        };
      };
      /** @description Reload changed state or correct validation issues. */
      409: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          "application/json": components["schemas"]["FulfillmentProblem"];
        };
      };
      /** @description Reload changed state or correct validation issues. */
      422: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          "application/json": components["schemas"]["FulfillmentProblem"];
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
  postSchedulingbooster_calendar: {
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
        "application/json": components["schemas"]["StaffCalendarProfile"];
      };
    };
    responses: {
      /** @description Successful private order response */
      200: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          "application/json": components["schemas"]["StaffCalendarProfile"];
        };
      };
      /** @description Reload changed state or correct validation issues. */
      409: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          "application/json": components["schemas"]["FulfillmentProblem"];
        };
      };
      /** @description Reload changed state or correct validation issues. */
      422: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          "application/json": components["schemas"]["FulfillmentProblem"];
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
  postSchedulingbooster_calendar_windows: {
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
        "application/json": components["schemas"]["AvailabilityInput"];
      };
    };
    responses: {
      /** @description Successful private order response */
      200: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          "application/json": components["schemas"]["AvailabilityWindow"];
        };
      };
      /** @description Reload changed state or correct validation issues. */
      409: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          "application/json": components["schemas"]["FulfillmentProblem"];
        };
      };
      /** @description Reload changed state or correct validation issues. */
      422: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          "application/json": components["schemas"]["FulfillmentProblem"];
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
  postSchedulingbooster_calendar_windows_window_remove: {
    parameters: {
      query?: never;
      header: {
        "X-CSRF-Token": string;
        Origin: string;
      };
      path: {
        window: string;
      };
      cookie?: never;
    };
    requestBody: {
      content: {
        "application/json": components["schemas"]["FulfillmentSecretRevoke"];
      };
    };
    responses: {
      /** @description Availability removed */
      204: {
        headers: {
          [name: string]: unknown;
        };
        content?: never;
      };
      /** @description Reload changed state or correct validation issues. */
      409: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          "application/json": components["schemas"]["FulfillmentProblem"];
        };
      };
      /** @description Reload changed state or correct validation issues. */
      422: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          "application/json": components["schemas"]["FulfillmentProblem"];
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
  getSchedulingadmin_staff_staff_calendar: {
    parameters: {
      query?: {
        after?: string;
      };
      header?: never;
      path: {
        staff: string;
      };
      cookie?: never;
    };
    requestBody?: never;
    responses: {
      /** @description Successful private order response */
      200: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          "application/json": components["schemas"]["StaffCalendar"];
        };
      };
      /** @description Reload changed state or correct validation issues. */
      409: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          "application/json": components["schemas"]["FulfillmentProblem"];
        };
      };
      /** @description Reload changed state or correct validation issues. */
      422: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          "application/json": components["schemas"]["FulfillmentProblem"];
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
  postSchedulingadmin_staff_staff_calendar: {
    parameters: {
      query?: never;
      header: {
        "X-CSRF-Token": string;
        Origin: string;
      };
      path: {
        staff: string;
      };
      cookie?: never;
    };
    requestBody: {
      content: {
        "application/json": components["schemas"]["StaffCalendarProfile"];
      };
    };
    responses: {
      /** @description Successful private order response */
      200: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          "application/json": components["schemas"]["StaffCalendarProfile"];
        };
      };
      /** @description Reload changed state or correct validation issues. */
      409: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          "application/json": components["schemas"]["FulfillmentProblem"];
        };
      };
      /** @description Reload changed state or correct validation issues. */
      422: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          "application/json": components["schemas"]["FulfillmentProblem"];
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
  postSchedulingadmin_staff_staff_calendar_windows: {
    parameters: {
      query?: never;
      header: {
        "X-CSRF-Token": string;
        Origin: string;
      };
      path: {
        staff: string;
      };
      cookie?: never;
    };
    requestBody: {
      content: {
        "application/json": components["schemas"]["AvailabilityInput"];
      };
    };
    responses: {
      /** @description Successful private order response */
      200: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          "application/json": components["schemas"]["AvailabilityWindow"];
        };
      };
      /** @description Reload changed state or correct validation issues. */
      409: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          "application/json": components["schemas"]["FulfillmentProblem"];
        };
      };
      /** @description Reload changed state or correct validation issues. */
      422: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          "application/json": components["schemas"]["FulfillmentProblem"];
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
  postSchedulingadmin_staff_staff_calendar_windows_window_remove: {
    parameters: {
      query?: never;
      header: {
        "X-CSRF-Token": string;
        Origin: string;
      };
      path: {
        staff: string;
        window: string;
      };
      cookie?: never;
    };
    requestBody: {
      content: {
        "application/json": components["schemas"]["FulfillmentSecretRevoke"];
      };
    };
    responses: {
      /** @description Availability removed */
      204: {
        headers: {
          [name: string]: unknown;
        };
        content?: never;
      };
      /** @description Reload changed state or correct validation issues. */
      409: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          "application/json": components["schemas"]["FulfillmentProblem"];
        };
      };
      /** @description Reload changed state or correct validation issues. */
      422: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          "application/json": components["schemas"]["FulfillmentProblem"];
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
  getSchedulingfulfillment_id_bookings: {
    parameters: {
      query?: {
        after?: string;
      };
      header?: never;
      path: {
        id: string;
      };
      cookie?: never;
    };
    requestBody?: never;
    responses: {
      /** @description Successful private order response */
      200: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          "application/json": components["schemas"]["BookingListing"];
        };
      };
      /** @description Reload changed state or correct validation issues. */
      409: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          "application/json": components["schemas"]["FulfillmentProblem"];
        };
      };
      /** @description Reload changed state or correct validation issues. */
      422: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          "application/json": components["schemas"]["FulfillmentProblem"];
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
  postSchedulingfulfillment_id_bookings: {
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
        "application/json": components["schemas"]["BookingInput"];
      };
    };
    responses: {
      /** @description Successful private order response */
      200: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          "application/json": components["schemas"]["BookingView"];
        };
      };
      /** @description Reload changed state or correct validation issues. */
      409: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          "application/json": components["schemas"]["FulfillmentProblem"];
        };
      };
      /** @description Reload changed state or correct validation issues. */
      422: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          "application/json": components["schemas"]["FulfillmentProblem"];
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
  getSchedulingfulfillment_id_slots: {
    parameters: {
      query?: {
        after?: string;
        week?: number;
      };
      header?: never;
      path: {
        id: string;
      };
      cookie?: never;
    };
    requestBody?: never;
    responses: {
      /** @description Successful private order response */
      200: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          "application/json": components["schemas"]["BookingSlots"];
        };
      };
      /** @description Reload changed state or correct validation issues. */
      409: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          "application/json": components["schemas"]["FulfillmentProblem"];
        };
      };
      /** @description Reload changed state or correct validation issues. */
      422: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          "application/json": components["schemas"]["FulfillmentProblem"];
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
  postSchedulingfulfillment_id_bookings_booking_cancel: {
    parameters: {
      query?: never;
      header: {
        "X-CSRF-Token": string;
        Origin: string;
      };
      path: {
        id: string;
        booking: string;
      };
      cookie?: never;
    };
    requestBody: {
      content: {
        "application/json": components["schemas"]["BookingAction"];
      };
    };
    responses: {
      /** @description Successful private order response */
      200: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          "application/json": components["schemas"]["BookingView"];
        };
      };
      /** @description Reload changed state or correct validation issues. */
      409: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          "application/json": components["schemas"]["FulfillmentProblem"];
        };
      };
      /** @description Reload changed state or correct validation issues. */
      422: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          "application/json": components["schemas"]["FulfillmentProblem"];
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
  getSchedulingadmin_fulfillment_id_bookings: {
    parameters: {
      query?: {
        after?: string;
      };
      header?: never;
      path: {
        id: string;
      };
      cookie?: never;
    };
    requestBody?: never;
    responses: {
      /** @description Successful private order response */
      200: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          "application/json": components["schemas"]["BookingListing"];
        };
      };
      /** @description Reload changed state or correct validation issues. */
      409: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          "application/json": components["schemas"]["FulfillmentProblem"];
        };
      };
      /** @description Reload changed state or correct validation issues. */
      422: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          "application/json": components["schemas"]["FulfillmentProblem"];
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
  getSchedulingadmin_fulfillment_id_slots: {
    parameters: {
      query?: {
        after?: string;
        week?: number;
      };
      header?: never;
      path: {
        id: string;
      };
      cookie?: never;
    };
    requestBody?: never;
    responses: {
      /** @description Successful private order response */
      200: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          "application/json": components["schemas"]["BookingSlots"];
        };
      };
      /** @description Reload changed state or correct validation issues. */
      409: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          "application/json": components["schemas"]["FulfillmentProblem"];
        };
      };
      /** @description Reload changed state or correct validation issues. */
      422: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          "application/json": components["schemas"]["FulfillmentProblem"];
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
  postSchedulingadmin_fulfillment_id_bookings_booking_cancel: {
    parameters: {
      query?: never;
      header: {
        "X-CSRF-Token": string;
        Origin: string;
      };
      path: {
        id: string;
        booking: string;
      };
      cookie?: never;
    };
    requestBody: {
      content: {
        "application/json": components["schemas"]["BookingAction"];
      };
    };
    responses: {
      /** @description Successful private order response */
      200: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          "application/json": components["schemas"]["BookingView"];
        };
      };
      /** @description Reload changed state or correct validation issues. */
      409: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          "application/json": components["schemas"]["FulfillmentProblem"];
        };
      };
      /** @description Reload changed state or correct validation issues. */
      422: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          "application/json": components["schemas"]["FulfillmentProblem"];
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
  postSchedulingadmin_fulfillment_id_bookings_booking_confirm: {
    parameters: {
      query?: never;
      header: {
        "X-CSRF-Token": string;
        Origin: string;
      };
      path: {
        id: string;
        booking: string;
      };
      cookie?: never;
    };
    requestBody: {
      content: {
        "application/json": components["schemas"]["BookingAction"];
      };
    };
    responses: {
      /** @description Successful private order response */
      200: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          "application/json": components["schemas"]["BookingView"];
        };
      };
      /** @description Reload changed state or correct validation issues. */
      409: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          "application/json": components["schemas"]["FulfillmentProblem"];
        };
      };
      /** @description Reload changed state or correct validation issues. */
      422: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          "application/json": components["schemas"]["FulfillmentProblem"];
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
  postSchedulingadmin_fulfillment_id_bookings_booking_attended: {
    parameters: {
      query?: never;
      header: {
        "X-CSRF-Token": string;
        Origin: string;
      };
      path: {
        id: string;
        booking: string;
      };
      cookie?: never;
    };
    requestBody: {
      content: {
        "application/json": components["schemas"]["BookingAction"];
      };
    };
    responses: {
      /** @description Successful private order response */
      200: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          "application/json": components["schemas"]["BookingView"];
        };
      };
      /** @description Reload changed state or correct validation issues. */
      409: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          "application/json": components["schemas"]["FulfillmentProblem"];
        };
      };
      /** @description Reload changed state or correct validation issues. */
      422: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          "application/json": components["schemas"]["FulfillmentProblem"];
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
  postSchedulingadmin_fulfillment_id_bookings_booking_no_show: {
    parameters: {
      query?: never;
      header: {
        "X-CSRF-Token": string;
        Origin: string;
      };
      path: {
        id: string;
        booking: string;
      };
      cookie?: never;
    };
    requestBody: {
      content: {
        "application/json": components["schemas"]["BookingAction"];
      };
    };
    responses: {
      /** @description Successful private order response */
      200: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          "application/json": components["schemas"]["BookingView"];
        };
      };
      /** @description Reload changed state or correct validation issues. */
      409: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          "application/json": components["schemas"]["FulfillmentProblem"];
        };
      };
      /** @description Reload changed state or correct validation issues. */
      422: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          "application/json": components["schemas"]["FulfillmentProblem"];
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
  getSchedulingbooster_fulfillment_id_bookings: {
    parameters: {
      query?: {
        after?: string;
      };
      header?: never;
      path: {
        id: string;
      };
      cookie?: never;
    };
    requestBody?: never;
    responses: {
      /** @description Successful private order response */
      200: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          "application/json": components["schemas"]["BookingListing"];
        };
      };
      /** @description Reload changed state or correct validation issues. */
      409: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          "application/json": components["schemas"]["FulfillmentProblem"];
        };
      };
      /** @description Reload changed state or correct validation issues. */
      422: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          "application/json": components["schemas"]["FulfillmentProblem"];
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
  getSchedulingbooster_fulfillment_id_slots: {
    parameters: {
      query?: {
        after?: string;
        week?: number;
      };
      header?: never;
      path: {
        id: string;
      };
      cookie?: never;
    };
    requestBody?: never;
    responses: {
      /** @description Successful private order response */
      200: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          "application/json": components["schemas"]["BookingSlots"];
        };
      };
      /** @description Reload changed state or correct validation issues. */
      409: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          "application/json": components["schemas"]["FulfillmentProblem"];
        };
      };
      /** @description Reload changed state or correct validation issues. */
      422: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          "application/json": components["schemas"]["FulfillmentProblem"];
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
  postSchedulingbooster_fulfillment_id_bookings_booking_cancel: {
    parameters: {
      query?: never;
      header: {
        "X-CSRF-Token": string;
        Origin: string;
      };
      path: {
        id: string;
        booking: string;
      };
      cookie?: never;
    };
    requestBody: {
      content: {
        "application/json": components["schemas"]["BookingAction"];
      };
    };
    responses: {
      /** @description Successful private order response */
      200: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          "application/json": components["schemas"]["BookingView"];
        };
      };
      /** @description Reload changed state or correct validation issues. */
      409: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          "application/json": components["schemas"]["FulfillmentProblem"];
        };
      };
      /** @description Reload changed state or correct validation issues. */
      422: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          "application/json": components["schemas"]["FulfillmentProblem"];
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
  postSchedulingbooster_fulfillment_id_bookings_booking_confirm: {
    parameters: {
      query?: never;
      header: {
        "X-CSRF-Token": string;
        Origin: string;
      };
      path: {
        id: string;
        booking: string;
      };
      cookie?: never;
    };
    requestBody: {
      content: {
        "application/json": components["schemas"]["BookingAction"];
      };
    };
    responses: {
      /** @description Successful private order response */
      200: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          "application/json": components["schemas"]["BookingView"];
        };
      };
      /** @description Reload changed state or correct validation issues. */
      409: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          "application/json": components["schemas"]["FulfillmentProblem"];
        };
      };
      /** @description Reload changed state or correct validation issues. */
      422: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          "application/json": components["schemas"]["FulfillmentProblem"];
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
  postSchedulingbooster_fulfillment_id_bookings_booking_attended: {
    parameters: {
      query?: never;
      header: {
        "X-CSRF-Token": string;
        Origin: string;
      };
      path: {
        id: string;
        booking: string;
      };
      cookie?: never;
    };
    requestBody: {
      content: {
        "application/json": components["schemas"]["BookingAction"];
      };
    };
    responses: {
      /** @description Successful private order response */
      200: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          "application/json": components["schemas"]["BookingView"];
        };
      };
      /** @description Reload changed state or correct validation issues. */
      409: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          "application/json": components["schemas"]["FulfillmentProblem"];
        };
      };
      /** @description Reload changed state or correct validation issues. */
      422: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          "application/json": components["schemas"]["FulfillmentProblem"];
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
  postSchedulingbooster_fulfillment_id_bookings_booking_no_show: {
    parameters: {
      query?: never;
      header: {
        "X-CSRF-Token": string;
        Origin: string;
      };
      path: {
        id: string;
        booking: string;
      };
      cookie?: never;
    };
    requestBody: {
      content: {
        "application/json": components["schemas"]["BookingAction"];
      };
    };
    responses: {
      /** @description Successful private order response */
      200: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          "application/json": components["schemas"]["BookingView"];
        };
      };
      /** @description Reload changed state or correct validation issues. */
      409: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          "application/json": components["schemas"]["FulfillmentProblem"];
        };
      };
      /** @description Reload changed state or correct validation issues. */
      422: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          "application/json": components["schemas"]["FulfillmentProblem"];
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
  openFulfillmentCoordination: {
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
        "application/json": components["schemas"]["FulfillmentSecretRevoke"];
      };
    };
    responses: {
      /** @description Successful private order response */
      200: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          "application/json": components["schemas"]["Conversation"];
        };
      };
      /** @description Reload changed state or correct validation issues. */
      409: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          "application/json": components["schemas"]["ConversationProblem"];
        };
      };
      /** @description Reload changed state or correct validation issues. */
      422: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          "application/json": components["schemas"]["ConversationProblem"];
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
  changeBoosterConversationSharing: {
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
        "application/json": components["schemas"]["ConversationChange"];
      };
    };
    responses: {
      /** @description Successful private response */
      200: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          "application/json": components["schemas"]["Conversation"];
        };
      };
      /** @description Correct validation or reload current state. */
      409: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          "application/json": components["schemas"]["ConversationProblem"];
        };
      };
      /** @description Correct validation or reload current state. */
      422: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          "application/json": components["schemas"]["ConversationProblem"];
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
  adminDeliveryForecastPreview: {
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
        "application/json": Record<string, never>;
      };
    };
    responses: {
      /** @description Successful private order response */
      200: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          "application/json": components["schemas"]["DeliveryForecastPreview"];
        };
      };
      /** @description Reload changed state or correct validation issues. */
      409: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          "application/json": components["schemas"]["FulfillmentProblem"];
        };
      };
      /** @description Reload changed state or correct validation issues. */
      422: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          "application/json": components["schemas"]["FulfillmentProblem"];
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
  adminDeliveryForecastApply: {
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
        "application/json": components["schemas"]["DeliveryForecastApply"];
      };
    };
    responses: {
      /** @description Successful private order response */
      200: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          "application/json": components["schemas"]["FulfillmentView"];
        };
      };
      /** @description Reload changed state or correct validation issues. */
      409: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          "application/json": components["schemas"]["FulfillmentProblem"];
        };
      };
      /** @description Reload changed state or correct validation issues. */
      422: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          "application/json": components["schemas"]["FulfillmentProblem"];
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
