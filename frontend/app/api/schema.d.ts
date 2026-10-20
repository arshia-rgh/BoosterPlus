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
    /** Requires one recent authenticator or email verification after completed sign-in. Creates immutable revision, supersedes prior quote, and requires new customer acceptance. */
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
    /** Requires a recent staff verification factor after completed sign-in; restarts only failed activity jobs with audit. Running/completed jobs cannot be restarted. */
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
    /** getStaffMediaDirectory */
    get: operations["getStaffMediaDirectory"];
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
    /** Audited staff maintenance for authorized unbound uploads; one recent verification factor required. Bound evidence cannot be removed. */
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
    /** Audited staff maintenance for authorized unbound uploads; one recent verification factor required. Bound evidence cannot be removed. */
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
    /** Explicitly share a separate paid-order coordination thread after a recent staff verification factor */
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
    /** Pause or resume assigned booster sharing with a recent staff verification factor and expected thread version */
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
    /** Apply unchanged reviewed range with one recent authenticator or email verification after completed sign-in */
    post: operations["adminDeliveryForecastApply"];
    delete?: never;
    options?: never;
    head?: never;
    patch?: never;
    trace?: never;
  };
  "/api/v1/submissions": {
    parameters: {
      query?: never;
      header?: never;
      path?: never;
      cookie?: never;
    };
    /** Private account intake with live ownership or administrator authorization; no commercial acceptance or payout */
    get: operations["sellerSubmissionget"];
    put?: never;
    /** Private account intake with live ownership or administrator authorization; no commercial acceptance or payout */
    post: operations["sellerSubmissionpost"];
    delete?: never;
    options?: never;
    head?: never;
    patch?: never;
    trace?: never;
  };
  "/api/v1/submissions/{id}": {
    parameters: {
      query?: never;
      header?: never;
      path?: never;
      cookie?: never;
    };
    /** Private account intake with live ownership or administrator authorization; no commercial acceptance or payout */
    get: operations["sellerSubmissionget_id"];
    put?: never;
    post?: never;
    delete?: never;
    options?: never;
    head?: never;
    patch?: never;
    trace?: never;
  };
  "/api/v1/submissions/{id}/history": {
    parameters: {
      query?: never;
      header?: never;
      path?: never;
      cookie?: never;
    };
    /** Private account intake with live ownership or administrator authorization; no commercial acceptance or payout */
    get: operations["sellerSubmissionget_id_history"];
    put?: never;
    post?: never;
    delete?: never;
    options?: never;
    head?: never;
    patch?: never;
    trace?: never;
  };
  "/api/v1/submissions/{id}/submit": {
    parameters: {
      query?: never;
      header?: never;
      path?: never;
      cookie?: never;
    };
    get?: never;
    put?: never;
    /** Private account intake with live ownership or administrator authorization; no commercial acceptance or payout */
    post: operations["sellerSubmissionpost_id_submit"];
    delete?: never;
    options?: never;
    head?: never;
    patch?: never;
    trace?: never;
  };
  "/api/v1/submissions/{id}/withdraw": {
    parameters: {
      query?: never;
      header?: never;
      path?: never;
      cookie?: never;
    };
    get?: never;
    put?: never;
    /** Private account intake with live ownership or administrator authorization; no commercial acceptance or payout */
    post: operations["sellerSubmissionpost_id_withdraw"];
    delete?: never;
    options?: never;
    head?: never;
    patch?: never;
    trace?: never;
  };
  "/api/v1/submissions/{id}/edit": {
    parameters: {
      query?: never;
      header?: never;
      path?: never;
      cookie?: never;
    };
    get?: never;
    put?: never;
    /** Private account intake with live ownership or administrator authorization; no commercial acceptance or payout */
    post: operations["sellerSubmissionpost_id_edit"];
    delete?: never;
    options?: never;
    head?: never;
    patch?: never;
    trace?: never;
  };
  "/api/v1/admin/submissions": {
    parameters: {
      query?: never;
      header?: never;
      path?: never;
      cookie?: never;
    };
    /** Private account intake with live ownership or administrator authorization; no commercial acceptance or payout */
    get: operations["adminSubmissionget"];
    put?: never;
    post?: never;
    delete?: never;
    options?: never;
    head?: never;
    patch?: never;
    trace?: never;
  };
  "/api/v1/admin/submissions/{id}": {
    parameters: {
      query?: never;
      header?: never;
      path?: never;
      cookie?: never;
    };
    /** Private account intake with live ownership or administrator authorization; no commercial acceptance or payout */
    get: operations["adminSubmissionget_id"];
    put?: never;
    post?: never;
    delete?: never;
    options?: never;
    head?: never;
    patch?: never;
    trace?: never;
  };
  "/api/v1/admin/submissions/{id}/history": {
    parameters: {
      query?: never;
      header?: never;
      path?: never;
      cookie?: never;
    };
    /** Private account intake with live ownership or administrator authorization; no commercial acceptance or payout */
    get: operations["adminSubmissionget_id_history"];
    put?: never;
    post?: never;
    delete?: never;
    options?: never;
    head?: never;
    patch?: never;
    trace?: never;
  };
  "/api/v1/admin/submissions/{id}/clarify": {
    parameters: {
      query?: never;
      header?: never;
      path?: never;
      cookie?: never;
    };
    get?: never;
    put?: never;
    /** Private account intake with live ownership or administrator authorization; no commercial acceptance or payout */
    post: operations["adminSubmissionpost_id_clarify"];
    delete?: never;
    options?: never;
    head?: never;
    patch?: never;
    trace?: never;
  };
  "/api/v1/admin/submissions/{id}/reject": {
    parameters: {
      query?: never;
      header?: never;
      path?: never;
      cookie?: never;
    };
    get?: never;
    put?: never;
    /** Private account intake with live ownership or administrator authorization; no commercial acceptance or payout */
    post: operations["adminSubmissionpost_id_reject"];
    delete?: never;
    options?: never;
    head?: never;
    patch?: never;
    trace?: never;
  };
  "/api/v1/admin/submissions/{id}/approve_review": {
    parameters: {
      query?: never;
      header?: never;
      path?: never;
      cookie?: never;
    };
    get?: never;
    put?: never;
    /** Private account intake with live ownership or administrator authorization; no commercial acceptance or payout */
    post: operations["adminSubmissionpost_id_approve_review"];
    delete?: never;
    options?: never;
    head?: never;
    patch?: never;
    trace?: never;
  };
  "/api/v1/orders/{id}/review": {
    parameters: {
      query?: never;
      header?: never;
      path?: never;
      cookie?: never;
    };
    /** Verified purchase feedback with explicit publication policy and private moderation history */
    get: operations["reviewgetApiV1OrdersIdReview"];
    put?: never;
    /** Verified purchase feedback with explicit publication policy and private moderation history */
    post: operations["reviewpostApiV1OrdersIdReview"];
    delete?: never;
    options?: never;
    head?: never;
    patch?: never;
    trace?: never;
  };
  "/api/v1/orders/{id}/review/withdraw": {
    parameters: {
      query?: never;
      header?: never;
      path?: never;
      cookie?: never;
    };
    get?: never;
    put?: never;
    /** Verified purchase feedback with explicit publication policy and private moderation history */
    post: operations["reviewpostApiV1OrdersIdReviewWithdraw"];
    delete?: never;
    options?: never;
    head?: never;
    patch?: never;
    trace?: never;
  };
  "/api/v1/reviews": {
    parameters: {
      query?: never;
      header?: never;
      path?: never;
      cookie?: never;
    };
    /** Verified purchase feedback with explicit publication policy and private moderation history */
    get: operations["reviewgetApiV1Reviews"];
    put?: never;
    post?: never;
    delete?: never;
    options?: never;
    head?: never;
    patch?: never;
    trace?: never;
  };
  "/api/v1/reviews/{id}": {
    parameters: {
      query?: never;
      header?: never;
      path?: never;
      cookie?: never;
    };
    /** Verified purchase feedback with explicit publication policy and private moderation history */
    get: operations["reviewgetApiV1ReviewsId"];
    put?: never;
    post?: never;
    delete?: never;
    options?: never;
    head?: never;
    patch?: never;
    trace?: never;
  };
  "/api/v1/reviews/{id}/history": {
    parameters: {
      query?: never;
      header?: never;
      path?: never;
      cookie?: never;
    };
    /** Verified purchase feedback with explicit publication policy and private moderation history */
    get: operations["reviewgetApiV1ReviewsIdHistory"];
    put?: never;
    post?: never;
    delete?: never;
    options?: never;
    head?: never;
    patch?: never;
    trace?: never;
  };
  "/api/v1/admin/reviews": {
    parameters: {
      query?: never;
      header?: never;
      path?: never;
      cookie?: never;
    };
    /** Verified purchase feedback with explicit publication policy and private moderation history */
    get: operations["reviewgetApiV1AdminReviews"];
    put?: never;
    post?: never;
    delete?: never;
    options?: never;
    head?: never;
    patch?: never;
    trace?: never;
  };
  "/api/v1/admin/reviews/{id}": {
    parameters: {
      query?: never;
      header?: never;
      path?: never;
      cookie?: never;
    };
    /** Verified purchase feedback with explicit publication policy and private moderation history */
    get: operations["reviewgetApiV1AdminReviewsId"];
    put?: never;
    post?: never;
    delete?: never;
    options?: never;
    head?: never;
    patch?: never;
    trace?: never;
  };
  "/api/v1/admin/reviews/{id}/history": {
    parameters: {
      query?: never;
      header?: never;
      path?: never;
      cookie?: never;
    };
    /** Verified purchase feedback with explicit publication policy and private moderation history */
    get: operations["reviewgetApiV1AdminReviewsIdHistory"];
    put?: never;
    post?: never;
    delete?: never;
    options?: never;
    head?: never;
    patch?: never;
    trace?: never;
  };
  "/api/v1/admin/reviews/{id}/publish": {
    parameters: {
      query?: never;
      header?: never;
      path?: never;
      cookie?: never;
    };
    get?: never;
    put?: never;
    /** Verified purchase feedback with explicit publication policy and private moderation history */
    post: operations["reviewpostApiV1AdminReviewsIdPublish"];
    delete?: never;
    options?: never;
    head?: never;
    patch?: never;
    trace?: never;
  };
  "/api/v1/admin/reviews/{id}/hide": {
    parameters: {
      query?: never;
      header?: never;
      path?: never;
      cookie?: never;
    };
    get?: never;
    put?: never;
    /** Verified purchase feedback with explicit publication policy and private moderation history */
    post: operations["reviewpostApiV1AdminReviewsIdHide"];
    delete?: never;
    options?: never;
    head?: never;
    patch?: never;
    trace?: never;
  };
  "/api/v1/admin/reviews/{id}/reject": {
    parameters: {
      query?: never;
      header?: never;
      path?: never;
      cookie?: never;
    };
    get?: never;
    put?: never;
    /** Verified purchase feedback with explicit publication policy and private moderation history */
    post: operations["reviewpostApiV1AdminReviewsIdReject"];
    delete?: never;
    options?: never;
    head?: never;
    patch?: never;
    trace?: never;
  };
  "/api/v1/admin/reviews/{id}/respond": {
    parameters: {
      query?: never;
      header?: never;
      path?: never;
      cookie?: never;
    };
    get?: never;
    put?: never;
    /** Verified purchase feedback with explicit publication policy and private moderation history */
    post: operations["reviewpostApiV1AdminReviewsIdRespond"];
    delete?: never;
    options?: never;
    head?: never;
    patch?: never;
    trace?: never;
  };
  "/api/v1/public/reviews/{slug}": {
    parameters: {
      query?: never;
      header?: never;
      path?: never;
      cookie?: never;
    };
    /** Verified purchase feedback with explicit publication policy and private moderation history */
    get: operations["reviewgetApiV1ReviewsGamesSlug"];
    put?: never;
    post?: never;
    delete?: never;
    options?: never;
    head?: never;
    patch?: never;
    trace?: never;
  };
  "/api/v1/admin/operations": {
    parameters: {
      query?: never;
      header?: never;
      path?: never;
      cookie?: never;
    };
    /** Inspect operational metadata or request an audited retry under current staff authority */
    get: operations["getAdminOperations"];
    put?: never;
    post?: never;
    delete?: never;
    options?: never;
    head?: never;
    patch?: never;
    trace?: never;
  };
  "/api/v1/admin/jobs": {
    parameters: {
      query?: never;
      header?: never;
      path?: never;
      cookie?: never;
    };
    /** Inspect operational metadata or request an audited retry under current staff authority */
    get: operations["listAdminJobs"];
    put?: never;
    post?: never;
    delete?: never;
    options?: never;
    head?: never;
    patch?: never;
    trace?: never;
  };
  "/api/v1/admin/jobs/{id}/retry": {
    parameters: {
      query?: never;
      header?: never;
      path?: never;
      cookie?: never;
    };
    get?: never;
    put?: never;
    /** Inspect operational metadata or request an audited retry under current staff authority */
    post: operations["retryAdminJob"];
    delete?: never;
    options?: never;
    head?: never;
    patch?: never;
    trace?: never;
  };
  "/api/v1/availability": {
    parameters: {
      query?: never;
      header?: never;
      path?: never;
      cookie?: never;
    };
    /** Manage explicit package availability consent; link POSTs require Origin/CSRF but no sign-in */
    get: operations["listAvailabilitySubscriptions"];
    put?: never;
    /** Manage explicit package availability consent; link POSTs require Origin/CSRF but no sign-in */
    post: operations["subscribeAvailability"];
    delete?: never;
    options?: never;
    head?: never;
    patch?: never;
    trace?: never;
  };
  "/api/v1/availability/{id}": {
    parameters: {
      query?: never;
      header?: never;
      path?: never;
      cookie?: never;
    };
    get?: never;
    put?: never;
    /** Manage explicit package availability consent; link POSTs require Origin/CSRF but no sign-in */
    post: operations["changeAvailabilitySubscription"];
    delete?: never;
    options?: never;
    head?: never;
    patch?: never;
    trace?: never;
  };
  "/api/v1/availability-link/inspect": {
    parameters: {
      query?: never;
      header?: never;
      path?: never;
      cookie?: never;
    };
    get?: never;
    put?: never;
    /** Manage explicit package availability consent; link POSTs require Origin/CSRF but no sign-in */
    post: operations["inspectAvailabilityLink"];
    delete?: never;
    options?: never;
    head?: never;
    patch?: never;
    trace?: never;
  };
  "/api/v1/availability-link/confirm": {
    parameters: {
      query?: never;
      header?: never;
      path?: never;
      cookie?: never;
    };
    get?: never;
    put?: never;
    /** Manage explicit package availability consent; link POSTs require Origin/CSRF but no sign-in */
    post: operations["confirmAvailabilityUnsubscribe"];
    delete?: never;
    options?: never;
    head?: never;
    patch?: never;
    trace?: never;
  };
  "/api/v1/admin/reports/preview": {
    parameters: {
      query?: never;
      header?: never;
      path?: never;
      cookie?: never;
    };
    get?: never;
    put?: never;
    /** Preview bounded operational metadata or download the exact reviewed page with a recent staff verification factor and a committed audit */
    post: operations["previewOperationalReport"];
    delete?: never;
    options?: never;
    head?: never;
    patch?: never;
    trace?: never;
  };
  "/api/v1/admin/reports/export": {
    parameters: {
      query?: never;
      header?: never;
      path?: never;
      cookie?: never;
    };
    get?: never;
    put?: never;
    /** Preview bounded operational metadata or download the exact reviewed page with a recent staff verification factor and a committed audit */
    post: operations["exportOperationalReport"];
    delete?: never;
    options?: never;
    head?: never;
    patch?: never;
    trace?: never;
  };
  "/api/v1/orders/{id}/payments": {
    parameters: {
      query?: never;
      header?: never;
      path?: never;
      cookie?: never;
    };
    /** Direct crypto payments with immutable policy acceptance and verified provider evidence */
    get: operations["customerPaymentHistory"];
    put?: never;
    post?: never;
    delete?: never;
    options?: never;
    head?: never;
    patch?: never;
    trace?: never;
  };
  "/api/v1/admin/orders/{id}/payments": {
    parameters: {
      query?: never;
      header?: never;
      path?: never;
      cookie?: never;
    };
    /** Direct crypto payments with immutable policy acceptance and verified provider evidence */
    get: operations["adminPaymentHistory"];
    put?: never;
    post?: never;
    delete?: never;
    options?: never;
    head?: never;
    patch?: never;
    trace?: never;
  };
  "/api/v1/orders/{id}/checkout": {
    parameters: {
      query?: never;
      header?: never;
      path?: never;
      cookie?: never;
    };
    get?: never;
    put?: never;
    /** Direct crypto payments with immutable policy acceptance and verified provider evidence */
    post: operations["startCheckout"];
    delete?: never;
    options?: never;
    head?: never;
    patch?: never;
    trace?: never;
  };
  "/api/v1/admin/finance": {
    parameters: {
      query?: never;
      header?: never;
      path?: never;
      cookie?: never;
    };
    /** Direct crypto payments with immutable policy acceptance and verified provider evidence */
    get: operations["financeQueue"];
    put?: never;
    post?: never;
    delete?: never;
    options?: never;
    head?: never;
    patch?: never;
    trace?: never;
  };
  "/api/v1/admin/finance/policy": {
    parameters: {
      query?: never;
      header?: never;
      path?: never;
      cookie?: never;
    };
    /** Direct crypto payments with immutable policy acceptance and verified provider evidence */
    get: operations["paymentSettings"];
    put?: never;
    /** Direct crypto payments with immutable policy acceptance and verified provider evidence */
    post: operations["updatePaymentPolicy"];
    delete?: never;
    options?: never;
    head?: never;
    patch?: never;
    trace?: never;
  };
  "/api/v1/admin/finance/reconcile": {
    parameters: {
      query?: never;
      header?: never;
      path?: never;
      cookie?: never;
    };
    get?: never;
    put?: never;
    /** Direct crypto payments with immutable policy acceptance and verified provider evidence */
    post: operations["requestPaymentReconciliation"];
    delete?: never;
    options?: never;
    head?: never;
    patch?: never;
    trace?: never;
  };
  "/api/v1/webhooks/payments/nowpayments": {
    parameters: {
      query?: never;
      header?: never;
      path?: never;
      cookie?: never;
    };
    get?: never;
    put?: never;
    /** HMAC-authenticated durable callback inbox; provider GET decides settlement */
    post: operations["receivePaymentSignal"];
    delete?: never;
    options?: never;
    head?: never;
    patch?: never;
    trace?: never;
  };
  "/api/v1/orders/{id}/cases": {
    parameters: {
      query?: never;
      header?: never;
      path?: never;
      cookie?: never;
    };
    /** Read private order cases */
    get: operations["getApiV1OrdersIdCases"];
    put?: never;
    /** Open a private service case */
    post: operations["postApiV1OrdersIdCases"];
    delete?: never;
    options?: never;
    head?: never;
    patch?: never;
    trace?: never;
  };
  "/api/v1/cases/{id}": {
    parameters: {
      query?: never;
      header?: never;
      path?: never;
      cookie?: never;
    };
    /** Read a private case and event page */
    get: operations["getApiV1CasesId"];
    put?: never;
    post?: never;
    delete?: never;
    options?: never;
    head?: never;
    patch?: never;
    trace?: never;
  };
  "/api/v1/cases/{id}/{action}": {
    parameters: {
      query?: never;
      header?: never;
      path?: never;
      cookie?: never;
    };
    get?: never;
    put?: never;
    /** Reply, decide, appeal or close a case with authority and version checks */
    post: operations["postApiV1CasesIdAction"];
    delete?: never;
    options?: never;
    head?: never;
    patch?: never;
    trace?: never;
  };
  "/api/v1/orders/{id}/refunds": {
    parameters: {
      query?: never;
      header?: never;
      path?: never;
      cookie?: never;
    };
    /** Read private refund history */
    get: operations["getApiV1OrdersIdRefunds"];
    put?: never;
    post?: never;
    delete?: never;
    options?: never;
    head?: never;
    patch?: never;
    trace?: never;
  };
  "/api/v1/admin/orders/{id}/cases": {
    parameters: {
      query?: never;
      header?: never;
      path?: never;
      cookie?: never;
    };
    /** Read private order cases */
    get: operations["getApiV1AdminOrdersIdCases"];
    put?: never;
    /** Open a private service case */
    post: operations["postApiV1AdminOrdersIdCases"];
    delete?: never;
    options?: never;
    head?: never;
    patch?: never;
    trace?: never;
  };
  "/api/v1/admin/cases/{id}": {
    parameters: {
      query?: never;
      header?: never;
      path?: never;
      cookie?: never;
    };
    /** Read a private case and event page */
    get: operations["getApiV1AdminCasesId"];
    put?: never;
    post?: never;
    delete?: never;
    options?: never;
    head?: never;
    patch?: never;
    trace?: never;
  };
  "/api/v1/admin/cases/{id}/{action}": {
    parameters: {
      query?: never;
      header?: never;
      path?: never;
      cookie?: never;
    };
    get?: never;
    put?: never;
    /** Reply, decide, appeal or close a case with authority and version checks */
    post: operations["postApiV1AdminCasesIdAction"];
    delete?: never;
    options?: never;
    head?: never;
    patch?: never;
    trace?: never;
  };
  "/api/v1/admin/orders/{id}/refunds": {
    parameters: {
      query?: never;
      header?: never;
      path?: never;
      cookie?: never;
    };
    /** Read private refund history */
    get: operations["getApiV1AdminOrdersIdRefunds"];
    put?: never;
    post?: never;
    delete?: never;
    options?: never;
    head?: never;
    patch?: never;
    trace?: never;
  };
  "/api/v1/admin/cases": {
    parameters: {
      query?: never;
      header?: never;
      path?: never;
      cookie?: never;
    };
    /** Read open service case queue */
    get: operations["getApiV1AdminCases"];
    put?: never;
    post?: never;
    delete?: never;
    options?: never;
    head?: never;
    patch?: never;
    trace?: never;
  };
  "/api/v1/admin/cases/{id}/refunds": {
    parameters: {
      query?: never;
      header?: never;
      path?: never;
      cookie?: never;
    };
    get?: never;
    put?: never;
    /** Propose a refund reserved against received funds */
    post: operations["postApiV1AdminCasesIdRefunds"];
    delete?: never;
    options?: never;
    head?: never;
    patch?: never;
    trace?: never;
  };
  "/api/v1/refunds/{id}/recipient": {
    parameters: {
      query?: never;
      header?: never;
      path?: never;
      cookie?: never;
    };
    get?: never;
    put?: never;
    /** Confirm a refund destination after recent customer sign-in */
    post: operations["postApiV1RefundsIdRecipient"];
    delete?: never;
    options?: never;
    head?: never;
    patch?: never;
    trace?: never;
  };
  "/api/v1/admin/refunds/{id}/approve": {
    parameters: {
      query?: never;
      header?: never;
      path?: never;
      cookie?: never;
    };
    get?: never;
    put?: never;
    /** Owner authorization with a recent verification factor after completed sign-in */
    post: operations["postApiV1AdminRefundsIdApprove"];
    delete?: never;
    options?: never;
    head?: never;
    patch?: never;
    trace?: never;
  };
  "/api/v1/admin/refunds/{id}/cancel": {
    parameters: {
      query?: never;
      header?: never;
      path?: never;
      cookie?: never;
    };
    get?: never;
    put?: never;
    /** Owner authorization with a recent verification factor after completed sign-in */
    post: operations["postApiV1AdminRefundsIdCancel"];
    delete?: never;
    options?: never;
    head?: never;
    patch?: never;
    trace?: never;
  };
  "/api/v1/admin/refunds/{id}/verify": {
    parameters: {
      query?: never;
      header?: never;
      path?: never;
      cookie?: never;
    };
    get?: never;
    put?: never;
    /** Authorize an independently verified outgoing attempt with an ephemeral provider code */
    post: operations["postApiV1AdminRefundsIdVerify"];
    delete?: never;
    options?: never;
    head?: never;
    patch?: never;
    trace?: never;
  };
  "/api/v1/admin/finance/outgoing/reconcile": {
    parameters: {
      query?: never;
      header?: never;
      path?: never;
      cookie?: never;
    };
    get?: never;
    put?: never;
    /** Request authoritative outgoing evidence */
    post: operations["postApiV1AdminFinanceOutgoingReconcile"];
    delete?: never;
    options?: never;
    head?: never;
    patch?: never;
    trace?: never;
  };
  "/api/v1/admin/finance/outgoing": {
    parameters: {
      query?: never;
      header?: never;
      path?: never;
      cookie?: never;
    };
    /** Read outgoing exceptions without private provider payloads */
    get: operations["getOutgoingExceptions"];
    put?: never;
    post?: never;
    delete?: never;
    options?: never;
    head?: never;
    patch?: never;
    trace?: never;
  };
  "/api/v1/accounts": {
    parameters: {
      query?: never;
      header?: never;
      path?: never;
      cookie?: never;
    };
    /** Reviewed account resale; exact accepted terms and live authorization boundaries */
    get: operations["getResaleApiV1Accounts"];
    put?: never;
    post?: never;
    delete?: never;
    options?: never;
    head?: never;
    patch?: never;
    trace?: never;
  };
  "/api/v1/accounts/{id}": {
    parameters: {
      query?: never;
      header?: never;
      path?: never;
      cookie?: never;
    };
    /** Reviewed account resale; exact accepted terms and live authorization boundaries */
    get: operations["getResaleApiV1AccountsId"];
    put?: never;
    post?: never;
    delete?: never;
    options?: never;
    head?: never;
    patch?: never;
    trace?: never;
  };
  "/api/v1/accounts/{id}/reserve": {
    parameters: {
      query?: never;
      header?: never;
      path?: never;
      cookie?: never;
    };
    get?: never;
    put?: never;
    /** Reviewed account resale; exact accepted terms and live authorization boundaries */
    post: operations["postResaleApiV1AccountsIdReserve"];
    delete?: never;
    options?: never;
    head?: never;
    patch?: never;
    trace?: never;
  };
  "/api/v1/submissions/{id}/offers": {
    parameters: {
      query?: never;
      header?: never;
      path?: never;
      cookie?: never;
    };
    /** Reviewed account resale; exact accepted terms and live authorization boundaries */
    get: operations["getResaleApiV1SubmissionsIdOffers"];
    put?: never;
    post?: never;
    delete?: never;
    options?: never;
    head?: never;
    patch?: never;
    trace?: never;
  };
  "/api/v1/submissions/{id}/payouts": {
    parameters: {
      query?: never;
      header?: never;
      path?: never;
      cookie?: never;
    };
    /** Reviewed account resale; exact accepted terms and live authorization boundaries */
    get: operations["getResaleApiV1SubmissionsIdPayouts"];
    put?: never;
    post?: never;
    delete?: never;
    options?: never;
    head?: never;
    patch?: never;
    trace?: never;
  };
  "/api/v1/seller-offers/{id}/{action}": {
    parameters: {
      query?: never;
      header?: never;
      path?: never;
      cookie?: never;
    };
    get?: never;
    put?: never;
    /** Reviewed account resale; exact accepted terms and live authorization boundaries */
    post: operations["postResaleApiV1SellerOffersIdAction"];
    delete?: never;
    options?: never;
    head?: never;
    patch?: never;
    trace?: never;
  };
  "/api/v1/account-orders/{id}/delivery": {
    parameters: {
      query?: never;
      header?: never;
      path?: never;
      cookie?: never;
    };
    /** Reviewed account resale; exact accepted terms and live authorization boundaries */
    get: operations["getResaleApiV1AccountOrdersIdDelivery"];
    put?: never;
    post?: never;
    delete?: never;
    options?: never;
    head?: never;
    patch?: never;
    trace?: never;
  };
  "/api/v1/account-orders/{id}/delivery/{action}": {
    parameters: {
      query?: never;
      header?: never;
      path?: never;
      cookie?: never;
    };
    get?: never;
    put?: never;
    /** Reviewed account resale; exact accepted terms and live authorization boundaries */
    post: operations["postResaleApiV1AccountOrdersIdDeliveryAction"];
    delete?: never;
    options?: never;
    head?: never;
    patch?: never;
    trace?: never;
  };
  "/api/v1/admin/submissions/{id}/offers": {
    parameters: {
      query?: never;
      header?: never;
      path?: never;
      cookie?: never;
    };
    /** Reviewed account resale; exact accepted terms and live authorization boundaries */
    get: operations["getResaleApiV1AdminSubmissionsIdOffers"];
    put?: never;
    /** Reviewed account resale; exact accepted terms and live authorization boundaries */
    post: operations["postResaleApiV1AdminSubmissionsIdOffers"];
    delete?: never;
    options?: never;
    head?: never;
    patch?: never;
    trace?: never;
  };
  "/api/v1/admin/submissions/{id}/payouts": {
    parameters: {
      query?: never;
      header?: never;
      path?: never;
      cookie?: never;
    };
    /** Reviewed account resale; exact accepted terms and live authorization boundaries */
    get: operations["getResaleApiV1AdminSubmissionsIdPayouts"];
    put?: never;
    post?: never;
    delete?: never;
    options?: never;
    head?: never;
    patch?: never;
    trace?: never;
  };
  "/api/v1/admin/seller-offers/{id}/{action}": {
    parameters: {
      query?: never;
      header?: never;
      path?: never;
      cookie?: never;
    };
    get?: never;
    put?: never;
    /** Reviewed account resale; exact accepted terms and live authorization boundaries */
    post: operations["postResaleApiV1AdminSellerOffersIdAction"];
    delete?: never;
    options?: never;
    head?: never;
    patch?: never;
    trace?: never;
  };
  "/api/v1/admin/account-orders/{id}/delivery": {
    parameters: {
      query?: never;
      header?: never;
      path?: never;
      cookie?: never;
    };
    /** Reviewed account resale; exact accepted terms and live authorization boundaries */
    get: operations["getResaleApiV1AdminAccountOrdersIdDelivery"];
    put?: never;
    post?: never;
    delete?: never;
    options?: never;
    head?: never;
    patch?: never;
    trace?: never;
  };
  "/api/v1/admin/account-orders/{id}/delivery/{action}": {
    parameters: {
      query?: never;
      header?: never;
      path?: never;
      cookie?: never;
    };
    get?: never;
    put?: never;
    /** Reviewed account resale; exact accepted terms and live authorization boundaries */
    post: operations["postResaleApiV1AdminAccountOrdersIdDeliveryAction"];
    delete?: never;
    options?: never;
    head?: never;
    patch?: never;
    trace?: never;
  };
  "/api/v1/seller-offers/{id}/secret": {
    parameters: {
      query?: never;
      header?: never;
      path?: never;
      cookie?: never;
    };
    /** Reviewed account resale; exact accepted terms and live authorization boundaries */
    get: operations["getResaleApiV1SellerOffersIdSecret"];
    put?: never;
    /** Reviewed account resale; exact accepted terms and live authorization boundaries */
    post: operations["postResaleApiV1SellerOffersIdSecret"];
    delete?: never;
    options?: never;
    head?: never;
    patch?: never;
    trace?: never;
  };
  "/api/v1/admin/seller-offers/{id}/secret/reveal": {
    parameters: {
      query?: never;
      header?: never;
      path?: never;
      cookie?: never;
    };
    get?: never;
    put?: never;
    /** Reviewed account resale; exact accepted terms and live authorization boundaries */
    post: operations["postResaleApiV1AdminSellerOffersIdSecretReveal"];
    delete?: never;
    options?: never;
    head?: never;
    patch?: never;
    trace?: never;
  };
  "/api/v1/admin/account-orders/{id}/secret": {
    parameters: {
      query?: never;
      header?: never;
      path?: never;
      cookie?: never;
    };
    get?: never;
    put?: never;
    /** Reviewed account resale; exact accepted terms and live authorization boundaries */
    post: operations["postResaleApiV1AdminAccountOrdersIdSecret"];
    delete?: never;
    options?: never;
    head?: never;
    patch?: never;
    trace?: never;
  };
  "/api/v1/account-orders/{id}/secret/reveal": {
    parameters: {
      query?: never;
      header?: never;
      path?: never;
      cookie?: never;
    };
    get?: never;
    put?: never;
    /** Reviewed account resale; exact accepted terms and live authorization boundaries */
    post: operations["postResaleApiV1AccountOrdersIdSecretReveal"];
    delete?: never;
    options?: never;
    head?: never;
    patch?: never;
    trace?: never;
  };
  "/api/v1/admin/seller-offers/{id}/listing": {
    parameters: {
      query?: never;
      header?: never;
      path?: never;
      cookie?: never;
    };
    get?: never;
    put?: never;
    /** Reviewed account resale; exact accepted terms and live authorization boundaries */
    post: operations["postResaleApiV1AdminSellerOffersIdListing"];
    delete?: never;
    options?: never;
    head?: never;
    patch?: never;
    trace?: never;
  };
  "/api/v1/admin/account-listings": {
    parameters: {
      query?: never;
      header?: never;
      path?: never;
      cookie?: never;
    };
    /** Reviewed account resale; exact accepted terms and live authorization boundaries */
    get: operations["getResaleApiV1AdminAccountListings"];
    put?: never;
    post?: never;
    delete?: never;
    options?: never;
    head?: never;
    patch?: never;
    trace?: never;
  };
  "/api/v1/admin/account-listings/{id}": {
    parameters: {
      query?: never;
      header?: never;
      path?: never;
      cookie?: never;
    };
    /** Reviewed account resale; exact accepted terms and live authorization boundaries */
    get: operations["getResaleApiV1AdminAccountListingsId"];
    put?: never;
    post?: never;
    delete?: never;
    options?: never;
    head?: never;
    patch?: never;
    trace?: never;
  };
  "/api/v1/admin/account-listings/{id}/{action}": {
    parameters: {
      query?: never;
      header?: never;
      path?: never;
      cookie?: never;
    };
    get?: never;
    put?: never;
    /** Reviewed account resale; exact accepted terms and live authorization boundaries */
    post: operations["postResaleApiV1AdminAccountListingsIdAction"];
    delete?: never;
    options?: never;
    head?: never;
    patch?: never;
    trace?: never;
  };
  "/api/v1/payouts/{id}/recipient": {
    parameters: {
      query?: never;
      header?: never;
      path?: never;
      cookie?: never;
    };
    get?: never;
    put?: never;
    /** Reviewed account resale; exact accepted terms and live authorization boundaries */
    post: operations["postResaleApiV1PayoutsIdRecipient"];
    delete?: never;
    options?: never;
    head?: never;
    patch?: never;
    trace?: never;
  };
  "/api/v1/admin/payouts/{id}/approve": {
    parameters: {
      query?: never;
      header?: never;
      path?: never;
      cookie?: never;
    };
    get?: never;
    put?: never;
    /** Reviewed account resale; exact accepted terms and live authorization boundaries */
    post: operations["postResaleApiV1AdminPayoutsIdApprove"];
    delete?: never;
    options?: never;
    head?: never;
    patch?: never;
    trace?: never;
  };
  "/api/v1/admin/payouts/{id}/verify": {
    parameters: {
      query?: never;
      header?: never;
      path?: never;
      cookie?: never;
    };
    get?: never;
    put?: never;
    /** Reviewed account resale; exact accepted terms and live authorization boundaries */
    post: operations["postResaleApiV1AdminPayoutsIdVerify"];
    delete?: never;
    options?: never;
    head?: never;
    patch?: never;
    trace?: never;
  };
  "/api/v1/admin/finance/payouts": {
    parameters: {
      query?: never;
      header?: never;
      path?: never;
      cookie?: never;
    };
    /** Reviewed account resale; exact accepted terms and live authorization boundaries */
    get: operations["getResaleApiV1AdminFinancePayouts"];
    put?: never;
    post?: never;
    delete?: never;
    options?: never;
    head?: never;
    patch?: never;
    trace?: never;
  };
  "/api/v1/accounts/{id}/images/{slot}": {
    parameters: {
      query?: never;
      header?: never;
      path?: never;
      cookie?: never;
    };
    /** Serve a reviewed clean image from the current public release; no private object key exposure */
    get: operations["publicReviewedAccountImage"];
    put?: never;
    post?: never;
    delete?: never;
    options?: never;
    head?: never;
    patch?: never;
    trace?: never;
  };
  "/api/v1/seller-offers/{id}/events": {
    parameters: {
      query?: never;
      header?: never;
      path?: never;
      cookie?: never;
    };
    /** Reviewed account resale; exact accepted terms and live authorization boundaries */
    get: operations["getResaleApiV1SubmissionsIdOffersHistory"];
    put?: never;
    post?: never;
    delete?: never;
    options?: never;
    head?: never;
    patch?: never;
    trace?: never;
  };
  "/api/v1/admin/seller-offers/{id}/events": {
    parameters: {
      query?: never;
      header?: never;
      path?: never;
      cookie?: never;
    };
    /** Reviewed account resale; exact accepted terms and live authorization boundaries */
    get: operations["getResaleApiV1AdminSubmissionsIdOffersHistory"];
    put?: never;
    post?: never;
    delete?: never;
    options?: never;
    head?: never;
    patch?: never;
    trace?: never;
  };
  "/api/v1/site/{kind}": {
    parameters: {
      query?: never;
      header?: never;
      path?: never;
      cookie?: never;
    };
    /** getPublishedSiteContent */
    get: operations["getPublishedSiteContent"];
    put?: never;
    post?: never;
    delete?: never;
    options?: never;
    head?: never;
    patch?: never;
    trace?: never;
  };
  "/api/v1/admin/site/{kind}": {
    parameters: {
      query?: never;
      header?: never;
      path?: never;
      cookie?: never;
    };
    /** getSiteDraft */
    get: operations["getSiteDraft"];
    put?: never;
    /** saveOrPublishSiteContent */
    post: operations["saveOrPublishSiteContent"];
    delete?: never;
    options?: never;
    head?: never;
    patch?: never;
    trace?: never;
  };
  "/api/v1/admin/site/{kind}/history": {
    parameters: {
      query?: never;
      header?: never;
      path?: never;
      cookie?: never;
    };
    /** getSitePublicationHistory */
    get: operations["getSitePublicationHistory"];
    put?: never;
    post?: never;
    delete?: never;
    options?: never;
    head?: never;
    patch?: never;
    trace?: never;
  };
  "/api/v1/privacy/requests": {
    parameters: {
      query?: never;
      header?: never;
      path?: never;
      cookie?: never;
    };
    /** getOwnPrivacyRequests */
    get: operations["getOwnPrivacyRequests"];
    put?: never;
    /** requestOwnPrivacyErasure */
    post: operations["requestOwnPrivacyErasure"];
    delete?: never;
    options?: never;
    head?: never;
    patch?: never;
    trace?: never;
  };
  "/api/v1/privacy/requests/{id}": {
    parameters: {
      query?: never;
      header?: never;
      path?: never;
      cookie?: never;
    };
    get?: never;
    put?: never;
    /** changeOwnPrivacyRequest */
    post: operations["changeOwnPrivacyRequest"];
    delete?: never;
    options?: never;
    head?: never;
    patch?: never;
    trace?: never;
  };
  "/api/v1/admin/privacy/requests": {
    parameters: {
      query?: never;
      header?: never;
      path?: never;
      cookie?: never;
    };
    /** getOwnerReviewedPrivacyRequests */
    get: operations["getOwnerReviewedPrivacyRequests"];
    put?: never;
    post?: never;
    delete?: never;
    options?: never;
    head?: never;
    patch?: never;
    trace?: never;
  };
  "/api/v1/admin/privacy/requests/{id}": {
    parameters: {
      query?: never;
      header?: never;
      path?: never;
      cookie?: never;
    };
    get?: never;
    put?: never;
    /** changeOwnerReviewedPrivacyRequest */
    post: operations["changeOwnerReviewedPrivacyRequest"];
    delete?: never;
    options?: never;
    head?: never;
    patch?: never;
    trace?: never;
  };
  "/api/v1/privacy/export": {
    parameters: {
      query?: never;
      header?: never;
      path?: never;
      cookie?: never;
    };
    get?: never;
    put?: never;
    /** exportOwnPersonalData */
    post: operations["exportOwnPersonalData"];
    delete?: never;
    options?: never;
    head?: never;
    patch?: never;
    trace?: never;
  };
  "/api/v1/admin/availability": {
    parameters: {
      query?: never;
      header?: never;
      path?: never;
      cookie?: never;
    };
    /** getStaffAvailabilityConsent */
    get: operations["getStaffAvailabilityConsent"];
    put?: never;
    post?: never;
    delete?: never;
    options?: never;
    head?: never;
    patch?: never;
    trace?: never;
  };
  "/api/v1/admin/availability/{id}/suppress": {
    parameters: {
      query?: never;
      header?: never;
      path?: never;
      cookie?: never;
    };
    get?: never;
    put?: never;
    /** suppressAvailabilityDelivery */
    post: operations["suppressAvailabilityDelivery"];
    delete?: never;
    options?: never;
    head?: never;
    patch?: never;
    trace?: never;
  };
  "/api/v1/admin/users/{id}/sessions": {
    parameters: {
      query?: never;
      header?: never;
      path?: never;
      cookie?: never;
    };
    /** getStaffUserSessions */
    get: operations["getStaffUserSessions"];
    put?: never;
    post?: never;
    delete?: never;
    options?: never;
    head?: never;
    patch?: never;
    trace?: never;
  };
  "/api/v1/admin/users/{id}/sessions/revoke": {
    parameters: {
      query?: never;
      header?: never;
      path?: never;
      cookie?: never;
    };
    get?: never;
    put?: never;
    /** revokeStaffUserSessions */
    post: operations["revokeStaffUserSessions"];
    delete?: never;
    options?: never;
    head?: never;
    patch?: never;
    trace?: never;
  };
  "/api/v1/site/{kind}/versions/{label}": {
    parameters: {
      query?: never;
      header?: never;
      path?: never;
      cookie?: never;
    };
    /** getPublishedContentVersion */
    get: operations["getPublishedContentVersion"];
    put?: never;
    post?: never;
    delete?: never;
    options?: never;
    head?: never;
    patch?: never;
    trace?: never;
  };
  "/api/v1/me/overview": {
    parameters: {
      query?: never;
      header?: never;
      path?: never;
      cookie?: never;
    };
    /** Bounded work and schedule for the signed-in customer */
    get: operations["customerAccountOverview"];
    put?: never;
    post?: never;
    delete?: never;
    options?: never;
    head?: never;
    patch?: never;
    trace?: never;
  };
  "/api/v1/auth/portals/{portal}/session": {
    parameters: {
      query?: never;
      header?: never;
      path?: never;
      cookie?: never;
    };
    /**
     * getAuthSession
     * @description Explicit portal authentication. Challenges, cookies, CSRF, Google state/nonce/PKCE and MFA are isolated by audience. Staff sign-in requires an existing eligible account; no staff signup. Missing or inactive staff access returns staff_access_required (403), without sending a code. Resend waits 120 seconds; throttled requests return rate_limited (429), not code-sent success. Google callbacks return to the same portal on the trusted configured origin, with error=staff_access for unavailable workspace access.
     */
    get: operations["portalGetAuthSession"];
    put?: never;
    post?: never;
    delete?: never;
    options?: never;
    head?: never;
    patch?: never;
    trace?: never;
  };
  "/api/v1/auth/portals/{portal}/email/request": {
    parameters: {
      query?: never;
      header?: never;
      path?: never;
      cookie?: never;
    };
    get?: never;
    put?: never;
    /**
     * requestEmailCode
     * @description Explicit portal authentication. Challenges, cookies, CSRF, Google state/nonce/PKCE and MFA are isolated by audience. Staff sign-in requires an existing eligible account; no staff signup. Missing or inactive staff access returns staff_access_required (403), without sending a code. Resend waits 120 seconds; throttled requests return rate_limited (429), not code-sent success. Google callbacks return to the same portal on the trusted configured origin, with error=staff_access for unavailable workspace access.
     */
    post: operations["portalRequestEmailCode"];
    delete?: never;
    options?: never;
    head?: never;
    patch?: never;
    trace?: never;
  };
  "/api/v1/auth/portals/{portal}/email/verify": {
    parameters: {
      query?: never;
      header?: never;
      path?: never;
      cookie?: never;
    };
    get?: never;
    put?: never;
    /**
     * verifyEmailCode
     * @description Explicit portal authentication. Challenges, cookies, CSRF, Google state/nonce/PKCE and MFA are isolated by audience. Staff sign-in requires an existing eligible account; no staff signup. Missing or inactive staff access returns staff_access_required (403), without sending a code. Resend waits 120 seconds; throttled requests return rate_limited (429), not code-sent success. Google callbacks return to the same portal on the trusted configured origin, with error=staff_access for unavailable workspace access.
     */
    post: operations["portalVerifyEmailCode"];
    delete?: never;
    options?: never;
    head?: never;
    patch?: never;
    trace?: never;
  };
  "/api/v1/auth/portals/{portal}/google/start": {
    parameters: {
      query?: never;
      header?: never;
      path?: never;
      cookie?: never;
    };
    get?: never;
    put?: never;
    /**
     * startGoogle
     * @description Explicit portal authentication. Challenges, cookies, CSRF, Google state/nonce/PKCE and MFA are isolated by audience. Staff sign-in requires an existing eligible account; no staff signup. Missing or inactive staff access returns staff_access_required (403), without sending a code. Resend waits 120 seconds; throttled requests return rate_limited (429), not code-sent success. Google callbacks return to the same portal on the trusted configured origin, with error=staff_access for unavailable workspace access.
     */
    post: operations["portalStartGoogle"];
    delete?: never;
    options?: never;
    head?: never;
    patch?: never;
    trace?: never;
  };
  "/api/v1/auth/portals/{portal}/google/callback": {
    parameters: {
      query?: never;
      header?: never;
      path?: never;
      cookie?: never;
    };
    /**
     * finishGoogle
     * @description Explicit portal authentication. Challenges, cookies, CSRF, Google state/nonce/PKCE and MFA are isolated by audience. Staff sign-in requires an existing eligible account; no staff signup. Missing or inactive staff access returns staff_access_required (403), without sending a code. Resend waits 120 seconds; throttled requests return rate_limited (429), not code-sent success. Google callbacks return to the same portal on the trusted configured origin, with error=staff_access for unavailable workspace access.
     */
    get: operations["portalFinishGoogle"];
    put?: never;
    post?: never;
    delete?: never;
    options?: never;
    head?: never;
    patch?: never;
    trace?: never;
  };
  "/api/v1/auth/portals/{portal}/logout": {
    parameters: {
      query?: never;
      header?: never;
      path?: never;
      cookie?: never;
    };
    get?: never;
    put?: never;
    /**
     * logout
     * @description Explicit portal authentication. Challenges, cookies, CSRF, Google state/nonce/PKCE and MFA are isolated by audience. Staff sign-in requires an existing eligible account; no staff signup. Missing or inactive staff access returns staff_access_required (403), without sending a code. Resend waits 120 seconds; throttled requests return rate_limited (429), not code-sent success. Google callbacks return to the same portal on the trusted configured origin, with error=staff_access for unavailable workspace access.
     */
    post: operations["portalLogout"];
    delete?: never;
    options?: never;
    head?: never;
    patch?: never;
    trace?: never;
  };
  "/api/v1/auth/portals/{portal}/mfa/disable": {
    parameters: {
      query?: never;
      header?: never;
      path?: never;
      cookie?: never;
    };
    get?: never;
    put?: never;
    /**
     * disableMFA
     * @description Explicit portal authentication. Challenges, cookies, CSRF, Google state/nonce/PKCE and MFA are isolated by audience. Staff sign-in requires an existing eligible account; no staff signup. Missing or inactive staff access returns staff_access_required (403), without sending a code. Resend waits 120 seconds; throttled requests return rate_limited (429), not code-sent success. Google callbacks return to the same portal on the trusted configured origin, with error=staff_access for unavailable workspace access.
     */
    post: operations["portalDisableMFA"];
    delete?: never;
    options?: never;
    head?: never;
    patch?: never;
    trace?: never;
  };
  "/api/v1/auth/portals/{portal}/sessions/revoke": {
    parameters: {
      query?: never;
      header?: never;
      path?: never;
      cookie?: never;
    };
    get?: never;
    put?: never;
    /**
     * revokeSessions
     * @description Explicit portal authentication. Challenges, cookies, CSRF, Google state/nonce/PKCE and MFA are isolated by audience. Staff sign-in requires an existing eligible account; no staff signup. Missing or inactive staff access returns staff_access_required (403), without sending a code. Resend waits 120 seconds; throttled requests return rate_limited (429), not code-sent success. Google callbacks return to the same portal on the trusted configured origin, with error=staff_access for unavailable workspace access.
     */
    post: operations["portalRevokeSessions"];
    delete?: never;
    options?: never;
    head?: never;
    patch?: never;
    trace?: never;
  };
  "/api/v1/auth/portals/{portal}/mfa/enroll": {
    parameters: {
      query?: never;
      header?: never;
      path?: never;
      cookie?: never;
    };
    get?: never;
    put?: never;
    /**
     * enrollMFA
     * @description Explicit portal authentication. Challenges, cookies, CSRF, Google state/nonce/PKCE and MFA are isolated by audience. Staff sign-in requires an existing eligible account; no staff signup. Missing or inactive staff access returns staff_access_required (403), without sending a code. Resend waits 120 seconds; throttled requests return rate_limited (429), not code-sent success. Google callbacks return to the same portal on the trusted configured origin, with error=staff_access for unavailable workspace access.
     */
    post: operations["portalEnrollMFA"];
    delete?: never;
    options?: never;
    head?: never;
    patch?: never;
    trace?: never;
  };
  "/api/v1/auth/portals/{portal}/mfa/verify": {
    parameters: {
      query?: never;
      header?: never;
      path?: never;
      cookie?: never;
    };
    get?: never;
    put?: never;
    /**
     * verifyMFA
     * @description Explicit portal authentication. Challenges, cookies, CSRF, Google state/nonce/PKCE and MFA are isolated by audience. Staff sign-in requires an existing eligible account; no staff signup. Missing or inactive staff access returns staff_access_required (403), without sending a code. Resend waits 120 seconds; throttled requests return rate_limited (429), not code-sent success. Google callbacks return to the same portal on the trusted configured origin, with error=staff_access for unavailable workspace access.
     */
    post: operations["portalVerifyMFA"];
    delete?: never;
    options?: never;
    head?: never;
    patch?: never;
    trace?: never;
  };
  "/api/v1/auth/portals/{portal}/mfa/recovery-codes": {
    parameters: {
      query?: never;
      header?: never;
      path?: never;
      cookie?: never;
    };
    get?: never;
    put?: never;
    /**
     * regenerateRecoveryCodes
     * @description Explicit portal authentication. Challenges, cookies, CSRF, Google state/nonce/PKCE and MFA are isolated by audience. Staff sign-in requires an existing eligible account; no staff signup. Missing or inactive staff access returns staff_access_required (403), without sending a code. Resend waits 120 seconds; throttled requests return rate_limited (429), not code-sent success. Google callbacks return to the same portal on the trusted configured origin, with error=staff_access for unavailable workspace access.
     */
    post: operations["portalRegenerateRecoveryCodes"];
    delete?: never;
    options?: never;
    head?: never;
    patch?: never;
    trace?: never;
  };
  "/api/v1/catalog/games/{slug}/discovery": {
    parameters: {
      query?: never;
      header?: never;
      path?: never;
      cookie?: never;
    };
    /** Published service availability, indicative offers and source-derived metrics; checkout revalidates all terms. */
    get: operations["getGameDiscovery"];
    put?: never;
    post?: never;
    delete?: never;
    options?: never;
    head?: never;
    patch?: never;
    trace?: never;
  };
  "/api/v1/site/metrics": {
    parameters: {
      query?: never;
      header?: never;
      path?: never;
      cookie?: never;
    };
    /** Aggregate evidence under the explicitly published homepage metric policy; unavailable evidence never becomes zero. */
    get: operations["getPublicMetrics"];
    put?: never;
    post?: never;
    delete?: never;
    options?: never;
    head?: never;
    patch?: never;
    trace?: never;
  };
  "/api/v1/public/reviews": {
    parameters: {
      query?: never;
      header?: never;
      path?: never;
      cookie?: never;
    };
    /** At most eight recent moderated reviews across publicly listed games, with current purchase status and no private identities */
    get: operations["publicReviewShowcase"];
    put?: never;
    post?: never;
    delete?: never;
    options?: never;
    head?: never;
    patch?: never;
    trace?: never;
  };
  "/api/v1/me/order-requests/{key}": {
    parameters: {
      query?: never;
      header?: never;
      path?: never;
      cookie?: never;
    };
    /** Recover only the signed-in customer’s order identifier by creation request reference */
    get: operations["recoverCustomerOrder"];
    put?: never;
    post?: never;
    delete?: never;
    options?: never;
    head?: never;
    patch?: never;
    trace?: never;
  };
  "/api/v1/booster/calendar/sessions": {
    parameters: {
      query?: never;
      header?: never;
      path?: never;
      cookie?: never;
    };
    /** Upcoming sessions for current paid booster assignments */
    get: operations["getBoosterSessionAgenda"];
    put?: never;
    post?: never;
    delete?: never;
    options?: never;
    head?: never;
    patch?: never;
    trace?: never;
  };
  "/api/v1/booster/fulfillment/{id}/readiness": {
    parameters: {
      query?: never;
      header?: never;
      path?: never;
      cookie?: never;
    };
    /** Read advisory prerequisites under current assignment authority; execution rechecks them */
    get: operations["getBoosterFulfillmentReadiness"];
    put?: never;
    post?: never;
    delete?: never;
    options?: never;
    head?: never;
    patch?: never;
    trace?: never;
  };
  "/api/v1/admin/fulfillment/{id}/readiness": {
    parameters: {
      query?: never;
      header?: never;
      path?: never;
      cookie?: never;
    };
    /** Read advisory prerequisites under current assignment authority; execution rechecks them */
    get: operations["getAdminFulfillmentReadiness"];
    put?: never;
    post?: never;
    delete?: never;
    options?: never;
    head?: never;
    patch?: never;
    trace?: never;
  };
  "/api/v1/booster/calendar/window-series": {
    parameters: {
      query?: never;
      header?: never;
      path?: never;
      cookie?: never;
    };
    get?: never;
    put?: never;
    /** Atomically publish up to twelve explicit dates; retries bind the entire reviewed series */
    post: operations["publishBoosterAvailabilitySeries"];
    delete?: never;
    options?: never;
    head?: never;
    patch?: never;
    trace?: never;
  };
  "/api/v1/admin/staff/{staff}/calendar/window-series": {
    parameters: {
      query?: never;
      header?: never;
      path?: never;
      cookie?: never;
    };
    get?: never;
    put?: never;
    /** Atomically publish up to twelve explicit dates; retries bind the entire reviewed series */
    post: operations["publishAdminAvailabilitySeries"];
    delete?: never;
    options?: never;
    head?: never;
    patch?: never;
    trace?: never;
  };
  "/api/v1/admin/orders/{id}/quote/preview": {
    parameters: {
      query?: never;
      header?: never;
      path?: never;
      cookie?: never;
    };
    get?: never;
    put?: never;
    /** Preview the customer agreement without issuing a quote */
    post: operations["previewOrderQuote"];
    delete?: never;
    options?: never;
    head?: never;
    patch?: never;
    trace?: never;
  };
  "/api/v1/accounts/games": {
    parameters: {
      query?: never;
      header?: never;
      path?: never;
      cookie?: never;
    };
    /** Released, available games with published account inventory */
    get: operations["getResaleMarketGames"];
    put?: never;
    post?: never;
    delete?: never;
    options?: never;
    head?: never;
    patch?: never;
    trace?: never;
  };
  "/api/v1/refunds/{id}/history": {
    parameters: {
      query?: never;
      header?: never;
      path?: never;
      cookie?: never;
    };
    /** Read authorized private transfer events and provider attempts */
    get: operations["getCustomerRefundsEvidenceHistory"];
    put?: never;
    post?: never;
    delete?: never;
    options?: never;
    head?: never;
    patch?: never;
    trace?: never;
  };
  "/api/v1/payouts/{id}/history": {
    parameters: {
      query?: never;
      header?: never;
      path?: never;
      cookie?: never;
    };
    /** Read authorized private transfer events and provider attempts */
    get: operations["getCustomerPayoutsEvidenceHistory"];
    put?: never;
    post?: never;
    delete?: never;
    options?: never;
    head?: never;
    patch?: never;
    trace?: never;
  };
  "/api/v1/admin/refunds/{id}/history": {
    parameters: {
      query?: never;
      header?: never;
      path?: never;
      cookie?: never;
    };
    /** Read authorized private transfer events and provider attempts */
    get: operations["getAdminRefundsEvidenceHistory"];
    put?: never;
    post?: never;
    delete?: never;
    options?: never;
    head?: never;
    patch?: never;
    trace?: never;
  };
  "/api/v1/admin/payouts/{id}/history": {
    parameters: {
      query?: never;
      header?: never;
      path?: never;
      cookie?: never;
    };
    /** Read authorized private transfer events and provider attempts */
    get: operations["getAdminPayoutsEvidenceHistory"];
    put?: never;
    post?: never;
    delete?: never;
    options?: never;
    head?: never;
    patch?: never;
    trace?: never;
  };
  "/api/v1/admin/finance/reconciliation": {
    parameters: {
      query?: never;
      header?: never;
      path?: never;
      cookie?: never;
    };
    /** Inspect an account-bound provider reference and its latest manual read */
    get: operations["inspectFinanceReconciliation"];
    put?: never;
    post?: never;
    delete?: never;
    options?: never;
    head?: never;
    patch?: never;
    trace?: never;
  };
  "/api/v1/admin/shop/products": {
    parameters: {
      query?: never;
      header?: never;
      path?: never;
      cookie?: never;
    };
    /** Versioned manual-shop authoring with current administrator authority */
    get: operations["getShopApiV1AdminShopProducts"];
    put?: never;
    /** Versioned manual-shop authoring with current administrator authority */
    post: operations["postShopApiV1AdminShopProducts"];
    delete?: never;
    options?: never;
    head?: never;
    patch?: never;
    trace?: never;
  };
  "/api/v1/admin/shop/products/{id}": {
    parameters: {
      query?: never;
      header?: never;
      path?: never;
      cookie?: never;
    };
    /** Versioned manual-shop authoring with current administrator authority */
    get: operations["getShopApiV1AdminShopProductsId"];
    put?: never;
    post?: never;
    delete?: never;
    options?: never;
    head?: never;
    patch?: never;
    trace?: never;
  };
  "/api/v1/admin/shop/products/{id}/draft": {
    parameters: {
      query?: never;
      header?: never;
      path?: never;
      cookie?: never;
    };
    get?: never;
    put?: never;
    /** Versioned manual-shop authoring with current administrator authority */
    post: operations["postShopApiV1AdminShopProductsIdDraft"];
    delete?: never;
    options?: never;
    head?: never;
    patch?: never;
    trace?: never;
  };
  "/api/v1/admin/shop/products/{id}/preview": {
    parameters: {
      query?: never;
      header?: never;
      path?: never;
      cookie?: never;
    };
    /** Versioned manual-shop authoring with current administrator authority */
    get: operations["getShopApiV1AdminShopProductsIdPreview"];
    put?: never;
    post?: never;
    delete?: never;
    options?: never;
    head?: never;
    patch?: never;
    trace?: never;
  };
  "/api/v1/admin/shop/products/{id}/releases": {
    parameters: {
      query?: never;
      header?: never;
      path?: never;
      cookie?: never;
    };
    /** Versioned manual-shop authoring with current administrator authority */
    get: operations["getShopApiV1AdminShopProductsIdReleases"];
    put?: never;
    post?: never;
    delete?: never;
    options?: never;
    head?: never;
    patch?: never;
    trace?: never;
  };
  "/api/v1/admin/shop/products/{id}/publish": {
    parameters: {
      query?: never;
      header?: never;
      path?: never;
      cookie?: never;
    };
    get?: never;
    put?: never;
    /** Versioned manual-shop authoring with current administrator authority */
    post: operations["postShopApiV1AdminShopProductsIdPublish"];
    delete?: never;
    options?: never;
    head?: never;
    patch?: never;
    trace?: never;
  };
  "/api/v1/admin/shop/products/{id}/pause": {
    parameters: {
      query?: never;
      header?: never;
      path?: never;
      cookie?: never;
    };
    get?: never;
    put?: never;
    /** Versioned manual-shop authoring with current administrator authority */
    post: operations["postShopApiV1AdminShopProductsIdPause"];
    delete?: never;
    options?: never;
    head?: never;
    patch?: never;
    trace?: never;
  };
  "/api/v1/admin/shop/products/{id}/resume": {
    parameters: {
      query?: never;
      header?: never;
      path?: never;
      cookie?: never;
    };
    get?: never;
    put?: never;
    /** Versioned manual-shop authoring with current administrator authority */
    post: operations["postShopApiV1AdminShopProductsIdResume"];
    delete?: never;
    options?: never;
    head?: never;
    patch?: never;
    trace?: never;
  };
  "/api/v1/admin/shop/products/{id}/archive": {
    parameters: {
      query?: never;
      header?: never;
      path?: never;
      cookie?: never;
    };
    get?: never;
    put?: never;
    /** Versioned manual-shop authoring with current administrator authority */
    post: operations["postShopApiV1AdminShopProductsIdArchive"];
    delete?: never;
    options?: never;
    head?: never;
    patch?: never;
    trace?: never;
  };
  "/api/v1/admin/shop/products/{id}/restore": {
    parameters: {
      query?: never;
      header?: never;
      path?: never;
      cookie?: never;
    };
    get?: never;
    put?: never;
    /** Versioned manual-shop authoring with current administrator authority */
    post: operations["postShopApiV1AdminShopProductsIdRestore"];
    delete?: never;
    options?: never;
    head?: never;
    patch?: never;
    trace?: never;
  };
  "/api/v1/admin/shop/products/{id}/stock": {
    parameters: {
      query?: never;
      header?: never;
      path?: never;
      cookie?: never;
    };
    get?: never;
    put?: never;
    /** Versioned manual-shop authoring with current administrator authority */
    post: operations["postShopApiV1AdminShopProductsIdStock"];
    delete?: never;
    options?: never;
    head?: never;
    patch?: never;
    trace?: never;
  };
  "/api/v1/games/{slug}/shop": {
    parameters: {
      query?: never;
      header?: never;
      path?: never;
      cookie?: never;
    };
    /** Published shop purchase and authorized manual delivery */
    get: operations["getShopApiV1GamesSlugShop"];
    put?: never;
    post?: never;
    delete?: never;
    options?: never;
    head?: never;
    patch?: never;
    trace?: never;
  };
  "/api/v1/games/{slug}/shop/{id}": {
    parameters: {
      query?: never;
      header?: never;
      path?: never;
      cookie?: never;
    };
    /** Published shop purchase and authorized manual delivery */
    get: operations["getShopApiV1GamesSlugShopId"];
    put?: never;
    post?: never;
    delete?: never;
    options?: never;
    head?: never;
    patch?: never;
    trace?: never;
  };
  "/api/v1/games/{slug}/shop/{id}/reserve": {
    parameters: {
      query?: never;
      header?: never;
      path?: never;
      cookie?: never;
    };
    get?: never;
    put?: never;
    /** Published shop purchase and authorized manual delivery */
    post: operations["postShopApiV1GamesSlugShopIdReserve"];
    delete?: never;
    options?: never;
    head?: never;
    patch?: never;
    trace?: never;
  };
  "/api/v1/orders/{id}/shop": {
    parameters: {
      query?: never;
      header?: never;
      path?: never;
      cookie?: never;
    };
    /** Published shop purchase and authorized manual delivery */
    get: operations["getShopApiV1OrdersIdShop"];
    put?: never;
    post?: never;
    delete?: never;
    options?: never;
    head?: never;
    patch?: never;
    trace?: never;
  };
  "/api/v1/orders/{id}/shop/recipient": {
    parameters: {
      query?: never;
      header?: never;
      path?: never;
      cookie?: never;
    };
    get?: never;
    put?: never;
    /** Published shop purchase and authorized manual delivery */
    post: operations["postShopApiV1OrdersIdShopRecipient"];
    delete?: never;
    options?: never;
    head?: never;
    patch?: never;
    trace?: never;
  };
  "/api/v1/admin/orders/{id}/shop": {
    parameters: {
      query?: never;
      header?: never;
      path?: never;
      cookie?: never;
    };
    /** Published shop purchase and authorized manual delivery */
    get: operations["getShopApiV1AdminOrdersIdShop"];
    put?: never;
    post?: never;
    delete?: never;
    options?: never;
    head?: never;
    patch?: never;
    trace?: never;
  };
  "/api/v1/admin/orders/{id}/shop/recipient": {
    parameters: {
      query?: never;
      header?: never;
      path?: never;
      cookie?: never;
    };
    get?: never;
    put?: never;
    /** Published shop purchase and authorized manual delivery */
    post: operations["postShopApiV1AdminOrdersIdShopRecipient"];
    delete?: never;
    options?: never;
    head?: never;
    patch?: never;
    trace?: never;
  };
  "/api/v1/admin/orders/{id}/shop/{action}": {
    parameters: {
      query?: never;
      header?: never;
      path?: never;
      cookie?: never;
    };
    get?: never;
    put?: never;
    /** Published shop purchase and authorized manual delivery */
    post: operations["postShopApiV1AdminOrdersIdShopAction"];
    delete?: never;
    options?: never;
    head?: never;
    patch?: never;
    trace?: never;
  };
  "/api/v1/admin/news": {
    parameters: {
      query?: never;
      header?: never;
      path?: never;
      cookie?: never;
    };
    /** Versioned staff-managed editorial content */
    get: operations["getArticleApiV1AdminNews"];
    put?: never;
    /** Versioned staff-managed editorial content */
    post: operations["postArticleApiV1AdminNews"];
    delete?: never;
    options?: never;
    head?: never;
    patch?: never;
    trace?: never;
  };
  "/api/v1/admin/news/{id}": {
    parameters: {
      query?: never;
      header?: never;
      path?: never;
      cookie?: never;
    };
    /** Versioned staff-managed editorial content */
    get: operations["getArticleApiV1AdminNewsId"];
    put?: never;
    post?: never;
    delete?: never;
    options?: never;
    head?: never;
    patch?: never;
    trace?: never;
  };
  "/api/v1/admin/news/{id}/draft": {
    parameters: {
      query?: never;
      header?: never;
      path?: never;
      cookie?: never;
    };
    get?: never;
    put?: never;
    /** Versioned staff-managed editorial content */
    post: operations["postArticleApiV1AdminNewsIdDraft"];
    delete?: never;
    options?: never;
    head?: never;
    patch?: never;
    trace?: never;
  };
  "/api/v1/admin/news/{id}/preview": {
    parameters: {
      query?: never;
      header?: never;
      path?: never;
      cookie?: never;
    };
    /** Versioned staff-managed editorial content */
    get: operations["getArticleApiV1AdminNewsIdPreview"];
    put?: never;
    post?: never;
    delete?: never;
    options?: never;
    head?: never;
    patch?: never;
    trace?: never;
  };
  "/api/v1/admin/news/{id}/history": {
    parameters: {
      query?: never;
      header?: never;
      path?: never;
      cookie?: never;
    };
    /** Versioned staff-managed editorial content */
    get: operations["getArticleApiV1AdminNewsIdHistory"];
    put?: never;
    post?: never;
    delete?: never;
    options?: never;
    head?: never;
    patch?: never;
    trace?: never;
  };
  "/api/v1/admin/news/{id}/publish": {
    parameters: {
      query?: never;
      header?: never;
      path?: never;
      cookie?: never;
    };
    get?: never;
    put?: never;
    /** Versioned staff-managed editorial content */
    post: operations["postArticleApiV1AdminNewsIdPublish"];
    delete?: never;
    options?: never;
    head?: never;
    patch?: never;
    trace?: never;
  };
  "/api/v1/admin/news/{id}/schedule": {
    parameters: {
      query?: never;
      header?: never;
      path?: never;
      cookie?: never;
    };
    get?: never;
    put?: never;
    /** Versioned staff-managed editorial content */
    post: operations["postArticleApiV1AdminNewsIdSchedule"];
    delete?: never;
    options?: never;
    head?: never;
    patch?: never;
    trace?: never;
  };
  "/api/v1/admin/news/{id}/unschedule": {
    parameters: {
      query?: never;
      header?: never;
      path?: never;
      cookie?: never;
    };
    get?: never;
    put?: never;
    /** Versioned staff-managed editorial content */
    post: operations["postArticleApiV1AdminNewsIdUnschedule"];
    delete?: never;
    options?: never;
    head?: never;
    patch?: never;
    trace?: never;
  };
  "/api/v1/admin/news/{id}/unpublish": {
    parameters: {
      query?: never;
      header?: never;
      path?: never;
      cookie?: never;
    };
    get?: never;
    put?: never;
    /** Versioned staff-managed editorial content */
    post: operations["postArticleApiV1AdminNewsIdUnpublish"];
    delete?: never;
    options?: never;
    head?: never;
    patch?: never;
    trace?: never;
  };
  "/api/v1/admin/news/{id}/archive": {
    parameters: {
      query?: never;
      header?: never;
      path?: never;
      cookie?: never;
    };
    get?: never;
    put?: never;
    /** Versioned staff-managed editorial content */
    post: operations["postArticleApiV1AdminNewsIdArchive"];
    delete?: never;
    options?: never;
    head?: never;
    patch?: never;
    trace?: never;
  };
  "/api/v1/admin/news/{id}/restore": {
    parameters: {
      query?: never;
      header?: never;
      path?: never;
      cookie?: never;
    };
    get?: never;
    put?: never;
    /** Versioned staff-managed editorial content */
    post: operations["postArticleApiV1AdminNewsIdRestore"];
    delete?: never;
    options?: never;
    head?: never;
    patch?: never;
    trace?: never;
  };
  "/api/v1/games/{slug}/news": {
    parameters: {
      query?: never;
      header?: never;
      path?: never;
      cookie?: never;
    };
    /** Versioned staff-managed editorial content */
    get: operations["getArticleApiV1GamesSlugNews"];
    put?: never;
    post?: never;
    delete?: never;
    options?: never;
    head?: never;
    patch?: never;
    trace?: never;
  };
  "/api/v1/games/{slug}/news/{article}": {
    parameters: {
      query?: never;
      header?: never;
      path?: never;
      cookie?: never;
    };
    /** Versioned staff-managed editorial content */
    get: operations["getArticleApiV1GamesSlugNewsArticle"];
    put?: never;
    post?: never;
    delete?: never;
    options?: never;
    head?: never;
    patch?: never;
    trace?: never;
  };
  "/api/v1/games/{slug}/news-sitemap": {
    parameters: {
      query?: never;
      header?: never;
      path?: never;
      cookie?: never;
    };
    /** Versioned staff-managed editorial content */
    get: operations["getArticleSitemap"];
    put?: never;
    post?: never;
    delete?: never;
    options?: never;
    head?: never;
    patch?: never;
    trace?: never;
  };
  "/api/v1/admin/jobs/{id}/attempts": {
    parameters: {
      query?: never;
      header?: never;
      path?: never;
      cookie?: never;
    };
    /** Read recorded task attempt timing and safe outcomes */
    get: operations["listAdminJobAttempts"];
    put?: never;
    post?: never;
    delete?: never;
    options?: never;
    head?: never;
    patch?: never;
    trace?: never;
  };
  "/api/v1/admin/artwork/{id}/bytes": {
    parameters: {
      query?: never;
      header?: never;
      path?: never;
      cookie?: never;
    };
    get?: never;
    /** Admin-only bounded scanned artwork upload; exact request IDs are replay-safe. Same request ID must retain bytes, MIME, purpose and focal point. Drafts stay private. */
    put: operations["uploadEditorialArtwork"];
    post?: never;
    delete?: never;
    options?: never;
    head?: never;
    patch?: never;
    trace?: never;
  };
  "/api/v1/artwork/{id}/{variant}": {
    parameters: {
      query?: never;
      header?: never;
      path?: never;
      cookie?: never;
    };
    /** Serves only sanitized derivatives referenced by a currently public game, product or article. Rechecks publication after object retrieval. */
    get: operations["getPublishedArtwork"];
    put?: never;
    post?: never;
    delete?: never;
    options?: never;
    head?: never;
    patch?: never;
    trace?: never;
  };
  "/api/v1/admin/artwork/{id}/{variant}": {
    parameters: {
      query?: never;
      header?: never;
      path?: never;
      cookie?: never;
    };
    /** Current admin authority required for draft previews. */
    get: operations["previewEditorialArtwork"];
    put?: never;
    post?: never;
    delete?: never;
    options?: never;
    head?: never;
    patch?: never;
    trace?: never;
  };
  "/api/v1/admin/staff/invitations": {
    parameters: {
      query?: never;
      header?: never;
      path?: never;
      cookie?: never;
    };
    get?: never;
    put?: never;
    /**
     * Provision an independent staff identity
     * @description Owner with completed staff sign-in and one recent verification factor only. Role must match the target portal. Does not convert a customer identity or send an email. Duplicate email within one portal conflicts.
     */
    post: operations["inviteStaff"];
    delete?: never;
    options?: never;
    head?: never;
    patch?: never;
    trace?: never;
  };
  "/api/v1/admin/account-agreement-defaults": {
    parameters: {
      query?: never;
      header?: never;
      path?: never;
      cookie?: never;
    };
    /** Owner-approved reusable agreement wording; requires staff access */
    get: operations["accountAgreementDefaults"];
    put?: never;
    post?: never;
    delete?: never;
    options?: never;
    head?: never;
    patch?: never;
    trace?: never;
  };
  "/api/v1/admin/payouts/{id}/manual": {
    parameters: {
      query?: never;
      header?: never;
      path?: never;
      cookie?: never;
    };
    get?: never;
    put?: never;
    /** Record owner-confirmed external seller payout; sends no funds and does not verify the blockchain */
    post: operations["recordManualSellerPayout"];
    delete?: never;
    options?: never;
    head?: never;
    patch?: never;
    trace?: never;
  };
  "/api/v1/submissions/{id}/selling-progress": {
    parameters: {
      query?: never;
      header?: never;
      path?: never;
      cookie?: never;
    };
    /** Private account sale next steps and publication blockers; no credential or payout destination data */
    get: operations["getSellerSellingProgress"];
    put?: never;
    post?: never;
    delete?: never;
    options?: never;
    head?: never;
    patch?: never;
    trace?: never;
  };
  "/api/v1/admin/submissions/{id}/selling-progress": {
    parameters: {
      query?: never;
      header?: never;
      path?: never;
      cookie?: never;
    };
    /** Private account sale next steps and publication blockers; no credential or payout destination data */
    get: operations["getAdminSellingProgress"];
    put?: never;
    post?: never;
    delete?: never;
    options?: never;
    head?: never;
    patch?: never;
    trace?: never;
  };
  "/api/v1/conversations/{id}/forms/{form}": {
    parameters: {
      query?: never;
      header?: never;
      path?: never;
      cookie?: never;
    };
    /** Recipient-bound conversation form read. Protected actions require fresh verification; sensitive values never appear in messages or notifications. */
    get: operations["memberChatFormRead"];
    put?: never;
    post?: never;
    delete?: never;
    options?: never;
    head?: never;
    patch?: never;
    trace?: never;
  };
  "/api/v1/conversations/{id}/forms/legacy": {
    parameters: {
      query?: never;
      header?: never;
      path?: never;
      cookie?: never;
    };
    /** Recipient-bound conversation form legacy. Protected actions require fresh verification; sensitive values never appear in messages or notifications. */
    get: operations["memberChatFormLegacy"];
    put?: never;
    post?: never;
    delete?: never;
    options?: never;
    head?: never;
    patch?: never;
    trace?: never;
  };
  "/api/v1/conversations/{id}/forms/{form}/reveal": {
    parameters: {
      query?: never;
      header?: never;
      path?: never;
      cookie?: never;
    };
    get?: never;
    put?: never;
    /** Recipient-bound conversation form reveal. Protected actions require fresh verification; sensitive values never appear in messages or notifications. */
    post: operations["memberChatFormReveal"];
    delete?: never;
    options?: never;
    head?: never;
    patch?: never;
    trace?: never;
  };
  "/api/v1/conversations/{id}/forms/{form}/reply": {
    parameters: {
      query?: never;
      header?: never;
      path?: never;
      cookie?: never;
    };
    get?: never;
    put?: never;
    /** Recipient-bound conversation form reply. Protected actions require fresh verification; sensitive values never appear in messages or notifications. */
    post: operations["memberChatFormReply"];
    delete?: never;
    options?: never;
    head?: never;
    patch?: never;
    trace?: never;
  };
  "/api/v1/admin/conversations/{id}/forms/{form}": {
    parameters: {
      query?: never;
      header?: never;
      path?: never;
      cookie?: never;
    };
    /** Recipient-bound conversation form read. Protected actions require fresh verification; sensitive values never appear in messages or notifications. */
    get: operations["staffChatFormRead"];
    put?: never;
    post?: never;
    delete?: never;
    options?: never;
    head?: never;
    patch?: never;
    trace?: never;
  };
  "/api/v1/admin/conversations/{id}/forms/legacy": {
    parameters: {
      query?: never;
      header?: never;
      path?: never;
      cookie?: never;
    };
    /** Recipient-bound conversation form legacy. Protected actions require fresh verification; sensitive values never appear in messages or notifications. */
    get: operations["staffChatFormLegacy"];
    put?: never;
    post?: never;
    delete?: never;
    options?: never;
    head?: never;
    patch?: never;
    trace?: never;
  };
  "/api/v1/admin/conversations/{id}/forms/{form}/reveal": {
    parameters: {
      query?: never;
      header?: never;
      path?: never;
      cookie?: never;
    };
    get?: never;
    put?: never;
    /** Recipient-bound conversation form reveal. Protected actions require fresh verification; sensitive values never appear in messages or notifications. */
    post: operations["staffChatFormReveal"];
    delete?: never;
    options?: never;
    head?: never;
    patch?: never;
    trace?: never;
  };
  "/api/v1/admin/conversations/{id}/forms/options": {
    parameters: {
      query?: never;
      header?: never;
      path?: never;
      cookie?: never;
    };
    /** Recipient-bound conversation form options. Protected actions require fresh verification; sensitive values never appear in messages or notifications. */
    get: operations["staffChatFormOptions"];
    put?: never;
    post?: never;
    delete?: never;
    options?: never;
    head?: never;
    patch?: never;
    trace?: never;
  };
  "/api/v1/admin/conversations/{id}/forms": {
    parameters: {
      query?: never;
      header?: never;
      path?: never;
      cookie?: never;
    };
    get?: never;
    put?: never;
    /** Recipient-bound conversation form create. Protected actions require fresh verification; sensitive values never appear in messages or notifications. */
    post: operations["staffChatFormCreate"];
    delete?: never;
    options?: never;
    head?: never;
    patch?: never;
    trace?: never;
  };
  "/api/v1/admin/conversations/{id}/forms/{form}/cancel": {
    parameters: {
      query?: never;
      header?: never;
      path?: never;
      cookie?: never;
    };
    get?: never;
    put?: never;
    /** Recipient-bound conversation form cancel. Protected actions require fresh verification; sensitive values never appear in messages or notifications. */
    post: operations["staffChatFormCancel"];
    delete?: never;
    options?: never;
    head?: never;
    patch?: never;
    trace?: never;
  };
  "/api/v1/admin/shop/suppliers": {
    parameters: {
      query?: never;
      header?: never;
      path?: never;
      cookie?: never;
    };
    /** Private supplier catalog management; does not publish products or purchase from suppliers */
    get: operations["getSupplierConnections"];
    put?: never;
    post?: never;
    delete?: never;
    options?: never;
    head?: never;
    patch?: never;
    trace?: never;
  };
  "/api/v1/admin/shop/suppliers/{connection}/library": {
    parameters: {
      query?: never;
      header?: never;
      path?: never;
      cookie?: never;
    };
    /** Private supplier catalog management; does not publish products or purchase from suppliers */
    get: operations["getSupplierLibrary"];
    put?: never;
    post?: never;
    delete?: never;
    options?: never;
    head?: never;
    patch?: never;
    trace?: never;
  };
  "/api/v1/admin/shop/suppliers/{connection}/imports": {
    parameters: {
      query?: never;
      header?: never;
      path?: never;
      cookie?: never;
    };
    get?: never;
    put?: never;
    /** Private supplier catalog management; does not publish products or purchase from suppliers */
    post: operations["createSupplierImport"];
    delete?: never;
    options?: never;
    head?: never;
    patch?: never;
    trace?: never;
  };
  "/api/v1/admin/shop/suppliers/{connection}/markup": {
    parameters: {
      query?: never;
      header?: never;
      path?: never;
      cookie?: never;
    };
    get?: never;
    put?: never;
    /** Private supplier catalog management; does not publish products or purchase from suppliers */
    post: operations["setSupplierMarkup"];
    delete?: never;
    options?: never;
    head?: never;
    patch?: never;
    trace?: never;
  };
  "/api/v1/admin/shop/suppliers/{connection}/prices": {
    parameters: {
      query?: never;
      header?: never;
      path?: never;
      cookie?: never;
    };
    get?: never;
    put?: never;
    /** Private supplier catalog management; does not publish products or purchase from suppliers */
    post: operations["setSupplierOfferPrice"];
    delete?: never;
    options?: never;
    head?: never;
    patch?: never;
    trace?: never;
  };
  "/api/v1/admin/shop/supplier-imports/{id}": {
    parameters: {
      query?: never;
      header?: never;
      path?: never;
      cookie?: never;
    };
    /** Private supplier catalog management; does not publish products or purchase from suppliers */
    get: operations["getSupplierImport"];
    put?: never;
    post?: never;
    delete?: never;
    options?: never;
    head?: never;
    patch?: never;
    trace?: never;
  };
  "/api/v1/admin/shop/supplier-imports/{id}/cancel": {
    parameters: {
      query?: never;
      header?: never;
      path?: never;
      cookie?: never;
    };
    get?: never;
    put?: never;
    /** Private supplier catalog management; does not publish products or purchase from suppliers */
    post: operations["cancelSupplierImport"];
    delete?: never;
    options?: never;
    head?: never;
    patch?: never;
    trace?: never;
  };
  "/api/v1/webhooks/suppliers/nexus-sandbox": {
    parameters: {
      query?: never;
      header?: never;
      path?: never;
      cookie?: never;
    };
    get?: never;
    put?: never;
    /**
     * Configured merchant callback; verified status signals schedule read-only reconciliation
     * @description Registered only for this explicitly configured environment. HMAC-SHA256 covers the exact request bytes using the full Shop token. No callback settles customer payment or creates a supplier purchase. Interactive delivery requests are not acknowledged until their separate workflow is available.
     */
    post: operations["receiveNexusSandboxSignal"];
    delete?: never;
    options?: never;
    head?: never;
    patch?: never;
    trace?: never;
  };
  "/api/v1/webhooks/suppliers/vendoria-test": {
    parameters: {
      query?: never;
      header?: never;
      path?: never;
      cookie?: never;
    };
    get?: never;
    put?: never;
    /**
     * Configured merchant callback; verified status signals schedule read-only reconciliation
     * @description Registered only for this explicitly configured environment. HMAC-SHA256 covers the exact request bytes using the full Shop token. No callback settles customer payment or creates a supplier purchase. Interactive delivery requests are not acknowledged until their separate workflow is available.
     */
    post: operations["receiveVendoriaTestSignal"];
    delete?: never;
    options?: never;
    head?: never;
    patch?: never;
    trace?: never;
  };
  "/api/v1/webhooks/suppliers/nexus-production": {
    parameters: {
      query?: never;
      header?: never;
      path?: never;
      cookie?: never;
    };
    get?: never;
    put?: never;
    /**
     * Configured merchant callback; verified status signals schedule read-only reconciliation
     * @description Registered only for this explicitly configured environment. HMAC-SHA256 covers the exact request bytes using the full Shop token. No callback settles customer payment or creates a supplier purchase. Interactive delivery requests are not acknowledged until their separate workflow is available.
     */
    post: operations["receiveNexusProductionSignal"];
    delete?: never;
    options?: never;
    head?: never;
    patch?: never;
    trace?: never;
  };
  "/api/v1/webhooks/suppliers/vendoria-production": {
    parameters: {
      query?: never;
      header?: never;
      path?: never;
      cookie?: never;
    };
    get?: never;
    put?: never;
    /**
     * Configured merchant callback; verified status signals schedule read-only reconciliation
     * @description Registered only for this explicitly configured environment. HMAC-SHA256 covers the exact request bytes using the full Shop token. No callback settles customer payment or creates a supplier purchase. Interactive delivery requests are not acknowledged until their separate workflow is available.
     */
    post: operations["receiveVendoriaProductionSignal"];
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
      email_verified?: boolean;
      deleted?: boolean;
      /**
       * @description Independent identity namespace; the same email may have a different user in each portal.
       * @enum {string}
       */
      portal: "customer" | "admin" | "booster";
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
      portal: components["schemas"]["AuthPortal"];
    };
    EmailRequest: {
      email?: string;
      account_email?: string;
      /** @enum {string} */
      purpose: "login" | "reauth" | "email_change" | "recovery";
      accept_terms?: boolean;
      /** @description Version presented to the customer; required for consent after an operator publishes legal terms. */
      terms_version?: string;
    };
    EmailChallenge: {
      challenge_id: string;
      message: string;
      retry_after_seconds: number;
      expires_in_seconds: number;
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
      /** @description Version presented to the customer; required for consent after an operator publishes legal terms. */
      terms_version?: string;
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
        portal: components["schemas"]["AuthPortal"];
      }[];
    };
    Users: {
      users: components["schemas"]["User"][];
      next?: string;
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
      next?: string;
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
      intake?: components["schemas"]["CatalogIntakeForm"];
      review_policy?: components["schemas"]["CatalogReviewPolicy"];
      hero_layout?: components["schemas"]["CatalogHeroLayout"];
      discovery?: components["schemas"]["CatalogDiscoveryPolicy"];
    };
    CatalogReference: {
      key: string;
      label: string;
      kind: string;
      options: components["schemas"]["CatalogOption"][] | null;
    };
    CatalogOption: {
      /** @description Stable opaque option value; may equal its label, including spaces, case and Unicode. No control characters or leading/trailing whitespace. Structural field keys keep their separate identifier syntax. */
      key: string;
      label: string;
      units: number;
      /** @description Optional absolute start of a rank interval. Values run from unit_start through unit_start + units - 1. Omission preserves historical zero-based inclusive bounds. */
      unit_start?: number;
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
      delivery_request?: {
        minimum: string;
        maximum: string;
        /** @enum {string} */
        basis: "payment_and_access_v1";
      };
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
        | "attachment"
        | "win_rate"
        | "cosmetics";
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
      /** @enum {string} */
      link_mode?: "single_parent" | "shared_parent";
      links?: {
        parent: string;
        children: string[];
      }[];
    };
    CatalogPackage: {
      key: string;
      name: string;
      description: string;
      service: string;
      variants: components["schemas"]["CatalogVariant"][] | null;
      asset?: string;
      asset_alt?: string;
      asset_source?: string;
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
      preset_answers?: {
        [key: string]: string | boolean | string[];
      };
      excluded_fields?: string[] | null;
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
        [key: string]:
          | string
          | boolean
          | string[]
          | components["schemas"]["CatalogCosmetics"];
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
      intake_enabled?: boolean;
      capabilities: components["schemas"]["CatalogCapabilityPolicy"][];
      hero_layout?: components["schemas"]["CatalogHeroLayout"];
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
        [key: string]:
          | string
          | boolean
          | string[]
          | components["schemas"]["CatalogCosmetics"];
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
        [key: string]:
          | string
          | boolean
          | string[]
          | components["schemas"]["CatalogCosmetics"];
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
        [key: string]:
          | string
          | boolean
          | string[]
          | components["schemas"]["CatalogCosmetics"];
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
      surcharges?: components["schemas"]["CatalogPriceSurcharge"][];
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
        [key: string]:
          | string
          | boolean
          | string[]
          | components["schemas"]["CatalogCosmetics"];
      };
      lines: components["schemas"]["CatalogPriceLine"][] | null;
      issues: components["schemas"]["CatalogIssue"][] | null;
      discount?: components["schemas"]["CouponDiscount"];
    };
    CatalogEstimateInput: {
      release_id: string;
      service: string;
      answers: {
        [key: string]:
          | string
          | boolean
          | string[]
          | components["schemas"]["CatalogCosmetics"];
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
        [key: string]:
          | string
          | boolean
          | string[]
          | components["schemas"]["CatalogCosmetics"];
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
        [key: string]:
          | string
          | boolean
          | string[]
          | components["schemas"]["CatalogCosmetics"];
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
      kind: "custom" | "package" | "account";
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
      accepted_price?: {
        currency: string;
        amount_minor: string;
      };
      unread?: boolean;
      /** @description Internal references included only in authorized administrative lists. */
      staff?: {
        customer_id: string;
        assigned_id: string;
        payment_state: string;
        delivery_state?: string;
      };
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
      delivery_basis?: string;
      account_price?: components["schemas"]["AccountBuyerCommission"];
    };
    OrderQuote: {
      id: string;
      /** @enum {string} */
      state: "issued" | "accepted" | "superseded" | "declined";
      data: components["schemas"]["OrderCommercial"];
    };
    OrderContract: {
      id: string;
      /**
       * @description Payment lifecycle. Fulfillment requires verified provider settlement; pausing checkout cannot grant payment success.
       * @enum {string}
       */
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
        [key: string]:
          | string
          | boolean
          | string[]
          | components["schemas"]["CatalogCosmetics"];
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
      /** @description Optional server preview binding for clients using the review-before-issue flow. Rechecked against current order, terms and discounts at issue. */
      preview_hash?: string;
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
        [key: string]:
          | string
          | boolean
          | string[]
          | components["schemas"]["CatalogCosmetics"];
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
        [key: string]:
          | string
          | boolean
          | string[]
          | components["schemas"]["CatalogCosmetics"];
      };
      issues: components["schemas"]["CatalogIssue"][];
    };
    FavoriteInput: {
      /** @enum {string} */
      kind: "game" | "service" | "package" | "account";
      slug: string;
      service: string;
      /** @description For account favorites, the public account listing ID; otherwise the package key. */
      package: string;
    };
    Favorite: {
      id: string;
      /** @enum {string} */
      kind: "game" | "service" | "package" | "account";
      slug: string;
      service: string;
      /** @description For account favorites, the public account listing ID; otherwise the package key. */
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
      kind: "order" | "presales" | "fulfillment" | "submission";
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
      submission_id?: string;
      /** @description First incoming unread message in this audience sequence; zero when none. Own outgoing messages are excluded without advancing the read marker. */
      first_unread_sequence?: number;
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
      purpose: "message" | "proof" | "form" | "form_reply";
      /** Format: uuid */
      form_id?: string;
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
      conversation_id?: string;
      /** @enum {string} */
      visibility: "public" | "internal";
      checksum: string;
      size: number;
      /** @enum {string} */
      content_type: "image/png" | "image/jpeg" | "image/webp";
      /** @description Customer-only opaque order request UUID (or owned order ID when revising). Never a public object address. */
      intake_key?: string;
    } & (
      | {
          /** Format: uuid */
          conversation_id: string;
        }
      | {
          /** @constant */
          conversation_id?: "";
          /** @constant */
          visibility?: "public";
          /** @description Customer-only opaque order request UUID (or owned order ID when revising). Never a public object address. */
          intake_key: string;
        }
    );
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
      next_session?: components["schemas"]["BoosterAgendaItem"];
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
        [key: string]:
          | string
          | boolean
          | string[]
          | components["schemas"]["CatalogCosmetics"];
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
    CatalogIntakeForm: {
      name: string;
      description: string;
      fields: components["schemas"]["CatalogField"][] | null;
      rules: components["schemas"]["CatalogRule"][] | null;
      summary?: {
        hero_count: string;
        skin_collection: string;
        selling_point: string;
        has_skins: string;
      };
    };
    SubmissionSummary: {
      id: string;
      version: number;
      title: string;
      game: string;
      /** @enum {string} */
      state:
        | "draft"
        | "submitted"
        | "needs_information"
        | "approved_pending_terms"
        | "rejected"
        | "withdrawn"
        | "accepted";
      /** Format: date-time */
      created_at: string;
      /** Format: date-time */
      updated_at: string;
    };
    SubmissionView: {
      submission: components["schemas"]["SubmissionSummary"];
      offer: components["schemas"]["CatalogRelease"];
      answers: {
        [key: string]:
          | string
          | boolean
          | string[]
          | components["schemas"]["CatalogCosmetics"];
      };
      ownership_notes: string;
      ownership_declared: boolean;
      note: string;
      conversation_id: string;
    };
    SubmissionListing: {
      items: components["schemas"]["SubmissionSummary"][];
      next: string;
    };
    SubmissionHistory: {
      events: {
        version: number;
        action: string;
        /** @enum {string} */
        state:
          | "draft"
          | "submitted"
          | "needs_information"
          | "approved_pending_terms"
          | "rejected"
          | "withdrawn"
          | "accepted";
        message: string;
        actor_role: string;
        /** Format: date-time */
        created_at: string;
      }[];
    };
    SubmissionCreate: {
      request_key: string;
      slug: string;
      release_id: string;
      title: string;
    };
    SubmissionEdit: {
      version: number;
      title: string;
      answers: {
        [key: string]:
          | string
          | boolean
          | string[]
          | components["schemas"]["CatalogCosmetics"];
      };
      ownership_notes: string;
      ownership_declared: boolean;
    };
    SubmissionAction: {
      version: number;
      note: string;
    };
    SubmissionProblem: {
      /** @enum {string} */
      code: "submission_invalid" | "submission_conflict";
      issues?: components["schemas"]["CatalogIssue"][];
    };
    CatalogReviewPolicy: {
      content: string;
      fields: components["schemas"]["CatalogField"][] | null;
      rules: components["schemas"]["CatalogRule"][] | null;
    };
    ReviewPolicySnapshot: {
      release_id: string;
      policy: components["schemas"]["CatalogReviewPolicy"];
      references: components["schemas"]["CatalogReference"][];
    };
    PurchaseReviewSummary: {
      id: string;
      order_id: string;
      version: number;
      game: string;
      slug: string;
      /** @enum {string} */
      state: "pending" | "published" | "hidden" | "rejected" | "withdrawn";
      rating: number;
      /** Format: date-time */
      created_at: string;
      /** Format: date-time */
      updated_at: string;
    };
    PurchaseReview: {
      review: components["schemas"]["PurchaseReviewSummary"];
      body: string;
      answers: {
        [key: string]:
          | string
          | boolean
          | string[]
          | components["schemas"]["CatalogCosmetics"];
      };
      policy: components["schemas"]["ReviewPolicySnapshot"];
      response: string;
      reason_code?: string;
      internal_reason?: string;
    };
    OrderReview: {
      order_id: string;
      eligible: boolean;
      policy: components["schemas"]["ReviewPolicySnapshot"] | null;
      review: components["schemas"]["PurchaseReview"] | null;
    };
    ReviewWrite: {
      request_key: string;
      version: number;
      policy_release_id: string;
      rating: number;
      body: string;
      answers: {
        [key: string]:
          | string
          | boolean
          | string[]
          | components["schemas"]["CatalogCosmetics"];
      };
      accept_policy: boolean;
    };
    ReviewAction: {
      version: number;
      policy_checked: boolean;
      reason_code: string;
      note: string;
      response: string;
    };
    ReviewWithdraw: {
      version: number;
    };
    ReviewRevision: {
      version: number;
      action: string;
      /** @enum {string} */
      state: "pending" | "published" | "hidden" | "rejected" | "withdrawn";
      rating: number;
      body: string;
      answers: {
        [key: string]:
          | string
          | boolean
          | string[]
          | components["schemas"]["CatalogCosmetics"];
      };
      policy: components["schemas"]["ReviewPolicySnapshot"];
      response: string;
      actor_role: string;
      /** Format: date-time */
      created_at: string;
      reason_code?: string;
      internal_reason?: string;
    };
    ReviewHistory: {
      revisions: components["schemas"]["ReviewRevision"][];
    };
    ReviewListing: {
      items: components["schemas"]["PurchaseReviewSummary"][];
      next: string;
    };
    ReviewFeedbackAttribute: {
      label: string;
      value: string | boolean | string[];
    };
    PublicPurchaseReview: {
      id: string;
      rating: number;
      body: string;
      feedback: components["schemas"]["ReviewFeedbackAttribute"][];
      response: string;
      policy_content: string;
      /** @enum {string} */
      purchase_status:
        | "verified_purchase"
        | "purchase_status_updated"
        | "fulfillment_status_updated"
        | "refund_recorded"
        | "dispute_in_progress";
      /** Format: date-time */
      published_at: string;
      /** Format: date-time */
      updated_at: string;
    };
    ReviewRatingCount: {
      rating: number;
      count: number;
    };
    ReviewFeed: {
      game: components["schemas"]["CatalogRelease"];
      items: components["schemas"]["PublicPurchaseReview"][];
      next: string;
      count: number;
      rating_sum: number;
      histogram: components["schemas"]["ReviewRatingCount"][];
    };
    ReviewProblem: {
      /** @enum {string} */
      code: "review_invalid" | "review_conflict";
      issues?: components["schemas"]["CatalogIssue"][];
    };
    OperationalJob: {
      id: string;
      kind: string;
      /** @enum {string} */
      state: "pending" | "running" | "failed" | "complete";
      attempts: number;
      max_attempts: number;
      retry_generation: number;
      error_code: string;
      /** Format: date-time */
      created_at: string;
      /** Format: date-time */
      available_at: string;
      /** Format: date-time */
      lease_until: string | null;
      retryable: boolean;
    };
    OperationalJobs: {
      items: components["schemas"]["OperationalJob"][];
      next: string;
    };
    OperationalJobRetry: {
      generation: number;
      reason: string;
    };
    OperationalCard: {
      key: string;
      label: string;
      count: number;
      detail: string;
      href: string;
    };
    OperationalItem: {
      label: string;
      state: string;
      href: string;
      /** Format: date-time */
      at: string;
    };
    OperationalOverview: {
      /** Format: date-time */
      observed_at: string;
      cards: components["schemas"]["OperationalCard"][];
      requests: components["schemas"]["OperationalItem"][];
      sessions: components["schemas"]["OperationalItem"][];
      jobs: components["schemas"]["OperationalJob"][];
      /** Format: date-time */
      oldest_runnable_at: string | null;
    };
    OperationalProblem: {
      /** @enum {string} */
      code: "operations_invalid" | "operations_conflict";
      issues?: components["schemas"]["CatalogIssue"][];
    };
    AvailabilitySubscription: {
      /** Format: uuid */
      id: string;
      version: number;
      /** @enum {string} */
      state: "active" | "unsubscribed" | "suppressed";
      slug: string;
      package: string;
      variant: string;
      label: string;
      available: boolean;
      /** Format: date-time */
      updated_at: string;
      account?: components["schemas"]["AccountAlertCriteria"];
    };
    AvailabilityListing: {
      subscriptions: components["schemas"]["AvailabilitySubscription"][];
      next: string;
    };
    AvailabilitySubscribe: {
      slug: string;
      package: string;
      variant: string;
      /** @constant */
      consent_version: "availability-v1";
      /** @constant */
      accept: true;
      account?: components["schemas"]["AccountAlertCriteria"];
    };
    AvailabilityChange: {
      version: number;
      active: boolean;
      consent_version: string;
      accept: boolean;
    };
    AvailabilityLink: {
      /** Format: uuid */
      id: string;
      version: number;
      token: string;
    };
    AvailabilityLinkView: {
      current: boolean;
    };
    AvailabilityProblem: {
      /** @enum {string} */
      code: "availability_invalid" | "availability_conflict";
      issues?: components["schemas"]["CatalogIssue"][];
    };
    ReportQuery: {
      /** @enum {string} */
      kind:
        | "orders"
        | "catalog"
        | "staff"
        | "audits"
        | "receipts"
        | "refunds"
        | "payouts";
      /** Format: date-time */
      from: string;
      /** Format: date-time */
      to: string;
      state: string;
      search: string;
      after: string;
    };
    ReportColumn: {
      key: string;
      label: string;
    };
    OperationalReport: {
      kind: string;
      basis: string;
      /** Format: date-time */
      observed_at: string;
      query: components["schemas"]["ReportQuery"];
      columns: components["schemas"]["ReportColumn"][];
      rows: string[][];
      next: string;
      count: number;
      digest: string;
    };
    ReportExportInput: {
      query: components["schemas"]["ReportQuery"];
      digest: string;
      reason: string;
    };
    ReportExport: {
      report: components["schemas"]["OperationalReport"];
      audit_id: string;
    };
    ReportProblem: {
      /** @enum {string} */
      code: "report_invalid" | "report_conflict";
      issues?: components["schemas"]["CatalogIssue"][];
    };
    PaymentRoute: {
      code: string;
      label: string;
      network: string;
    };
    PaymentPolicy: {
      label: string;
      text: string;
      currencies: string[];
      routes: components["schemas"]["PaymentRoute"][];
      fee_mode: string;
      rate_mode: string;
      window_minutes: number;
      remedies: components["schemas"]["PaymentRemedies"] | null;
    };
    PublishedPaymentPolicy: {
      id: string;
      data: components["schemas"]["PaymentPolicy"];
    };
    PaymentAttempt: {
      id: string;
      order_id: string;
      state: string;
      issue: string;
      currency: string;
      amount_minor: string;
      route: components["schemas"]["PaymentRoute"];
      policy: components["schemas"]["PublishedPaymentPolicy"];
      checkout_url: string;
      /** Format: date-time */
      created_at: string;
      /** Format: date-time */
      expires_at: string;
      native_checkout: boolean;
      /** @enum {string} */
      instruction_status:
        | "not_applicable"
        | "preparing"
        | "ready"
        | "refreshing"
        | "expired"
        | "review_required"
        | "closed";
      deposit: components["schemas"]["PaymentDeposit"] | null;
    };
    PaymentReceipt: {
      id: string;
      state: string;
      currency: string;
      network: string;
      amount: string;
      allocated_currency: string;
      allocated_minor: string;
      /** Format: date-time */
      created_at: string;
      /** @description Staff-only exact remaining receipt reserve at read time. Absence means unavailable. Creation still rechecks eligibility and reserve transactionally. */
      refundable_amount?: string;
    };
    PaymentHistory: {
      enabled: boolean;
      policy: components["schemas"]["PublishedPaymentPolicy"] | null;
      attempts: components["schemas"]["PaymentAttempt"][];
      receipts: components["schemas"]["PaymentReceipt"][];
      /** Format: date-time */
      server_time: string;
    };
    PaymentSettings: {
      version: number;
      draft: components["schemas"]["PaymentPolicy"];
      published: components["schemas"]["PublishedPaymentPolicy"] | null;
      configured: boolean;
      enabled: boolean;
      /** @description Independent outgoing provider configuration and activation; does not follow checkout pause. */
      outgoing_enabled: boolean;
    };
    PaymentRecord: {
      id: string;
      payment_id: string;
      attempt_id: string;
      state: string;
      issue: string;
      /** Format: date-time */
      checked_at: string;
    };
    FinanceQueue: {
      enabled: boolean;
      next: string;
      attempts: components["schemas"]["FinanceAttempt"][];
      records: components["schemas"]["PaymentRecord"][];
    };
    PaymentStartInput: {
      contract_id: string;
      policy_id: string;
      route: string;
      accept_policy: boolean;
    };
    PaymentPolicyInput: {
      version: number;
      /** @enum {string} */
      action: "save" | "publish";
      data: components["schemas"]["PaymentPolicy"];
    };
    PaymentReconcileInput: {
      payment_id: string;
      reason: string;
    };
    PaymentReconcileResult: {
      queued: boolean;
    };
    PaymentProblem: {
      code: string;
    };
    PaymentRemedies: {
      cancellation: string;
      partial_work: string;
      no_show: string;
      missed_target: string;
      refund_basis: string;
      refund_fees: string;
      dispute_hours: number;
      appeal_hours: number;
      max_appeals: number;
    };
    ServiceCase: {
      id: string;
      order_id: string;
      kind: string;
      state: string;
      outcome: string;
      version: number;
      appeals: number;
      appeal_until: string | null;
      policy: components["schemas"]["PaymentRemedies"] | null;
      /** Format: date-time */
      created_at: string;
      /** Format: date-time */
      updated_at: string;
      account_terms?: components["schemas"]["AccountProduct"] | null;
    };
    ServiceCaseInput: {
      request_key: string;
      kind: string;
      note: string;
      message_id: string;
    };
    ServiceCaseChange: {
      version: number;
      note: string;
      message_id: string;
      outcome: string;
      /** @description Authorized staff only; omitted from customer case events. */
      internal_rationale?: string;
    };
    ServiceCaseEvent: {
      version: number;
      id: string;
      action: string;
      note: string;
      message_id: string;
      /** Format: date-time */
      created_at: string;
      role: string;
      /** @description Authorized staff only; omitted from customer case events. */
      internal_rationale?: string;
    };
    ServiceCaseHistory: {
      cases: components["schemas"]["ServiceCase"][];
    };
    ServiceCaseQueue: {
      cases: components["schemas"]["ServiceCase"][];
      next: string;
    };
    ServiceCaseDetail: {
      case: components["schemas"]["ServiceCase"];
      events: components["schemas"]["ServiceCaseEvent"][];
      next: number;
    };
    RefundRecipient: {
      address: string;
      memo: string;
    };
    RefundTransfer: {
      id: string;
      case_id: string;
      receipt_id: string;
      order_id: string;
      kind: string;
      currency: string;
      network: string;
      amount: string;
      terms: string;
      state: string;
      issue: string;
      version: number;
      recipient: components["schemas"]["RefundRecipient"];
      recipient_at: string | null;
      approved_at: string | null;
      /** Format: date-time */
      created_at: string;
      /** Format: date-time */
      updated_at: string;
      seller_agreement?: components["schemas"]["SellerPaymentAgreement"];
      manual_receipt?: components["schemas"]["ManualPayoutReceipt"];
      manual_recording?: components["schemas"]["ManualPayoutRecording"];
    };
    RefundHistory: {
      transfers: components["schemas"]["RefundTransfer"][];
    };
    RefundProposal: {
      request_key: string;
      receipt_id: string;
      amount: string;
      terms: string;
    };
    RefundRecipientInput: {
      version: number;
      address: string;
      memo: string;
      accept: boolean;
    };
    RefundChange: {
      version: number;
      reason: string;
      code: string;
    };
    FinanceQueued: {
      queued: boolean;
    };
    OutgoingQueue: {
      records: {
        id: string;
        payment_id: string;
        attempt_id: string;
        state: string;
        issue: string;
        checked_at: string;
      }[];
      next: string;
      enabled: boolean;
    };
    SellerTerms: {
      currency: string;
      network: string;
      amount: string;
      proceeds_basis: string;
      fees: string;
      transfer_requirements: string;
      dispute_terms: string;
      withdrawal_terms: string;
      /** @enum {string} */
      model: "consignment" | "buy_first";
      payout_delay_hours: number;
      payout_deadline_hours: number;
      commission?: components["schemas"]["AccountSellerCommission"];
    };
    SellerOffer: {
      id: string;
      submission_id: string;
      state: string;
      version: number;
      terms: components["schemas"]["SellerTerms"];
      /** Format: date-time */
      expires_at: string;
      /** Format: date-time */
      accepted_at: string | null;
      /** Format: date-time */
      control_verified_at: string | null;
      /** Format: date-time */
      created_at: string;
    };
    SellerOffers: {
      offers: components["schemas"]["SellerOffer"][];
    };
    SellerOfferInput: {
      request_key: string;
      submission_version: number;
      terms: components["schemas"]["SellerTerms"];
      /** Format: date-time */
      expires_at: string;
    };
    SellerOfferChange: {
      version: number;
      accept: boolean;
      note: string;
    };
    AccountProduct: {
      title: string;
      description: string;
      region: string;
      rank: string;
      currency: string;
      amount_minor: string;
      sale_terms: string;
      transfer_requirements: string;
      dispute_terms: string;
      acknowledgement_terms: string;
      attributes: {
        label: string;
        value: string;
      }[];
      media_ids: string[];
      dispute_hours: number;
      delivery_min_hours: number;
      delivery_max_hours: number;
      /** @description Explicit reviewed cover; must be a selected media_id for new publication. Omitted in older releases and blank in public projections. */
      cover_media_id?: string;
      commission?: components["schemas"]["AccountBuyerCommission"];
      hero_count?: number;
      selling_point?: string;
      skin_collection?: components["schemas"]["AccountSkinCollection"];
    };
    AccountListing: {
      id: string;
      release_id: string;
      game: string;
      slug: string;
      state: string;
      product: components["schemas"]["AccountProduct"];
      images: string[];
    };
    AccountListings: {
      items: components["schemas"]["AccountListing"][];
      next: string;
    };
    AccountInventoryItem: {
      id: string;
      submission_id: string;
      offer_id: string;
      state: string;
      game: string;
      slug: string;
      release_id: string;
      version: number;
      draft: components["schemas"]["AccountProduct"];
    };
    AccountInventory: {
      items: components["schemas"]["AccountInventoryItem"][];
      next: string;
    };
    AccountListingInput: {
      version: number;
      product: components["schemas"]["AccountProduct"];
      public_reviewed: boolean;
    };
    AccountReserve: {
      request_key: string;
      release_id: string;
      expected_amount: string;
      currency: string;
      terms_version: string;
      accept_terms: boolean;
    };
    AccountSecretInput: {
      version: number;
      request_key: string;
      value: string;
      /** Format: date-time */
      expires_at: string;
    };
    AccountSecret: {
      version: number;
      state: string;
      /** Format: date-time */
      expires_at: string | null;
    };
    AccountSecretReveal: {
      value: string;
    };
    AccountDelivery: {
      order_id: string;
      listing: components["schemas"]["AccountListing"];
      version: number;
      state: string;
      /** @description An active service case currently holds protected delivery access. Contains no private case details. */
      active_case?: boolean;
      instructions: string;
      secret: components["schemas"]["AccountSecret"];
      /** Format: date-time */
      delivered_at: string | null;
      /** Format: date-time */
      acknowledged_at: string | null;
      /** Format: date-time */
      dispute_until: string | null;
      form_id?: string;
      conversation_id?: string;
    };
    AccountDeliveryChange: {
      version: number;
      secret_version: number;
      instructions: string;
      accept: boolean;
    };
    SellerPayoutQueue: {
      items: {
        transfer: components["schemas"]["RefundTransfer"];
        submission_id: string;
        eligible: boolean;
        /** Format: date-time */
        due_at: string | null;
      }[];
      next: string;
      enabled: boolean;
    };
    ResaleProblem: {
      code: string;
    };
    SellerOfferHistory: {
      events: {
        action: string;
        role: string;
        note: string;
        created_at: string;
        version: number;
      }[];
    };
    AccountAlertCriteria: {
      listing_id: string;
      region: string;
      rank: string;
      currency: string;
      max_amount_minor: number;
    };
    SiteContent: {
      /** @enum {string} */
      kind: "home" | "legal" | "retention" | "notifications";
      version: number;
      release_id: string;
      label: string;
      data: {
        [key: string]: unknown;
      };
      /** Format: date-time */
      updated_at: string;
    };
    SiteContentInput: {
      version: number;
      label: string;
      data: {
        [key: string]: unknown;
      };
      publish: boolean;
    };
    SiteHistory: {
      releases: components["schemas"]["SiteContent"][];
      next: string;
    };
    PrivacyRequest: {
      manual_hold: boolean;
      id: string;
      user_id: string;
      version: number;
      /** @enum {string} */
      state:
        | "requested"
        | "held"
        | "reviewed"
        | "erased_pending_files"
        | "completed"
        | "cancelled";
      policy_id: string;
      reviewed_policy_id: string;
      hold_reason: string;
      /** Format: date-time */
      eligible_at: string | null;
      /** Format: date-time */
      created_at: string;
      /** Format: date-time */
      updated_at: string;
    };
    PrivacyRequests: {
      requests: components["schemas"]["PrivacyRequest"][];
      next: string;
    };
    PrivacyRequestInput: {
      policy_id: string;
      accept: boolean;
    };
    PrivacyChange: {
      version: number;
      /** @enum {string} */
      action:
        "review" | "hold" | "release_hold" | "erase" | "finalize" | "cancel";
      reason: string;
      policy_id: string;
    };
    PrivacyExportInput: {
      section: string;
      after: string;
    };
    PrivacyExport: {
      section: string;
      records: {
        [key: string]: unknown;
      }[];
      next: string;
      audit_id: string;
      /** Format: date-time */
      observed_at: string;
    };
    StaffAvailability: {
      subscription: components["schemas"]["AvailabilitySubscription"];
      user_id: string;
      consent_version: string;
      suppression_reason: string;
      delivery_state: string;
      /** Format: date-time */
      last_sent_at: string | null;
    };
    StaffAvailabilityPage: {
      subscriptions: components["schemas"]["StaffAvailability"][];
      next: string;
    };
    StaffMediaFile: {
      id: string;
      user_id: string;
      conversation_id: string;
      state: string;
      bound: boolean;
      size: number;
      content_type: string;
      /** Format: date-time */
      created_at: string;
      /** Format: date-time */
      expires_at: string;
      /** Format: date-time */
      purged_at: string | null;
      /** @description Source order for an intake attachment; empty for conversation uploads. */
      order_id: string;
    };
    StaffMediaPage: {
      files: components["schemas"]["StaffMediaFile"][];
      next: string;
    };
    StaffSuppressAlert: {
      version: number;
    };
    ContentProblem: {
      /** @enum {string} */
      code: "content_invalid" | "content_conflict";
    };
    PrivacyProblem: {
      /** @enum {string} */
      code: "privacy_invalid" | "privacy_conflict";
    };
    AccountSessionSummary: {
      id: string;
      order_id: string;
      /** @enum {string} */
      state: "proposed" | "confirmed";
      /** Format: date-time */
      starts_at: string;
      /** Format: date-time */
      ends_at: string;
      timezone: string;
    };
    AccountOverview: {
      attention: components["schemas"]["OrderSummary"][];
      active: components["schemas"]["OrderSummary"][];
      upcoming: components["schemas"]["AccountSessionSummary"][];
      more_attention: boolean;
      more_active: boolean;
      more_upcoming: boolean;
      more_messages: boolean;
      messages: {
        id: string;
        subject: string;
        unread: number;
      }[];
      progress: {
        order_id: string;
        reported_percent: number;
        /** Format: date-time */
        updated_at: string;
      }[];
    };
    CatalogHeroLayout: {
      desktop_x: number;
      desktop_y: number;
      mobile_x: number;
      mobile_y: number;
      /** @enum {string} */
      copy_side: "left" | "right";
    };
    /**
     * @description Authentication audience; never grants role or resource authority.
     * @enum {string}
     */
    AuthPortal: "customer" | "booster" | "admin";
    PublicMetricPolicy: {
      window_days: number;
      minimum_sample: number;
      maximum_age_seconds: number;
    };
    PublicMetric: {
      /** @enum {string} */
      key: "active_orders" | "completed_orders" | "win_rate";
      label: string;
      definition: string;
      /** @enum {string} */
      state:
        "available" | "unconfigured" | "unavailable" | "insufficient_sample";
      value?: number;
      sample_size?: number;
      /** Format: date-time */
      period_start?: string;
      /** Format: date-time */
      period_end: string;
      /** Format: date-time */
      refreshed_at: string;
      /** Format: date-time */
      stale_at?: string;
    };
    CatalogCapabilityPolicy: {
      /** @enum {string} */
      service: "boost" | "accounts" | "shop" | "news";
      /** @enum {string} */
      state: "off" | "active" | "paused";
      description: string;
      reason: string;
    };
    CatalogPromotion: {
      key: string;
      title: string;
      description: string;
      enabled: boolean;
      /** @enum {string} */
      target: "package" | "account" | "shop" | "news";
      package: string;
      variant: string;
      listing_id: string;
      release_id: string;
      coupon_code: string;
      coupon_version: number;
      /** Format: date-time */
      starts_at: string;
      /** Format: date-time */
      ends_at: string;
      priority: number;
      show_quantity: boolean;
      product_id?: string;
      article_id?: string;
      article_slug?: string;
    };
    CatalogDiscoveryPolicy: {
      capabilities: components["schemas"]["CatalogCapabilityPolicy"][];
      metrics?: components["schemas"]["PublicMetricPolicy"];
      promotions?: components["schemas"]["CatalogPromotion"][];
    };
    CatalogPromotionView:
      | {
          key: string;
          title: string;
          description: string;
          /** @enum {string} */
          service: "boost" | "accounts" | "shop";
          /** @enum {string} */
          target: "package" | "account" | "shop";
          package?: string;
          variant?: string;
          listing_id?: string;
          release_id: string;
          /** @enum {string} */
          currency: "USD" | "EUR" | "GBP";
          amount_minor: string;
          original_minor?: string;
          coupon_code?: string;
          coupon_version?: number;
          /** Format: date-time */
          starts_at: string;
          /** Format: date-time */
          ends_at: string;
          priority: number;
          remaining?: number;
          /** @constant */
          indicative: true;
          product_id?: string;
          quantity?: number;
          article_id?: string;
          article_slug?: string;
        }
      | {
          key: string;
          title: string;
          description: string;
          /** @constant */
          service: "news";
          /** @constant */
          target: "news";
          package?: string;
          variant?: string;
          listing_id?: string;
          release_id: string;
          /** @constant */
          currency: "";
          /** @constant */
          amount_minor: "";
          original_minor?: string;
          coupon_code?: string;
          coupon_version?: number;
          /** Format: date-time */
          starts_at: string;
          /** Format: date-time */
          ends_at: string;
          priority: number;
          remaining?: number;
          /** @constant */
          indicative: false;
          product_id?: string;
          quantity?: number;
          article_id: string;
          article_slug: string;
        };
    CatalogDiscoveryView: {
      game_id: string;
      release_id: string;
      capabilities: components["schemas"]["CatalogCapabilityPolicy"][];
      promotions: components["schemas"]["CatalogPromotionView"][];
      metrics: components["schemas"]["PublicMetric"][];
    };
    PublicMetrics: {
      metrics: components["schemas"]["PublicMetric"][];
    };
    HomeIntroduction: {
      /** @enum {string} */
      kind: "boost" | "accounts" | "shop" | "payment" | "news";
      title: string;
      description: string;
    };
    PolicySection: {
      /** @enum {string} */
      kind:
        | "terms"
        | "privacy"
        | "refunds"
        | "account_sales"
        | "contact"
        | "delivery"
        | "cookies"
        | "complaints";
      title: string;
      text: string;
    };
    ReviewShowcase: {
      items: {
        slug: string;
        game: string;
        review: components["schemas"]["PublicPurchaseReview"];
      }[];
    };
    PaymentDeposit: {
      payment_id: string;
      address: string;
      memo: string;
      amount: string;
      currency: string;
      network: string;
      qr: string;
      /** Format: date-time */
      expires_at: string;
      /** Format: date-time */
      checked_at: string;
      /** Format: date-time */
      valid_until: string;
    };
    BoosterAgendaItem: {
      /** Format: uuid */
      id: string;
      /** Format: uuid */
      order_id: string;
      game: string;
      /** Format: date-time */
      starts_at: string;
      /** Format: date-time */
      ends_at: string;
      timezone: string;
      /** @enum {string} */
      state: "proposed" | "confirmed";
    };
    BoosterAgenda: {
      items: components["schemas"]["BoosterAgendaItem"][];
      next: string;
    };
    FulfillmentReadiness: {
      ready: boolean;
      /** @enum {string} */
      requirement:
        | "ready"
        | "details"
        | "game_access"
        | "confirmed_session"
        | "service_hold"
        | "not_active";
      /** Format: date-time */
      checked_at: string;
    };
    AvailabilitySeriesWindow: {
      /** @enum {string} */
      request_key: "";
      start: components["schemas"]["CalendarLocalTime"];
      end: components["schemas"]["CalendarLocalTime"];
    };
    AvailabilitySeriesInput: {
      /** Format: uuid */
      request_key: string;
      windows: components["schemas"]["AvailabilitySeriesWindow"][];
    };
    AvailabilitySeriesResult: {
      windows: components["schemas"]["AvailabilityWindow"][];
    };
    OrderQuotePreview: {
      data: components["schemas"]["OrderCommercial"];
      preview_hash: string;
      order_version: number;
    };
    AccountMarketGames: {
      games: {
        slug: string;
        name: string;
      }[];
      /** @description After cursor; a filtered empty page may still have another page. */
      next: string;
    };
    IncomingPaymentEvidence: {
      payment_id: string;
      state: string;
      issue: string;
      expected_amount: string;
      received_amount: string;
      currency: string;
      network: string;
      /** Format: date-time */
      checked_at: string | null;
      /** Format: date-time */
      observed_at: string | null;
      reading: boolean;
    };
    FinanceAttempt: {
      id: string;
      order_id: string;
      state: string;
      issue: string;
      currency: string;
      amount_minor: string;
      route: components["schemas"]["PaymentRoute"];
      policy: components["schemas"]["PublishedPaymentPolicy"];
      checkout_url: string;
      /** Format: date-time */
      created_at: string;
      /** Format: date-time */
      expires_at: string;
      native_checkout: boolean;
      /** @enum {string} */
      instruction_status:
        | "not_applicable"
        | "preparing"
        | "ready"
        | "refreshing"
        | "expired"
        | "review_required"
        | "closed";
      deposit: components["schemas"]["PaymentDeposit"] | null;
      evidence: components["schemas"]["IncomingPaymentEvidence"][];
      more_evidence: boolean;
    };
    TransferSnapshot: {
      amount: string;
      currency: string;
      network: string;
      state: string;
      recipient: components["schemas"]["RefundRecipient"];
      manual_receipt?: components["schemas"]["ManualPayoutReceipt"];
    };
    TransferEntry: {
      version: number;
      action: string;
      /** Format: date-time */
      created_at: string;
      snapshot: components["schemas"]["TransferSnapshot"] | null;
    };
    TransferAttemptEvidence: {
      id: string;
      state: string;
      issue: string;
      provider_id: string;
      checked_at: string | null;
      /** Format: date-time */
      created_at: string;
    };
    TransferHistory: {
      events: components["schemas"]["TransferEntry"][];
      next: number;
      attempts: components["schemas"]["TransferAttemptEvidence"][];
      more_attempts: boolean;
    };
    ReconciliationJob: {
      id: string;
      state: string;
      attempts: number;
    };
    ReconciliationReview: {
      direction: string;
      payment_id: string;
      state: string;
      issue: string;
      order_id: string;
      case_id: string;
      transfer_id: string;
      submission_id: string;
      found: boolean;
      reading: boolean;
      checked_at: string | null;
      observed_at: string | null;
      job: components["schemas"]["ReconciliationJob"] | null;
    };
    SellerPaymentAgreement: {
      id: string;
      accepted_at: string | null;
      terms: components["schemas"]["SellerTerms"];
    };
    ShopRecipientField: {
      /** @enum {string} */
      key: "player_id" | "server_id" | "character_name" | "delivery_note";
      label: string;
      help: string;
      required: boolean;
      max_length: number;
    };
    ShopVariant: {
      key: string;
      label: string;
      region: string;
      platform: string;
      server: string;
      currency: string;
      unit_amount_minor: string;
      min_quantity: number;
      max_quantity: number;
      enabled: boolean;
    };
    ShopPolicy: {
      delivery_min_hours: number;
      delivery_max_hours: number;
      reservation_minutes: number;
      delivery_terms: string;
      cancellation_terms: string;
      refund_terms: string;
      fees: string;
      evidence_required: boolean;
      review_enabled: boolean;
      review_terms: string;
    };
    ShopDefinition: {
      title: string;
      description: string;
      category: string;
      asset: string;
      asset_alt: string;
      asset_source: string;
      reviewed: boolean;
      variants: components["schemas"]["ShopVariant"][];
      recipient: components["schemas"]["ShopRecipientField"][];
      policy: components["schemas"]["ShopPolicy"];
    };
    ShopStock: {
      variant_key: string;
      version: number;
      total: number;
      reserved: number;
      committed: number;
      available: number;
    };
    ShopProductDraft: {
      /** Format: uuid */
      id: string;
      /** Format: uuid */
      game_id: string;
      slug: string;
      game: string;
      version: number;
      /** @enum {string} */
      state: "draft" | "published" | "paused" | "archived";
      draft: components["schemas"]["ShopDefinition"];
      current_release: string;
      stocks: components["schemas"]["ShopStock"][];
      /** Format: date-time */
      updated_at: string;
    };
    ShopProductSummary: {
      /** Format: uuid */
      id: string;
      /** Format: uuid */
      game_id: string;
      game: string;
      slug: string;
      title: string;
      version: number;
      state: string;
      /** Format: date-time */
      updated_at: string;
    };
    ShopProducts: {
      items: components["schemas"]["ShopProductSummary"][];
      next: string;
    };
    ShopCreate: {
      /** Format: uuid */
      game_id: string;
      definition: components["schemas"]["ShopDefinition"];
    };
    ShopSave: {
      version: number;
      definition: components["schemas"]["ShopDefinition"];
    };
    ShopChange: {
      version: number;
    };
    ShopStockChange: {
      version: number;
      stock_version: number;
      variant_key: string;
      total: number;
      reason: string;
    };
    ShopRelease: {
      /** Format: uuid */
      id: string;
      /** Format: uuid */
      product_id: string;
      version: number;
      definition: components["schemas"]["ShopDefinition"];
      /** Format: date-time */
      created_at: string;
    };
    ShopReleaseHistory: {
      items: components["schemas"]["ShopRelease"][];
      next: number;
    };
    ShopValidationIssue: {
      path: string;
      message: string;
    };
    ShopPreview: {
      draft: components["schemas"]["ShopProductDraft"];
      issues: components["schemas"]["ShopValidationIssue"][];
    };
    ShopProblem: {
      code: string;
      issues?: components["schemas"]["ShopValidationIssue"][];
    };
    ShopPublicProduct: {
      id: string;
      game_id: string;
      game_slug: string;
      release_id: string;
      version: number;
      definition: components["schemas"]["ShopDefinition"];
      available: {
        [key: string]: number;
      };
    };
    ShopPublicPage: {
      items: components["schemas"]["ShopPublicProduct"][];
      next: string;
    };
    ShopPurchase: {
      product_id: string;
      release_id: string;
      product: components["schemas"]["ShopDefinition"];
      variant: components["schemas"]["ShopVariant"];
      quantity: number;
      amount_minor: string;
    };
    ShopDelivery: {
      order_state: string;
      order_id: string;
      order_version: number;
      version: number;
      state: string;
      assigned_id?: string;
      note: string;
      proof_message_id: string;
      /** Format: date-time */
      updated_at: string;
      recipient_provided: boolean;
      purchase: components["schemas"]["ShopPurchase"];
    };
    ShopRecipient: {
      order_id: string;
      version: number;
      values: {
        [key: string]: string;
      };
    };
    ShopReserve: {
      request_key: string;
      release_id: string;
      variant: string;
      quantity: number;
      expected_amount: string;
      /** @enum {string} */
      currency: "USD" | "EUR" | "GBP";
      recipient: {
        [key: string]: string;
      };
      accept_terms: boolean;
      terms_version: string;
    };
    ShopDeliveryChange: {
      version: number;
      order_version: number;
      note: string;
      proof_message_id?: string;
    };
    ShopRecipientAccess: Record<string, never>;
    ArticleBlock: {
      /** @enum {string} */
      kind:
        | "paragraph"
        | "heading"
        | "quote"
        | "code"
        | "link"
        | "image"
        | "list"
        | "table"
        | "gallery";
      text: string;
      level: number;
      url: string;
      alt: string;
      source: string;
      items: string[] | null;
      headers: string[] | null;
      rows: string[][] | null;
      images?: {
        url: string;
        alt: string;
        source: string;
        caption: string;
      }[];
    };
    ArticleDefinition: {
      title: string;
      slug: string;
      summary: string;
      author: string;
      source: string;
      source_url: string;
      game_version: string;
      asset: string;
      asset_alt: string;
      asset_source: string;
      /** @enum {string} */
      kind: "update" | "patch" | "guide";
      reviewed: boolean;
      blocks: components["schemas"]["ArticleBlock"][];
    };
    ArticleDraft: {
      id: string;
      game_id: string;
      revision_id: string;
      current_revision: string;
      scheduled_revision: string;
      /** @enum {string} */
      state: "draft" | "scheduled" | "published" | "unpublished" | "archived";
      version: number;
      /** Format: date-time */
      scheduled_at: string | null;
      /** Format: date-time */
      published_at: string | null;
      /** Format: date-time */
      updated_at: string;
      definition: components["schemas"]["ArticleDefinition"];
      game_name: string;
      schedule_state: string;
    };
    ArticleSummary: {
      id: string;
      game_id: string;
      title: string;
      kind: string;
      author: string;
      state: string;
      version: number;
      /** Format: date-time */
      updated_at: string;
      /** Format: date-time */
      scheduled_at: string | null;
      game_name: string;
    };
    Articles: {
      items: components["schemas"]["ArticleSummary"][];
      next: string;
    };
    ArticlePublic: {
      id: string;
      game_slug: string;
      revision_id: string;
      definition: components["schemas"]["ArticleDefinition"];
      /** Format: date-time */
      published_at: string;
      /** Format: date-time */
      updated_at: string;
      redirect: boolean;
    };
    ArticlePublicPage: {
      items: components["schemas"]["ArticlePublic"][];
      next: string;
    };
    ArticleIssue: {
      path: string;
      message: string;
    };
    ArticlePreview: {
      definition: components["schemas"]["ArticleDefinition"];
      issues: components["schemas"]["ArticleIssue"][];
    };
    ArticleHistory: {
      items: {
        version: number;
        action: string;
        revision_id: string;
        /** Format: date-time */
        at: string;
      }[];
      next: number;
    };
    ArticleCreate: {
      game_id: string;
      definition: components["schemas"]["ArticleDefinition"];
    };
    ArticleSave: {
      version: number;
      definition: components["schemas"]["ArticleDefinition"];
    };
    ArticleChange: {
      version: number;
      revision_id?: string;
      at?: string;
    };
    ArticleProblem: {
      code: string;
      issues?: components["schemas"]["ArticleIssue"][];
    };
    ArticleSitemap: {
      items: {
        slug: string;
        /** Format: date-time */
        updated_at: string;
      }[];
    };
    OperationalJobAttempt: {
      generation: number;
      number: number;
      /** @enum {string} */
      outcome:
        | "running"
        | "complete"
        | "handler_failed"
        | "lease_expired"
        | "unavailable";
      /** Format: date-time */
      started_at: string;
      /** Format: date-time */
      finished_at: string | null;
    };
    OperationalJobAttempts: {
      items: components["schemas"]["OperationalJobAttempt"][];
      next: string;
    };
    ArtworkVariant: {
      width: number;
      height: number;
      size: number;
      /** @enum {string} */
      content_type: "image/jpeg" | "image/png";
      checksum: string;
    };
    Artwork: {
      /** Format: uuid */
      id: string;
      /** @description Canonical upload reference. Public bytes require a current publication; admin preview uses its separate endpoint. */
      asset: string;
      /** @enum {string} */
      purpose: "game" | "cover" | "product" | "inline";
      width: number;
      height: number;
      focus_x: number;
      focus_y: number;
      variants: {
        [key: string]: components["schemas"]["ArtworkVariant"];
      };
    };
    ArtworkProblem: {
      /** @enum {string} */
      code: "artwork_invalid" | "artwork_conflict" | "artwork_rejected";
    };
    StaffInvitation: {
      email: string;
      /** @enum {string} */
      portal: "admin" | "booster";
      /** @enum {string} */
      role: "administrator" | "booster";
      display_name?: string;
    };
    CatalogEstimatePreviewInput: {
      release_id: string;
      service: string;
      answers: {
        [key: string]:
          | string
          | boolean
          | string[]
          | components["schemas"]["CatalogCosmetics"];
      };
      /** @description Optional unsaved working configuration. Admin-only, validated without storing or publishing; the saved revision must still match. */
      configuration?: components["schemas"]["CatalogConfiguration"];
    };
    CatalogCosmetics: {
      groups: {
        category: string;
        count: string;
        names: string[];
      }[];
    };
    AccountBuyerCommission: {
      /** @enum {string} */
      version: "account_commission_v1";
      base_minor: string;
      fee_minor: string;
      total_minor: string;
    };
    AccountSellerCommission: {
      /** @enum {string} */
      version: "account_commission_v1";
      base_minor: string;
      fee_minor: string;
      net_minor: string;
      rate: string;
      rate_source: string;
      /** Format: date-time */
      quoted_at: string;
      net_amount: string;
    };
    AccountAgreementDefaults: {
      seller_consignment: components["schemas"]["SellerTerms"];
      seller_buy_first: components["schemas"]["SellerTerms"];
      buyer: components["schemas"]["AccountProduct"];
      shop: {
        [key: string]: string;
      };
      review_policy: string;
      boost_terms: string;
    };
    ManualPayoutReceipt: {
      id: string;
      transaction_hash: string;
      /** Format: date-time */
      completed_at: string;
      /** Format: date-time */
      recorded_at: string;
    };
    ManualPayoutRecording: {
      available: boolean;
      reason: string;
      /**
       * Format: date-time
       * @description Earliest eligibility check time when the current hold is only the accepted inspection or payout delay. Omitted when another prerequisite remains; eligibility is rechecked before recording a payout.
       */
      eligible_after?: string;
    };
    ManualPayoutInput: {
      /** Format: uuid */
      request_key: string;
      version: number;
      amount: string;
      currency: string;
      /** @enum {string} */
      network: "bsc" | "eth" | "trx" | "sol";
      recipient: components["schemas"]["RefundRecipient"];
      transaction_hash: string;
      /** Format: date-time */
      completed_at: string;
      reason: string;
      /** @enum {boolean} */
      confirm: true;
    };
    SellingProgress: {
      submission_state: string;
      offer_state: string;
      offer_id: string;
      arrangement: string;
      listing_id: string;
      listing_state: string;
      payout_state: string;
      blockers: string[];
      handover: {
        state: string;
        locked: boolean;
        /** Format: date-time */
        received_at: string | null;
      };
    };
    ChatFormField: {
      key: string;
      label: string;
      /** @enum {string} */
      kind: "text" | "multiline" | "select";
      required: boolean;
      secure: boolean;
      options?: string[];
    };
    ChatFormCreate: {
      /** Format: uuid */
      request_key: string;
      /** @enum {string} */
      mode: "request" | "share";
      /** @enum {string} */
      purpose: "information" | "game_access" | "seller_access" | "buyer_access";
      /** @enum {string} */
      recipient: "customer" | "booster";
      share_with_booster?: boolean;
      title: string;
      description?: string;
      fields: components["schemas"]["ChatFormField"][];
      answers?: {
        [key: string]: string;
      };
      /** Format: date-time */
      expires_at: string;
    };
    ChatFormReply: {
      version: number;
      /** Format: uuid */
      request_key: string;
      answers: {
        [key: string]: string;
      };
    };
    ChatFormCancel: {
      version: number;
    };
    ChatForm: {
      id: string;
      title: string;
      description: string;
      mode: string;
      purpose: string;
      recipient: string;
      audience: string;
      state: string;
      version: number;
      fields: components["schemas"]["ChatFormField"][];
      answers: {
        [key: string]: string;
      };
      has_secure: boolean;
      can_respond: boolean;
      can_reveal: boolean;
      can_cancel: boolean;
      /** Format: date-time */
      expires_at: string;
      /** Format: date-time */
      answered_at: string | null;
    };
    ChatFormOptions: {
      open: boolean;
      booster: boolean;
      purposes: {
        key: string;
        label: string;
        modes: string[];
        max_hours: number;
      }[];
    };
    ChatFormLegacy: {
      links: {
        label: string;
        path: string;
      }[];
    };
    ChatFormSecret: {
      /** @description Encrypted answers are revealed only after current access and fresh verification checks; plaintext is never cached. */
      value: string;
    };
    EmptyCommand: Record<string, never>;
    AccountSkinCollection: {
      groups: {
        category: string;
        count: string;
        names: string[];
      }[];
    };
    CatalogPriceSurcharge: {
      key: string;
      label: string;
      /** @enum {string} */
      kind: "percentage" | "selection_count";
      value: string;
      field: string;
      rates: {
        count: number;
        percent: string;
      }[];
      when?: components["schemas"]["CatalogCondition"];
    };
    SupplierConnection: {
      /** @enum {string} */
      id:
        | "nexus-sandbox"
        | "nexus-production"
        | "vendoria-test"
        | "vendoria-production";
      testing: boolean;
      configured: boolean;
      version: number;
      markup_bps: number;
      current_import: string;
      active_import: string;
      purchases_enabled: boolean;
    };
    SupplierConnections: {
      items: components["schemas"]["SupplierConnection"][];
    };
    SupplierImport: {
      id: string;
      /** @enum {string} */
      connection:
        | "nexus-sandbox"
        | "nexus-production"
        | "vendoria-test"
        | "vendoria-production";
      /** @enum {string} */
      state: "queued" | "loading" | "complete" | "failed" | "cancelled";
      product_count: number;
      offer_count: number;
      issue: string;
      /** Format: date-time */
      updated_at: string;
    };
    SupplierPriceInput: {
      /** Format: uuid */
      import_id: string;
      version: number;
      markup_bps: number | null;
      override_minor: string;
      game_id: string;
      region: string;
      /** @enum {string} */
      delivery_method: "" | "id" | "account" | "code";
    };
    SupplierPricing: {
      version: number;
      markup_bps: number | null;
      effective_markup_bps: number;
      override_minor: string;
      cost_usd: string;
      preview_quantity: string;
      preview_amount_minor: string;
      game_id: string;
      region: string;
      delivery_method: string;
      shop_product_id: string;
      issues: string[];
    };
    SupplierOffer: {
      id: string;
      name: string;
      available: boolean;
      suggested_delivery: string;
      fields: {
        id: string;
        label: string;
        kind: string;
        required: boolean;
        secret: boolean;
        transient: boolean;
        min: string | null;
        max: string | null;
        step: string | null;
        options: {
          id: string;
          label: string;
        }[];
      }[];
      quantity: {
        kind: string;
        min: string;
        max: string;
        step: string;
      };
      pricing: components["schemas"]["SupplierPricing"];
      instruction: string;
      code_request: boolean;
      google_prompt: boolean;
      game_exit: boolean;
    };
    SupplierProduct: {
      id: string;
      game_id: string;
      category_id: string;
      name: string;
      icon: string;
      description: string;
      kind: string;
      platform: string;
      instruction_available: boolean;
      region: {
        global: boolean;
        regions: string[] | null;
        countries: string[] | null;
        excluded_countries: string[] | null;
        policy_kind: string;
        policy_countries: string[] | null;
      };
      review_issues: string[];
      offers: components["schemas"]["SupplierOffer"][];
    };
    SupplierLibrary: {
      connection: components["schemas"]["SupplierConnection"];
      import: components["schemas"]["SupplierImport"] | null;
      games: {
        id: string;
        name: string;
        icon: string;
        closed: boolean;
      }[];
      categories: {
        id: string;
        game_id: string;
        name: string;
      }[];
      items: components["schemas"]["SupplierProduct"][];
      next: string;
    };
    SupplierProblem: {
      code: string;
    };
    SupplierImportRequest: {
      /** Format: uuid */
      request_id: string;
    };
    SupplierMarkupInput: {
      version: number;
      markup_bps: number;
    };
    SupplierOfferSettings: {
      product_id: string;
      offer_id: string;
      settings: components["schemas"]["SupplierPriceInput"];
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
        /** @description Select this endpoint’s portal; defaults to customer. Exactly one matching portal cookie is used. Conversation/media membership, staff route projection and MFA still apply; booster conversation listing/creation is not allowed. */
        "X-Playora-Portal"?: components["schemas"]["AuthPortal"];
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
      header?: {
        /** @description Select this endpoint’s portal; defaults to customer. Exactly one matching portal cookie is used. Conversation/media membership, staff route projection and MFA still apply; booster conversation listing/creation is not allowed. */
        "X-Playora-Portal"?: components["schemas"]["AuthPortal"];
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
        /** @description Select this endpoint’s portal; defaults to customer. Exactly one matching portal cookie is used. Conversation/media membership, staff route projection and MFA still apply; booster conversation listing/creation is not allowed. */
        "X-Playora-Portal"?: components["schemas"]["AuthPortal"];
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
      header?: {
        /** @description Select this endpoint’s portal; defaults to customer. Exactly one matching portal cookie is used. Conversation/media membership, staff route projection and MFA still apply; booster conversation listing/creation is not allowed. */
        "X-Playora-Portal"?: components["schemas"]["AuthPortal"];
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
      query?: {
        after?: string;
        search?: string;
        state?: string;
        role?: "" | "customer" | "booster" | "administrator" | "owner";
        portal_filter?: "" | "customer" | "admin" | "booster";
      };
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
      query?: {
        actor?: string;
        action?: string;
        target?: string;
        from?: string;
        to?: string;
        after?: string;
      };
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
        search?: string;
        state?: string;
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
        "application/json": components["schemas"]["CatalogEstimatePreviewInput"];
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
        game?: string;
        kind?: string;
        customer?: string;
        assigned?: string;
        from?: string;
        to?: string;
        delivery?:
          "processing" | "held" | "submitted" | "completed" | "cancelled";
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
        /** @description Opaque audience-specific updated-time/reference boundary from next. Legacy owned UUID cursors remain accepted. */
        after?: string;
        state?: string;
        assigned?: string;
        order_id?: string;
        /** @description Search subject or exact full conversation/order/submission reference; never message bodies. */
        search?: string;
        /** @description Filter by conversation audience type before pagination. */
        kind?: "" | "order" | "presales" | "submission" | "fulfillment";
        /** @description Unread for the authenticated user and current portal audience only. */
        unread?: "" | "true" | "false";
      };
      header?: {
        /** @description Select this endpoint’s portal; defaults to customer. Exactly one matching portal cookie is used. Conversation/media membership, staff route projection and MFA still apply; booster conversation listing/creation is not allowed. */
        "X-Playora-Portal"?: components["schemas"]["AuthPortal"];
      };
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
        /** @description Select this endpoint’s portal; defaults to customer. Exactly one matching portal cookie is used. Conversation/media membership, staff route projection and MFA still apply; booster conversation listing/creation is not allowed. */
        "X-Playora-Portal"?: components["schemas"]["AuthPortal"];
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
      header?: {
        /** @description Select this endpoint’s portal; defaults to customer. Exactly one matching portal cookie is used. Conversation/media membership, staff route projection and MFA still apply; booster conversation listing/creation is not allowed. */
        "X-Playora-Portal"?: components["schemas"]["AuthPortal"];
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
      header?: {
        /** @description Select this endpoint’s portal; defaults to customer. Exactly one matching portal cookie is used. Conversation/media membership, staff route projection and MFA still apply; booster conversation listing/creation is not allowed. */
        "X-Playora-Portal"?: components["schemas"]["AuthPortal"];
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
        /** @description Select this endpoint’s portal; defaults to customer. Exactly one matching portal cookie is used. Conversation/media membership, staff route projection and MFA still apply; booster conversation listing/creation is not allowed. */
        "X-Playora-Portal"?: components["schemas"]["AuthPortal"];
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
        /** @description Select this endpoint’s portal; defaults to customer. Exactly one matching portal cookie is used. Conversation/media membership, staff route projection and MFA still apply; booster conversation listing/creation is not allowed. */
        "X-Playora-Portal"?: components["schemas"]["AuthPortal"];
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
        /** @description Native EventSource/download audience selection. Must agree with any header; never an authentication credential. */
        portal?: components["schemas"]["AuthPortal"];
      };
      header?: {
        "Last-Event-ID"?: string;
        /** @description Select this endpoint’s portal; defaults to customer. Exactly one matching portal cookie is used. Conversation/media membership, staff route projection and MFA still apply; booster conversation listing/creation is not allowed. */
        "X-Playora-Portal"?: components["schemas"]["AuthPortal"];
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
        /** @description Opaque audience-specific updated-time/reference boundary from next. Legacy owned UUID cursors remain accepted. */
        after?: string;
        state?: string;
        assigned?: string;
        order_id?: string;
        customer?: string;
        /** @description Search subject or exact full conversation/order/submission reference; never message bodies. */
        search?: string;
        /** @description Filter by conversation audience type before pagination. */
        kind?: "" | "order" | "presales" | "submission" | "fulfillment";
        /** @description Unread for the authenticated user and current portal audience only. */
        unread?: "" | "true" | "false";
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
      header?: {
        /** @description Select this endpoint’s portal; defaults to customer. Exactly one matching portal cookie is used. Conversation/media membership, staff route projection and MFA still apply; booster conversation listing/creation is not allowed. */
        "X-Playora-Portal"?: components["schemas"]["AuthPortal"];
      };
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
        /** @description Select this endpoint’s portal; defaults to customer. Exactly one matching portal cookie is used. Conversation/media membership, staff route projection and MFA still apply; booster conversation listing/creation is not allowed. */
        "X-Playora-Portal"?: components["schemas"]["AuthPortal"];
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
        /** @description Select this endpoint’s portal; defaults to customer. Exactly one matching portal cookie is used. Conversation/media membership, staff route projection and MFA still apply; booster conversation listing/creation is not allowed. */
        "X-Playora-Portal"?: components["schemas"]["AuthPortal"];
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
      header?: {
        /** @description Select this endpoint’s portal; defaults to customer. Exactly one matching portal cookie is used. Conversation/media membership, staff route projection and MFA still apply; booster conversation listing/creation is not allowed. */
        "X-Playora-Portal"?: components["schemas"]["AuthPortal"];
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
  customerUploadMedia: {
    parameters: {
      query?: never;
      header: {
        "X-CSRF-Token": string;
        Origin: string;
        /** @description Select this endpoint’s portal; defaults to customer. Exactly one matching portal cookie is used. Conversation/media membership, staff route projection and MFA still apply; booster conversation listing/creation is not allowed. */
        "X-Playora-Portal"?: components["schemas"]["AuthPortal"];
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
        /** @description Select this endpoint’s portal; defaults to customer. Exactly one matching portal cookie is used. Conversation/media membership, staff route projection and MFA still apply; booster conversation listing/creation is not allowed. */
        "X-Playora-Portal"?: components["schemas"]["AuthPortal"];
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
        /** @description Select this endpoint’s portal; defaults to customer. Exactly one matching portal cookie is used. Conversation/media membership, staff route projection and MFA still apply; booster conversation listing/creation is not allowed. */
        "X-Playora-Portal"?: components["schemas"]["AuthPortal"];
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
        /** @description Native EventSource/download audience selection. Must agree with any header; never an authentication credential. */
        portal?: components["schemas"]["AuthPortal"];
      };
      header?: {
        /** @description Select this endpoint’s portal; defaults to customer. Exactly one matching portal cookie is used. Conversation/media membership, staff route projection and MFA still apply; booster conversation listing/creation is not allowed. */
        "X-Playora-Portal"?: components["schemas"]["AuthPortal"];
      };
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
        /** @description Select this endpoint’s portal; defaults to customer. Exactly one matching portal cookie is used. Conversation/media membership, staff route projection and MFA still apply; booster conversation listing/creation is not allowed. */
        "X-Playora-Portal"?: components["schemas"]["AuthPortal"];
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
        /** @description Select this endpoint’s portal; defaults to customer. Exactly one matching portal cookie is used. Conversation/media membership, staff route projection and MFA still apply; booster conversation listing/creation is not allowed. */
        "X-Playora-Portal"?: components["schemas"]["AuthPortal"];
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
  getStaffMediaDirectory: {
    parameters: {
      query?: {
        after?: string;
        customer?: string;
        state?: string;
      };
      header?: never;
      path?: never;
      cookie?: never;
    };
    requestBody?: never;
    responses: {
      /** @description Successful bounded operation */
      200: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          "application/json": components["schemas"]["StaffMediaPage"];
        };
      };
      /** @description Reload current revision, resolve holds or correct validation. */
      409: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          "application/json": components["schemas"]["MediaProblem"];
        };
      };
      /** @description Reload current revision, resolve holds or correct validation. */
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
        /** @description Literal game name or full assigned order reference, filtered before pagination. */
        search?: string;
        state?:
          | ""
          | "active"
          | "queued"
          | "in_progress"
          | "on_hold"
          | "review"
          | "completed";
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
        /** @description Literal game name or full assigned order reference, filtered before pagination. */
        search?: string;
        state?:
          | ""
          | "active"
          | "queued"
          | "in_progress"
          | "on_hold"
          | "review"
          | "completed";
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
  sellerSubmissionget: {
    parameters: {
      query?: {
        after?: string;
        state?:
          | "draft"
          | "submitted"
          | "needs_information"
          | "approved_pending_terms"
          | "rejected"
          | "withdrawn";
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
          "application/json": components["schemas"]["SubmissionListing"];
        };
      };
      /** @description Reload changed state or correct validation issues. */
      409: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          "application/json": components["schemas"]["SubmissionProblem"];
        };
      };
      /** @description Reload changed state or correct validation issues. */
      422: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          "application/json": components["schemas"]["SubmissionProblem"];
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
  sellerSubmissionpost: {
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
        "application/json": components["schemas"]["SubmissionCreate"];
      };
    };
    responses: {
      /** @description Successful private order response */
      200: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          "application/json": components["schemas"]["SubmissionView"];
        };
      };
      /** @description Reload changed state or correct validation issues. */
      409: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          "application/json": components["schemas"]["SubmissionProblem"];
        };
      };
      /** @description Reload changed state or correct validation issues. */
      422: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          "application/json": components["schemas"]["SubmissionProblem"];
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
  sellerSubmissionget_id: {
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
          "application/json": components["schemas"]["SubmissionView"];
        };
      };
      /** @description Reload changed state or correct validation issues. */
      409: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          "application/json": components["schemas"]["SubmissionProblem"];
        };
      };
      /** @description Reload changed state or correct validation issues. */
      422: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          "application/json": components["schemas"]["SubmissionProblem"];
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
  sellerSubmissionget_id_history: {
    parameters: {
      query?: {
        after?: number;
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
          "application/json": components["schemas"]["SubmissionHistory"];
        };
      };
      /** @description Reload changed state or correct validation issues. */
      409: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          "application/json": components["schemas"]["SubmissionProblem"];
        };
      };
      /** @description Reload changed state or correct validation issues. */
      422: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          "application/json": components["schemas"]["SubmissionProblem"];
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
  sellerSubmissionpost_id_submit: {
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
        "application/json": components["schemas"]["SubmissionAction"];
      };
    };
    responses: {
      /** @description Successful private order response */
      200: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          "application/json": components["schemas"]["SubmissionView"];
        };
      };
      /** @description Reload changed state or correct validation issues. */
      409: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          "application/json": components["schemas"]["SubmissionProblem"];
        };
      };
      /** @description Reload changed state or correct validation issues. */
      422: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          "application/json": components["schemas"]["SubmissionProblem"];
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
  sellerSubmissionpost_id_withdraw: {
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
        "application/json": components["schemas"]["SubmissionAction"];
      };
    };
    responses: {
      /** @description Successful private order response */
      200: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          "application/json": components["schemas"]["SubmissionView"];
        };
      };
      /** @description Reload changed state or correct validation issues. */
      409: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          "application/json": components["schemas"]["SubmissionProblem"];
        };
      };
      /** @description Reload changed state or correct validation issues. */
      422: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          "application/json": components["schemas"]["SubmissionProblem"];
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
  sellerSubmissionpost_id_edit: {
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
        "application/json": components["schemas"]["SubmissionEdit"];
      };
    };
    responses: {
      /** @description Successful private order response */
      200: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          "application/json": components["schemas"]["SubmissionView"];
        };
      };
      /** @description Reload changed state or correct validation issues. */
      409: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          "application/json": components["schemas"]["SubmissionProblem"];
        };
      };
      /** @description Reload changed state or correct validation issues. */
      422: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          "application/json": components["schemas"]["SubmissionProblem"];
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
  adminSubmissionget: {
    parameters: {
      query?: {
        after?: string;
        state?:
          | "draft"
          | "submitted"
          | "needs_information"
          | "approved_pending_terms"
          | "rejected"
          | "withdrawn";
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
          "application/json": components["schemas"]["SubmissionListing"];
        };
      };
      /** @description Reload changed state or correct validation issues. */
      409: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          "application/json": components["schemas"]["SubmissionProblem"];
        };
      };
      /** @description Reload changed state or correct validation issues. */
      422: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          "application/json": components["schemas"]["SubmissionProblem"];
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
  adminSubmissionget_id: {
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
          "application/json": components["schemas"]["SubmissionView"];
        };
      };
      /** @description Reload changed state or correct validation issues. */
      409: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          "application/json": components["schemas"]["SubmissionProblem"];
        };
      };
      /** @description Reload changed state or correct validation issues. */
      422: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          "application/json": components["schemas"]["SubmissionProblem"];
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
  adminSubmissionget_id_history: {
    parameters: {
      query?: {
        after?: number;
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
          "application/json": components["schemas"]["SubmissionHistory"];
        };
      };
      /** @description Reload changed state or correct validation issues. */
      409: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          "application/json": components["schemas"]["SubmissionProblem"];
        };
      };
      /** @description Reload changed state or correct validation issues. */
      422: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          "application/json": components["schemas"]["SubmissionProblem"];
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
  adminSubmissionpost_id_clarify: {
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
        "application/json": components["schemas"]["SubmissionAction"];
      };
    };
    responses: {
      /** @description Successful private order response */
      200: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          "application/json": components["schemas"]["SubmissionView"];
        };
      };
      /** @description Reload changed state or correct validation issues. */
      409: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          "application/json": components["schemas"]["SubmissionProblem"];
        };
      };
      /** @description Reload changed state or correct validation issues. */
      422: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          "application/json": components["schemas"]["SubmissionProblem"];
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
  adminSubmissionpost_id_reject: {
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
        "application/json": components["schemas"]["SubmissionAction"];
      };
    };
    responses: {
      /** @description Successful private order response */
      200: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          "application/json": components["schemas"]["SubmissionView"];
        };
      };
      /** @description Reload changed state or correct validation issues. */
      409: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          "application/json": components["schemas"]["SubmissionProblem"];
        };
      };
      /** @description Reload changed state or correct validation issues. */
      422: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          "application/json": components["schemas"]["SubmissionProblem"];
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
  adminSubmissionpost_id_approve_review: {
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
        "application/json": components["schemas"]["SubmissionAction"];
      };
    };
    responses: {
      /** @description Successful private order response */
      200: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          "application/json": components["schemas"]["SubmissionView"];
        };
      };
      /** @description Reload changed state or correct validation issues. */
      409: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          "application/json": components["schemas"]["SubmissionProblem"];
        };
      };
      /** @description Reload changed state or correct validation issues. */
      422: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          "application/json": components["schemas"]["SubmissionProblem"];
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
  reviewgetApiV1OrdersIdReview: {
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
      /** @description Validated review response; public representations omit private identities and moderation notes. */
      200: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          "application/json": components["schemas"]["OrderReview"];
        };
      };
      /** @description Refresh changed review or correct input. */
      409: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          "application/json": components["schemas"]["ReviewProblem"];
        };
      };
      /** @description Refresh changed review or correct input. */
      422: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          "application/json": components["schemas"]["ReviewProblem"];
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
  reviewpostApiV1OrdersIdReview: {
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
        "application/json": components["schemas"]["ReviewWrite"];
      };
    };
    responses: {
      /** @description Validated review response; public representations omit private identities and moderation notes. */
      200: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          "application/json": components["schemas"]["PurchaseReview"];
        };
      };
      /** @description Refresh changed review or correct input. */
      409: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          "application/json": components["schemas"]["ReviewProblem"];
        };
      };
      /** @description Refresh changed review or correct input. */
      422: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          "application/json": components["schemas"]["ReviewProblem"];
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
  reviewpostApiV1OrdersIdReviewWithdraw: {
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
        "application/json": components["schemas"]["ReviewWithdraw"];
      };
    };
    responses: {
      /** @description Validated review response; public representations omit private identities and moderation notes. */
      200: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          "application/json": components["schemas"]["PurchaseReview"];
        };
      };
      /** @description Refresh changed review or correct input. */
      409: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          "application/json": components["schemas"]["ReviewProblem"];
        };
      };
      /** @description Refresh changed review or correct input. */
      422: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          "application/json": components["schemas"]["ReviewProblem"];
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
  reviewgetApiV1Reviews: {
    parameters: {
      query?: {
        after?: string;
        state?: string;
      };
      header?: never;
      path?: never;
      cookie?: never;
    };
    requestBody?: never;
    responses: {
      /** @description Validated review response; public representations omit private identities and moderation notes. */
      200: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          "application/json": components["schemas"]["ReviewListing"];
        };
      };
      /** @description Refresh changed review or correct input. */
      409: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          "application/json": components["schemas"]["ReviewProblem"];
        };
      };
      /** @description Refresh changed review or correct input. */
      422: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          "application/json": components["schemas"]["ReviewProblem"];
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
  reviewgetApiV1ReviewsId: {
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
      /** @description Validated review response; public representations omit private identities and moderation notes. */
      200: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          "application/json": components["schemas"]["PurchaseReview"];
        };
      };
      /** @description Refresh changed review or correct input. */
      409: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          "application/json": components["schemas"]["ReviewProblem"];
        };
      };
      /** @description Refresh changed review or correct input. */
      422: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          "application/json": components["schemas"]["ReviewProblem"];
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
  reviewgetApiV1ReviewsIdHistory: {
    parameters: {
      query?: {
        after?: number;
      };
      header?: never;
      path: {
        id: string;
      };
      cookie?: never;
    };
    requestBody?: never;
    responses: {
      /** @description Validated review response; public representations omit private identities and moderation notes. */
      200: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          "application/json": components["schemas"]["ReviewHistory"];
        };
      };
      /** @description Refresh changed review or correct input. */
      409: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          "application/json": components["schemas"]["ReviewProblem"];
        };
      };
      /** @description Refresh changed review or correct input. */
      422: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          "application/json": components["schemas"]["ReviewProblem"];
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
  reviewgetApiV1AdminReviews: {
    parameters: {
      query?: {
        after?: string;
        state?: string;
      };
      header?: never;
      path?: never;
      cookie?: never;
    };
    requestBody?: never;
    responses: {
      /** @description Validated review response; public representations omit private identities and moderation notes. */
      200: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          "application/json": components["schemas"]["ReviewListing"];
        };
      };
      /** @description Refresh changed review or correct input. */
      409: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          "application/json": components["schemas"]["ReviewProblem"];
        };
      };
      /** @description Refresh changed review or correct input. */
      422: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          "application/json": components["schemas"]["ReviewProblem"];
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
  reviewgetApiV1AdminReviewsId: {
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
      /** @description Validated review response; public representations omit private identities and moderation notes. */
      200: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          "application/json": components["schemas"]["PurchaseReview"];
        };
      };
      /** @description Refresh changed review or correct input. */
      409: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          "application/json": components["schemas"]["ReviewProblem"];
        };
      };
      /** @description Refresh changed review or correct input. */
      422: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          "application/json": components["schemas"]["ReviewProblem"];
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
  reviewgetApiV1AdminReviewsIdHistory: {
    parameters: {
      query?: {
        after?: number;
      };
      header?: never;
      path: {
        id: string;
      };
      cookie?: never;
    };
    requestBody?: never;
    responses: {
      /** @description Validated review response; public representations omit private identities and moderation notes. */
      200: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          "application/json": components["schemas"]["ReviewHistory"];
        };
      };
      /** @description Refresh changed review or correct input. */
      409: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          "application/json": components["schemas"]["ReviewProblem"];
        };
      };
      /** @description Refresh changed review or correct input. */
      422: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          "application/json": components["schemas"]["ReviewProblem"];
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
  reviewpostApiV1AdminReviewsIdPublish: {
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
        "application/json": components["schemas"]["ReviewAction"];
      };
    };
    responses: {
      /** @description Validated review response; public representations omit private identities and moderation notes. */
      200: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          "application/json": components["schemas"]["PurchaseReview"];
        };
      };
      /** @description Refresh changed review or correct input. */
      409: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          "application/json": components["schemas"]["ReviewProblem"];
        };
      };
      /** @description Refresh changed review or correct input. */
      422: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          "application/json": components["schemas"]["ReviewProblem"];
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
  reviewpostApiV1AdminReviewsIdHide: {
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
        "application/json": components["schemas"]["ReviewAction"];
      };
    };
    responses: {
      /** @description Validated review response; public representations omit private identities and moderation notes. */
      200: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          "application/json": components["schemas"]["PurchaseReview"];
        };
      };
      /** @description Refresh changed review or correct input. */
      409: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          "application/json": components["schemas"]["ReviewProblem"];
        };
      };
      /** @description Refresh changed review or correct input. */
      422: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          "application/json": components["schemas"]["ReviewProblem"];
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
  reviewpostApiV1AdminReviewsIdReject: {
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
        "application/json": components["schemas"]["ReviewAction"];
      };
    };
    responses: {
      /** @description Validated review response; public representations omit private identities and moderation notes. */
      200: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          "application/json": components["schemas"]["PurchaseReview"];
        };
      };
      /** @description Refresh changed review or correct input. */
      409: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          "application/json": components["schemas"]["ReviewProblem"];
        };
      };
      /** @description Refresh changed review or correct input. */
      422: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          "application/json": components["schemas"]["ReviewProblem"];
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
  reviewpostApiV1AdminReviewsIdRespond: {
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
        "application/json": components["schemas"]["ReviewAction"];
      };
    };
    responses: {
      /** @description Validated review response; public representations omit private identities and moderation notes. */
      200: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          "application/json": components["schemas"]["PurchaseReview"];
        };
      };
      /** @description Refresh changed review or correct input. */
      409: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          "application/json": components["schemas"]["ReviewProblem"];
        };
      };
      /** @description Refresh changed review or correct input. */
      422: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          "application/json": components["schemas"]["ReviewProblem"];
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
  reviewgetApiV1ReviewsGamesSlug: {
    parameters: {
      query?: {
        service?: string;
        package?: string;
        after?: string;
      };
      header?: never;
      path: {
        slug: string;
      };
      cookie?: never;
    };
    requestBody?: never;
    responses: {
      /** @description Validated review response; public representations omit private identities and moderation notes. */
      200: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          "application/json": components["schemas"]["ReviewFeed"];
        };
      };
      /** @description Refresh changed review or correct input. */
      409: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          "application/json": components["schemas"]["ReviewProblem"];
        };
      };
      /** @description Refresh changed review or correct input. */
      422: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          "application/json": components["schemas"]["ReviewProblem"];
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
  getAdminOperations: {
    parameters: {
      query?: never;
      header?: never;
      path?: never;
      cookie?: never;
    };
    requestBody?: never;
    responses: {
      /** @description Narrow authenticated operational result; job payloads and secrets are excluded */
      200: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          "application/json": components["schemas"]["OperationalOverview"];
        };
      };
      /** @description Refresh observed state or correct the request */
      409: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          "application/json": components["schemas"]["OperationalProblem"];
        };
      };
      /** @description Refresh observed state or correct the request */
      422: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          "application/json": components["schemas"]["OperationalProblem"];
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
  listAdminJobs: {
    parameters: {
      query?: {
        state?: string;
        kind?: string;
        after?: string;
      };
      header?: never;
      path?: never;
      cookie?: never;
    };
    requestBody?: never;
    responses: {
      /** @description Narrow authenticated operational result; job payloads and secrets are excluded */
      200: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          "application/json": components["schemas"]["OperationalJobs"];
        };
      };
      /** @description Refresh observed state or correct the request */
      409: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          "application/json": components["schemas"]["OperationalProblem"];
        };
      };
      /** @description Refresh observed state or correct the request */
      422: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          "application/json": components["schemas"]["OperationalProblem"];
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
  retryAdminJob: {
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
        "application/json": components["schemas"]["OperationalJobRetry"];
      };
    };
    responses: {
      /** @description Narrow authenticated operational result; job payloads and secrets are excluded */
      200: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          "application/json": components["schemas"]["OperationalJob"];
        };
      };
      /** @description Refresh observed state or correct the request */
      409: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          "application/json": components["schemas"]["OperationalProblem"];
        };
      };
      /** @description Refresh observed state or correct the request */
      422: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          "application/json": components["schemas"]["OperationalProblem"];
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
  listAvailabilitySubscriptions: {
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
      /** @description Current consent result without recipient address or token disclosure */
      200: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          "application/json": components["schemas"]["AvailabilityListing"];
        };
      };
      /** @description Invalid input or stale consent/offering; reload before retrying */
      409: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          "application/json": components["schemas"]["AvailabilityProblem"];
        };
      };
      /** @description Invalid input or stale consent/offering; reload before retrying */
      422: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          "application/json": components["schemas"]["AvailabilityProblem"];
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
  subscribeAvailability: {
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
        "application/json": components["schemas"]["AvailabilitySubscribe"];
      };
    };
    responses: {
      /** @description Current consent result without recipient address or token disclosure */
      200: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          "application/json": components["schemas"]["AvailabilitySubscription"];
        };
      };
      /** @description Invalid input or stale consent/offering; reload before retrying */
      409: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          "application/json": components["schemas"]["AvailabilityProblem"];
        };
      };
      /** @description Invalid input or stale consent/offering; reload before retrying */
      422: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          "application/json": components["schemas"]["AvailabilityProblem"];
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
  changeAvailabilitySubscription: {
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
        "application/json": components["schemas"]["AvailabilityChange"];
      };
    };
    responses: {
      /** @description Current consent result without recipient address or token disclosure */
      200: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          "application/json": components["schemas"]["AvailabilitySubscription"];
        };
      };
      /** @description Invalid input or stale consent/offering; reload before retrying */
      409: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          "application/json": components["schemas"]["AvailabilityProblem"];
        };
      };
      /** @description Invalid input or stale consent/offering; reload before retrying */
      422: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          "application/json": components["schemas"]["AvailabilityProblem"];
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
  inspectAvailabilityLink: {
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
        "application/json": components["schemas"]["AvailabilityLink"];
      };
    };
    responses: {
      /** @description Current consent result without recipient address or token disclosure */
      200: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          "application/json": components["schemas"]["AvailabilityLinkView"];
        };
      };
      /** @description Invalid input or stale consent/offering; reload before retrying */
      409: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          "application/json": components["schemas"]["AvailabilityProblem"];
        };
      };
      /** @description Invalid input or stale consent/offering; reload before retrying */
      422: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          "application/json": components["schemas"]["AvailabilityProblem"];
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
  confirmAvailabilityUnsubscribe: {
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
        "application/json": components["schemas"]["AvailabilityLink"];
      };
    };
    responses: {
      /** @description Current consent result without recipient address or token disclosure */
      200: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          "application/json": components["schemas"]["AvailabilityLinkView"];
        };
      };
      /** @description Invalid input or stale consent/offering; reload before retrying */
      409: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          "application/json": components["schemas"]["AvailabilityProblem"];
        };
      };
      /** @description Invalid input or stale consent/offering; reload before retrying */
      422: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          "application/json": components["schemas"]["AvailabilityProblem"];
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
  previewOperationalReport: {
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
        "application/json": components["schemas"]["ReportQuery"];
      };
    };
    responses: {
      /** @description Bounded operational or financial report with explicit date/recognition basis; no private provider secrets, cross-currency totals or inferred exchange rates. */
      200: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          "application/json": components["schemas"]["OperationalReport"];
        };
      };
      /** @description Refresh changed preview or correct bounded query/reason */
      409: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          "application/json": components["schemas"]["ReportProblem"];
        };
      };
      /** @description Refresh changed preview or correct bounded query/reason */
      422: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          "application/json": components["schemas"]["ReportProblem"];
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
  exportOperationalReport: {
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
        "application/json": components["schemas"]["ReportExportInput"];
      };
    };
    responses: {
      /** @description Bounded operational or financial report with explicit date/recognition basis; no private provider secrets, cross-currency totals or inferred exchange rates. */
      200: {
        headers: {
          /** @description Fixed report attachment filename */
          "Content-Disposition"?: string;
          [name: string]: unknown;
        };
        content: {
          "application/json": components["schemas"]["ReportExport"];
        };
      };
      /** @description Refresh changed preview or correct bounded query/reason */
      409: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          "application/json": components["schemas"]["ReportProblem"];
        };
      };
      /** @description Refresh changed preview or correct bounded query/reason */
      422: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          "application/json": components["schemas"]["ReportProblem"];
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
  customerPaymentHistory: {
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
      /** @description Private payment result */
      200: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          "application/json": components["schemas"]["PaymentHistory"];
        };
      };
      /** @description Authentication, authorization or payment validation rejected */
      default: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          "application/json": components["schemas"]["PaymentProblem"];
        };
      };
    };
  };
  adminPaymentHistory: {
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
      /** @description Private payment result */
      200: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          "application/json": components["schemas"]["PaymentHistory"];
        };
      };
      /** @description Authentication, authorization or payment validation rejected */
      default: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          "application/json": components["schemas"]["PaymentProblem"];
        };
      };
    };
  };
  startCheckout: {
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
        "application/json": components["schemas"]["PaymentStartInput"];
      };
    };
    responses: {
      /** @description Private payment result */
      200: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          "application/json": components["schemas"]["PaymentAttempt"];
        };
      };
      /** @description Authentication, authorization or payment validation rejected */
      default: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          "application/json": components["schemas"]["PaymentProblem"];
        };
      };
    };
  };
  financeQueue: {
    parameters: {
      query?: {
        after?: string;
        filter?: string;
      };
      header?: never;
      path?: never;
      cookie?: never;
    };
    requestBody?: never;
    responses: {
      /** @description Private payment result */
      200: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          "application/json": components["schemas"]["FinanceQueue"];
        };
      };
      /** @description Authentication, authorization or payment validation rejected */
      default: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          "application/json": components["schemas"]["PaymentProblem"];
        };
      };
    };
  };
  paymentSettings: {
    parameters: {
      query?: never;
      header?: never;
      path?: never;
      cookie?: never;
    };
    requestBody?: never;
    responses: {
      /** @description Private payment result */
      200: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          "application/json": components["schemas"]["PaymentSettings"];
        };
      };
      /** @description Authentication, authorization or payment validation rejected */
      default: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          "application/json": components["schemas"]["PaymentProblem"];
        };
      };
    };
  };
  updatePaymentPolicy: {
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
        "application/json": components["schemas"]["PaymentPolicyInput"];
      };
    };
    responses: {
      /** @description Private payment result */
      200: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          "application/json": components["schemas"]["PaymentSettings"];
        };
      };
      /** @description Authentication, authorization or payment validation rejected */
      default: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          "application/json": components["schemas"]["PaymentProblem"];
        };
      };
    };
  };
  requestPaymentReconciliation: {
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
        "application/json": components["schemas"]["PaymentReconcileInput"];
      };
    };
    responses: {
      /** @description Private payment result */
      200: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          "application/json": components["schemas"]["PaymentReconcileResult"];
        };
      };
      /** @description Authentication, authorization or payment validation rejected */
      default: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          "application/json": components["schemas"]["PaymentProblem"];
        };
      };
    };
  };
  receivePaymentSignal: {
    parameters: {
      query?: never;
      header: {
        "X-Nowpayments-Sig": string;
      };
      path?: never;
      cookie?: never;
    };
    requestBody: {
      content: {
        "application/json": {
          [key: string]: unknown;
        };
      };
    };
    responses: {
      /** @description Verified callback and reconciliation job persisted atomically */
      204: {
        headers: {
          [name: string]: unknown;
        };
        content?: never;
      };
      /** @description Invalid signature or payload */
      400: {
        headers: {
          [name: string]: unknown;
        };
        content?: never;
      };
      /** @description Inbox unavailable; callback must be retried */
      503: {
        headers: {
          [name: string]: unknown;
        };
        content?: never;
      };
    };
  };
  getApiV1OrdersIdCases: {
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
      /** @description Private payment result */
      200: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          "application/json": components["schemas"]["ServiceCaseHistory"];
        };
      };
      /** @description Authentication, authorization or payment validation rejected */
      default: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          "application/json": components["schemas"]["PaymentProblem"];
        };
      };
    };
  };
  postApiV1OrdersIdCases: {
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
        "application/json": components["schemas"]["ServiceCaseInput"];
      };
    };
    responses: {
      /** @description Private payment result */
      200: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          "application/json": components["schemas"]["ServiceCase"];
        };
      };
      /** @description Authentication, authorization or payment validation rejected */
      default: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          "application/json": components["schemas"]["PaymentProblem"];
        };
      };
    };
  };
  getApiV1CasesId: {
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
      /** @description Private payment result */
      200: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          "application/json": components["schemas"]["ServiceCaseDetail"];
        };
      };
      /** @description Authentication, authorization or payment validation rejected */
      default: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          "application/json": components["schemas"]["PaymentProblem"];
        };
      };
    };
  };
  postApiV1CasesIdAction: {
    parameters: {
      query?: never;
      header: {
        "X-CSRF-Token": string;
      };
      path: {
        id: string;
        action: string;
      };
      cookie?: never;
    };
    requestBody: {
      content: {
        "application/json": components["schemas"]["ServiceCaseChange"];
      };
    };
    responses: {
      /** @description Private payment result */
      200: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          "application/json": components["schemas"]["ServiceCase"];
        };
      };
      /** @description Authentication, authorization or payment validation rejected */
      default: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          "application/json": components["schemas"]["PaymentProblem"];
        };
      };
    };
  };
  getApiV1OrdersIdRefunds: {
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
      /** @description Private payment result */
      200: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          "application/json": components["schemas"]["RefundHistory"];
        };
      };
      /** @description Authentication, authorization or payment validation rejected */
      default: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          "application/json": components["schemas"]["PaymentProblem"];
        };
      };
    };
  };
  getApiV1AdminOrdersIdCases: {
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
      /** @description Private payment result */
      200: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          "application/json": components["schemas"]["ServiceCaseHistory"];
        };
      };
      /** @description Authentication, authorization or payment validation rejected */
      default: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          "application/json": components["schemas"]["PaymentProblem"];
        };
      };
    };
  };
  postApiV1AdminOrdersIdCases: {
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
        "application/json": components["schemas"]["ServiceCaseInput"];
      };
    };
    responses: {
      /** @description Private payment result */
      200: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          "application/json": components["schemas"]["ServiceCase"];
        };
      };
      /** @description Authentication, authorization or payment validation rejected */
      default: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          "application/json": components["schemas"]["PaymentProblem"];
        };
      };
    };
  };
  getApiV1AdminCasesId: {
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
      /** @description Private payment result */
      200: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          "application/json": components["schemas"]["ServiceCaseDetail"];
        };
      };
      /** @description Authentication, authorization or payment validation rejected */
      default: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          "application/json": components["schemas"]["PaymentProblem"];
        };
      };
    };
  };
  postApiV1AdminCasesIdAction: {
    parameters: {
      query?: never;
      header: {
        "X-CSRF-Token": string;
      };
      path: {
        id: string;
        action: string;
      };
      cookie?: never;
    };
    requestBody: {
      content: {
        "application/json": components["schemas"]["ServiceCaseChange"];
      };
    };
    responses: {
      /** @description Private payment result */
      200: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          "application/json": components["schemas"]["ServiceCase"];
        };
      };
      /** @description Authentication, authorization or payment validation rejected */
      default: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          "application/json": components["schemas"]["PaymentProblem"];
        };
      };
    };
  };
  getApiV1AdminOrdersIdRefunds: {
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
      /** @description Private payment result */
      200: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          "application/json": components["schemas"]["RefundHistory"];
        };
      };
      /** @description Authentication, authorization or payment validation rejected */
      default: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          "application/json": components["schemas"]["PaymentProblem"];
        };
      };
    };
  };
  getApiV1AdminCases: {
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
      /** @description Private payment result */
      200: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          "application/json": components["schemas"]["ServiceCaseQueue"];
        };
      };
      /** @description Authentication, authorization or payment validation rejected */
      default: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          "application/json": components["schemas"]["PaymentProblem"];
        };
      };
    };
  };
  postApiV1AdminCasesIdRefunds: {
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
        "application/json": components["schemas"]["RefundProposal"];
      };
    };
    responses: {
      /** @description Private payment result */
      200: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          "application/json": components["schemas"]["RefundTransfer"];
        };
      };
      /** @description Authentication, authorization or payment validation rejected */
      default: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          "application/json": components["schemas"]["PaymentProblem"];
        };
      };
    };
  };
  postApiV1RefundsIdRecipient: {
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
        "application/json": components["schemas"]["RefundRecipientInput"];
      };
    };
    responses: {
      /** @description Private payment result */
      200: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          "application/json": components["schemas"]["RefundTransfer"];
        };
      };
      /** @description Authentication, authorization or payment validation rejected */
      default: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          "application/json": components["schemas"]["PaymentProblem"];
        };
      };
    };
  };
  postApiV1AdminRefundsIdApprove: {
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
        "application/json": components["schemas"]["RefundChange"];
      };
    };
    responses: {
      /** @description Private payment result */
      200: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          "application/json": components["schemas"]["RefundTransfer"];
        };
      };
      /** @description Authentication, authorization or payment validation rejected */
      default: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          "application/json": components["schemas"]["PaymentProblem"];
        };
      };
    };
  };
  postApiV1AdminRefundsIdCancel: {
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
        "application/json": components["schemas"]["RefundChange"];
      };
    };
    responses: {
      /** @description Private payment result */
      200: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          "application/json": components["schemas"]["RefundTransfer"];
        };
      };
      /** @description Authentication, authorization or payment validation rejected */
      default: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          "application/json": components["schemas"]["PaymentProblem"];
        };
      };
    };
  };
  postApiV1AdminRefundsIdVerify: {
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
        "application/json": components["schemas"]["RefundChange"];
      };
    };
    responses: {
      /** @description Private payment result */
      200: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          "application/json": components["schemas"]["FinanceQueued"];
        };
      };
      /** @description Authentication, authorization or payment validation rejected */
      default: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          "application/json": components["schemas"]["PaymentProblem"];
        };
      };
    };
  };
  postApiV1AdminFinanceOutgoingReconcile: {
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
        "application/json": components["schemas"]["PaymentReconcileInput"];
      };
    };
    responses: {
      /** @description Private payment result */
      200: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          "application/json": components["schemas"]["FinanceQueued"];
        };
      };
      /** @description Authentication, authorization or payment validation rejected */
      default: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          "application/json": components["schemas"]["PaymentProblem"];
        };
      };
    };
  };
  getOutgoingExceptions: {
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
      /** @description Private payment result */
      200: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          "application/json": components["schemas"]["OutgoingQueue"];
        };
      };
      /** @description Authentication, authorization or payment validation rejected */
      default: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          "application/json": components["schemas"]["PaymentProblem"];
        };
      };
    };
  };
  getResaleApiV1Accounts: {
    parameters: {
      query?: {
        after?: string;
        slug?: string;
        region?: string;
        rank?: string;
        search?: string;
        /** @description Exact catalog currency. Required for a maximum price or price sorting; no currency conversion is applied. */
        currency?: string;
        /** @description Inclusive maximum listing price in exact minor units of currency. Requires currency. */
        max_minor?: string;
        /** @description Stable public ordering with an opaque filter-bound cursor. Omission preserves legacy ID ordering. */
        sort?: "newest" | "price_asc" | "price_desc";
      };
      header?: never;
      path?: never;
      cookie?: never;
    };
    requestBody?: never;
    responses: {
      /** @description Validated account commerce projection */
      200: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          "application/json": components["schemas"]["AccountListings"];
        };
      };
      /** @description Authorization, stale revision, inventory or financial evidence rejection */
      default: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          "application/json": components["schemas"]["ResaleProblem"];
        };
      };
    };
  };
  getResaleApiV1AccountsId: {
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
      /** @description Validated account commerce projection */
      200: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          "application/json": components["schemas"]["AccountListing"];
        };
      };
      /** @description Authorization, stale revision, inventory or financial evidence rejection */
      default: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          "application/json": components["schemas"]["ResaleProblem"];
        };
      };
    };
  };
  postResaleApiV1AccountsIdReserve: {
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
        "application/json": components["schemas"]["AccountReserve"];
      };
    };
    responses: {
      /** @description Validated account commerce projection */
      200: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          "application/json": components["schemas"]["OrderDetail"];
        };
      };
      /** @description Authorization, stale revision, inventory or financial evidence rejection */
      default: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          "application/json": components["schemas"]["ResaleProblem"];
        };
      };
    };
  };
  getResaleApiV1SubmissionsIdOffers: {
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
      /** @description Validated account commerce projection */
      200: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          "application/json": components["schemas"]["SellerOffers"];
        };
      };
      /** @description Authorization, stale revision, inventory or financial evidence rejection */
      default: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          "application/json": components["schemas"]["ResaleProblem"];
        };
      };
    };
  };
  getResaleApiV1SubmissionsIdPayouts: {
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
      /** @description Validated account commerce projection */
      200: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          "application/json": components["schemas"]["RefundHistory"];
        };
      };
      /** @description Authorization, stale revision, inventory or financial evidence rejection */
      default: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          "application/json": components["schemas"]["ResaleProblem"];
        };
      };
    };
  };
  postResaleApiV1SellerOffersIdAction: {
    parameters: {
      query?: never;
      header: {
        "X-CSRF-Token": string;
      };
      path: {
        id: string;
        action: "accept" | "decline";
      };
      cookie?: never;
    };
    requestBody: {
      content: {
        "application/json": components["schemas"]["SellerOfferChange"];
      };
    };
    responses: {
      /** @description Validated account commerce projection */
      200: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          "application/json": components["schemas"]["SellerOffer"];
        };
      };
      /** @description Authorization, stale revision, inventory or financial evidence rejection */
      default: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          "application/json": components["schemas"]["ResaleProblem"];
        };
      };
    };
  };
  getResaleApiV1AccountOrdersIdDelivery: {
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
      /** @description Validated account commerce projection */
      200: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          "application/json": components["schemas"]["AccountDelivery"];
        };
      };
      /** @description Authorization, stale revision, inventory or financial evidence rejection */
      default: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          "application/json": components["schemas"]["ResaleProblem"];
        };
      };
    };
  };
  postResaleApiV1AccountOrdersIdDeliveryAction: {
    parameters: {
      query?: never;
      header: {
        "X-CSRF-Token": string;
      };
      path: {
        id: string;
        action: "acknowledge";
      };
      cookie?: never;
    };
    requestBody: {
      content: {
        "application/json": components["schemas"]["AccountDeliveryChange"];
      };
    };
    responses: {
      /** @description Validated account commerce projection */
      200: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          "application/json": components["schemas"]["AccountDelivery"];
        };
      };
      /** @description Authorization, stale revision, inventory or financial evidence rejection */
      default: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          "application/json": components["schemas"]["ResaleProblem"];
        };
      };
    };
  };
  getResaleApiV1AdminSubmissionsIdOffers: {
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
      /** @description Validated account commerce projection */
      200: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          "application/json": components["schemas"]["SellerOffers"];
        };
      };
      /** @description Authorization, stale revision, inventory or financial evidence rejection */
      default: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          "application/json": components["schemas"]["ResaleProblem"];
        };
      };
    };
  };
  postResaleApiV1AdminSubmissionsIdOffers: {
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
        "application/json": components["schemas"]["SellerOfferInput"];
      };
    };
    responses: {
      /** @description Validated account commerce projection */
      200: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          "application/json": components["schemas"]["SellerOffer"];
        };
      };
      /** @description Authorization, stale revision, inventory or financial evidence rejection */
      default: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          "application/json": components["schemas"]["ResaleProblem"];
        };
      };
    };
  };
  getResaleApiV1AdminSubmissionsIdPayouts: {
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
      /** @description Validated account commerce projection */
      200: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          "application/json": components["schemas"]["RefundHistory"];
        };
      };
      /** @description Authorization, stale revision, inventory or financial evidence rejection */
      default: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          "application/json": components["schemas"]["ResaleProblem"];
        };
      };
    };
  };
  postResaleApiV1AdminSellerOffersIdAction: {
    parameters: {
      query?: never;
      header: {
        "X-CSRF-Token": string;
      };
      path: {
        id: string;
        action: "withdraw";
      };
      cookie?: never;
    };
    requestBody: {
      content: {
        "application/json": components["schemas"]["SellerOfferChange"];
      };
    };
    responses: {
      /** @description Validated account commerce projection */
      200: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          "application/json": components["schemas"]["SellerOffer"];
        };
      };
      /** @description Authorization, stale revision, inventory or financial evidence rejection */
      default: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          "application/json": components["schemas"]["ResaleProblem"];
        };
      };
    };
  };
  getResaleApiV1AdminAccountOrdersIdDelivery: {
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
      /** @description Validated account commerce projection */
      200: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          "application/json": components["schemas"]["AccountDelivery"];
        };
      };
      /** @description Authorization, stale revision, inventory or financial evidence rejection */
      default: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          "application/json": components["schemas"]["ResaleProblem"];
        };
      };
    };
  };
  postResaleApiV1AdminAccountOrdersIdDeliveryAction: {
    parameters: {
      query?: never;
      header: {
        "X-CSRF-Token": string;
      };
      path: {
        id: string;
        action: "deliver" | "takeover";
      };
      cookie?: never;
    };
    requestBody: {
      content: {
        "application/json": components["schemas"]["AccountDeliveryChange"];
      };
    };
    responses: {
      /** @description Validated account commerce projection */
      200: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          "application/json": components["schemas"]["AccountDelivery"];
        };
      };
      /** @description Authorization, stale revision, inventory or financial evidence rejection */
      default: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          "application/json": components["schemas"]["ResaleProblem"];
        };
      };
    };
  };
  getResaleApiV1SellerOffersIdSecret: {
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
      /** @description Validated account commerce projection */
      200: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          "application/json": components["schemas"]["AccountSecret"];
        };
      };
      /** @description Authorization, stale revision, inventory or financial evidence rejection */
      default: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          "application/json": components["schemas"]["ResaleProblem"];
        };
      };
    };
  };
  postResaleApiV1SellerOffersIdSecret: {
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
        "application/json": components["schemas"]["AccountSecretInput"];
      };
    };
    responses: {
      /** @description Validated account commerce projection */
      200: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          "application/json": components["schemas"]["AccountSecret"];
        };
      };
      /** @description Authorization, stale revision, inventory or financial evidence rejection */
      default: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          "application/json": components["schemas"]["ResaleProblem"];
        };
      };
    };
  };
  postResaleApiV1AdminSellerOffersIdSecretReveal: {
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
        "application/json": components["schemas"]["FulfillmentEmpty"];
      };
    };
    responses: {
      /** @description Validated account commerce projection */
      200: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          "application/json": components["schemas"]["AccountSecretReveal"];
        };
      };
      /** @description Authorization, stale revision, inventory or financial evidence rejection */
      default: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          "application/json": components["schemas"]["ResaleProblem"];
        };
      };
    };
  };
  postResaleApiV1AdminAccountOrdersIdSecret: {
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
        "application/json": components["schemas"]["AccountSecretInput"];
      };
    };
    responses: {
      /** @description Validated account commerce projection */
      200: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          "application/json": components["schemas"]["AccountSecret"];
        };
      };
      /** @description Authorization, stale revision, inventory or financial evidence rejection */
      default: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          "application/json": components["schemas"]["ResaleProblem"];
        };
      };
    };
  };
  postResaleApiV1AccountOrdersIdSecretReveal: {
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
        "application/json": components["schemas"]["FulfillmentEmpty"];
      };
    };
    responses: {
      /** @description Validated account commerce projection */
      200: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          "application/json": components["schemas"]["AccountSecretReveal"];
        };
      };
      /** @description Authorization, stale revision, inventory or financial evidence rejection */
      default: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          "application/json": components["schemas"]["ResaleProblem"];
        };
      };
    };
  };
  postResaleApiV1AdminSellerOffersIdListing: {
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
        "application/json": components["schemas"]["FulfillmentEmpty"];
      };
    };
    responses: {
      /** @description Validated account commerce projection */
      200: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          "application/json": components["schemas"]["AccountInventoryItem"];
        };
      };
      /** @description Authorization, stale revision, inventory or financial evidence rejection */
      default: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          "application/json": components["schemas"]["ResaleProblem"];
        };
      };
    };
  };
  getResaleApiV1AdminAccountListings: {
    parameters: {
      query?: {
        after?: string;
        state?: string;
      };
      header?: never;
      path?: never;
      cookie?: never;
    };
    requestBody?: never;
    responses: {
      /** @description Validated account commerce projection */
      200: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          "application/json": components["schemas"]["AccountInventory"];
        };
      };
      /** @description Authorization, stale revision, inventory or financial evidence rejection */
      default: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          "application/json": components["schemas"]["ResaleProblem"];
        };
      };
    };
  };
  getResaleApiV1AdminAccountListingsId: {
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
      /** @description Validated account commerce projection */
      200: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          "application/json": components["schemas"]["AccountInventoryItem"];
        };
      };
      /** @description Authorization, stale revision, inventory or financial evidence rejection */
      default: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          "application/json": components["schemas"]["ResaleProblem"];
        };
      };
    };
  };
  postResaleApiV1AdminAccountListingsIdAction: {
    parameters: {
      query?: never;
      header: {
        "X-CSRF-Token": string;
      };
      path: {
        id: string;
        action: "save" | "publish" | "withdraw";
      };
      cookie?: never;
    };
    requestBody: {
      content: {
        "application/json": components["schemas"]["AccountListingInput"];
      };
    };
    responses: {
      /** @description Validated account commerce projection */
      200: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          "application/json": components["schemas"]["AccountInventoryItem"];
        };
      };
      /** @description Authorization, stale revision, inventory or financial evidence rejection */
      default: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          "application/json": components["schemas"]["ResaleProblem"];
        };
      };
    };
  };
  postResaleApiV1PayoutsIdRecipient: {
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
        "application/json": components["schemas"]["RefundRecipientInput"];
      };
    };
    responses: {
      /** @description Validated account commerce projection */
      200: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          "application/json": components["schemas"]["RefundTransfer"];
        };
      };
      /** @description Authorization, stale revision, inventory or financial evidence rejection */
      default: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          "application/json": components["schemas"]["ResaleProblem"];
        };
      };
    };
  };
  postResaleApiV1AdminPayoutsIdApprove: {
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
        "application/json": components["schemas"]["RefundChange"];
      };
    };
    responses: {
      /** @description Validated account commerce projection */
      200: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          "application/json": components["schemas"]["RefundTransfer"];
        };
      };
      /** @description Authorization, stale revision, inventory or financial evidence rejection */
      default: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          "application/json": components["schemas"]["ResaleProblem"];
        };
      };
    };
  };
  postResaleApiV1AdminPayoutsIdVerify: {
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
        "application/json": components["schemas"]["RefundChange"];
      };
    };
    responses: {
      /** @description Validated account commerce projection */
      200: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          "application/json": components["schemas"]["FinanceQueued"];
        };
      };
      /** @description Authorization, stale revision, inventory or financial evidence rejection */
      default: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          "application/json": components["schemas"]["ResaleProblem"];
        };
      };
    };
  };
  getResaleApiV1AdminFinancePayouts: {
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
      /** @description Validated account commerce projection */
      200: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          "application/json": components["schemas"]["SellerPayoutQueue"];
        };
      };
      /** @description Authorization, stale revision, inventory or financial evidence rejection */
      default: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          "application/json": components["schemas"]["ResaleProblem"];
        };
      };
    };
  };
  publicReviewedAccountImage: {
    parameters: {
      query: {
        release: string;
      };
      header?: never;
      path: {
        id: string;
        slot: number;
      };
      cookie?: never;
    };
    requestBody?: never;
    responses: {
      /** @description Verified sanitized image */
      200: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          "image/png": string;
        };
      };
      /** @description Unavailable or not approved for public use */
      default: {
        headers: {
          [name: string]: unknown;
        };
        content?: never;
      };
    };
  };
  getResaleApiV1SubmissionsIdOffersHistory: {
    parameters: {
      query?: {
        after?: number;
      };
      header?: never;
      path: {
        id: string;
      };
      cookie?: never;
    };
    requestBody?: never;
    responses: {
      /** @description Validated account commerce projection */
      200: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          "application/json": components["schemas"]["SellerOfferHistory"];
        };
      };
      /** @description Authorization, stale revision, inventory or financial evidence rejection */
      default: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          "application/json": components["schemas"]["ResaleProblem"];
        };
      };
    };
  };
  getResaleApiV1AdminSubmissionsIdOffersHistory: {
    parameters: {
      query?: {
        after?: number;
      };
      header?: never;
      path: {
        id: string;
      };
      cookie?: never;
    };
    requestBody?: never;
    responses: {
      /** @description Validated account commerce projection */
      200: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          "application/json": components["schemas"]["SellerOfferHistory"];
        };
      };
      /** @description Authorization, stale revision, inventory or financial evidence rejection */
      default: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          "application/json": components["schemas"]["ResaleProblem"];
        };
      };
    };
  };
  getPublishedSiteContent: {
    parameters: {
      query?: never;
      header?: never;
      path: {
        kind: string;
      };
      cookie?: never;
    };
    requestBody?: never;
    responses: {
      /** @description Successful bounded operation */
      200: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          "application/json": components["schemas"]["SiteContent"];
        };
      };
      /** @description Reload current revision, resolve holds or correct validation. */
      409: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          "application/json": components["schemas"]["ContentProblem"];
        };
      };
      /** @description Reload current revision, resolve holds or correct validation. */
      422: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          "application/json": components["schemas"]["ContentProblem"];
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
  getSiteDraft: {
    parameters: {
      query?: never;
      header?: never;
      path: {
        kind: string;
      };
      cookie?: never;
    };
    requestBody?: never;
    responses: {
      /** @description Successful bounded operation */
      200: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          "application/json": components["schemas"]["SiteContent"];
        };
      };
      /** @description Reload current revision, resolve holds or correct validation. */
      409: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          "application/json": components["schemas"]["ContentProblem"];
        };
      };
      /** @description Reload current revision, resolve holds or correct validation. */
      422: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          "application/json": components["schemas"]["ContentProblem"];
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
  saveOrPublishSiteContent: {
    parameters: {
      query?: never;
      header: {
        Origin: string;
        "X-CSRF-Token": string;
      };
      path: {
        kind: string;
      };
      cookie?: never;
    };
    requestBody: {
      content: {
        "application/json": components["schemas"]["SiteContentInput"];
      };
    };
    responses: {
      /** @description Successful bounded operation */
      200: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          "application/json": components["schemas"]["SiteContent"];
        };
      };
      /** @description Reload current revision, resolve holds or correct validation. */
      409: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          "application/json": components["schemas"]["ContentProblem"];
        };
      };
      /** @description Reload current revision, resolve holds or correct validation. */
      422: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          "application/json": components["schemas"]["ContentProblem"];
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
  getSitePublicationHistory: {
    parameters: {
      query?: {
        after?: string;
      };
      header?: never;
      path: {
        kind: string;
      };
      cookie?: never;
    };
    requestBody?: never;
    responses: {
      /** @description Successful bounded operation */
      200: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          "application/json": components["schemas"]["SiteHistory"];
        };
      };
      /** @description Reload current revision, resolve holds or correct validation. */
      409: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          "application/json": components["schemas"]["ContentProblem"];
        };
      };
      /** @description Reload current revision, resolve holds or correct validation. */
      422: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          "application/json": components["schemas"]["ContentProblem"];
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
  getOwnPrivacyRequests: {
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
      /** @description Successful bounded operation */
      200: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          "application/json": components["schemas"]["PrivacyRequests"];
        };
      };
      /** @description Reload current revision, resolve holds or correct validation. */
      409: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          "application/json": components["schemas"]["PrivacyProblem"];
        };
      };
      /** @description Reload current revision, resolve holds or correct validation. */
      422: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          "application/json": components["schemas"]["PrivacyProblem"];
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
  requestOwnPrivacyErasure: {
    parameters: {
      query?: never;
      header: {
        Origin: string;
        "X-CSRF-Token": string;
      };
      path?: never;
      cookie?: never;
    };
    requestBody: {
      content: {
        "application/json": components["schemas"]["PrivacyRequestInput"];
      };
    };
    responses: {
      /** @description Successful bounded operation */
      200: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          "application/json": components["schemas"]["PrivacyRequest"];
        };
      };
      /** @description Reload current revision, resolve holds or correct validation. */
      409: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          "application/json": components["schemas"]["PrivacyProblem"];
        };
      };
      /** @description Reload current revision, resolve holds or correct validation. */
      422: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          "application/json": components["schemas"]["PrivacyProblem"];
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
  changeOwnPrivacyRequest: {
    parameters: {
      query?: never;
      header: {
        Origin: string;
        "X-CSRF-Token": string;
      };
      path: {
        id: string;
      };
      cookie?: never;
    };
    requestBody: {
      content: {
        "application/json": components["schemas"]["PrivacyChange"];
      };
    };
    responses: {
      /** @description Successful bounded operation */
      200: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          "application/json": components["schemas"]["PrivacyRequest"];
        };
      };
      /** @description Reload current revision, resolve holds or correct validation. */
      409: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          "application/json": components["schemas"]["PrivacyProblem"];
        };
      };
      /** @description Reload current revision, resolve holds or correct validation. */
      422: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          "application/json": components["schemas"]["PrivacyProblem"];
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
  getOwnerReviewedPrivacyRequests: {
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
      /** @description Successful bounded operation */
      200: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          "application/json": components["schemas"]["PrivacyRequests"];
        };
      };
      /** @description Reload current revision, resolve holds or correct validation. */
      409: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          "application/json": components["schemas"]["PrivacyProblem"];
        };
      };
      /** @description Reload current revision, resolve holds or correct validation. */
      422: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          "application/json": components["schemas"]["PrivacyProblem"];
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
  changeOwnerReviewedPrivacyRequest: {
    parameters: {
      query?: never;
      header: {
        Origin: string;
        "X-CSRF-Token": string;
      };
      path: {
        id: string;
      };
      cookie?: never;
    };
    requestBody: {
      content: {
        "application/json": components["schemas"]["PrivacyChange"];
      };
    };
    responses: {
      /** @description Successful bounded operation */
      200: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          "application/json": components["schemas"]["PrivacyRequest"];
        };
      };
      /** @description Reload current revision, resolve holds or correct validation. */
      409: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          "application/json": components["schemas"]["PrivacyProblem"];
        };
      };
      /** @description Reload current revision, resolve holds or correct validation. */
      422: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          "application/json": components["schemas"]["PrivacyProblem"];
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
  exportOwnPersonalData: {
    parameters: {
      query?: never;
      header: {
        Origin: string;
        "X-CSRF-Token": string;
      };
      path?: never;
      cookie?: never;
    };
    requestBody: {
      content: {
        "application/json": components["schemas"]["PrivacyExportInput"];
      };
    };
    responses: {
      /** @description Successful bounded operation */
      200: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          "application/json": components["schemas"]["PrivacyExport"];
        };
      };
      /** @description Reload current revision, resolve holds or correct validation. */
      409: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          "application/json": components["schemas"]["PrivacyProblem"];
        };
      };
      /** @description Reload current revision, resolve holds or correct validation. */
      422: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          "application/json": components["schemas"]["PrivacyProblem"];
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
  getStaffAvailabilityConsent: {
    parameters: {
      query?: {
        after?: string;
        customer?: string;
        state?: string;
      };
      header?: never;
      path?: never;
      cookie?: never;
    };
    requestBody?: never;
    responses: {
      /** @description Successful bounded operation */
      200: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          "application/json": components["schemas"]["StaffAvailabilityPage"];
        };
      };
      /** @description Reload current revision, resolve holds or correct validation. */
      409: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          "application/json": components["schemas"]["AvailabilityProblem"];
        };
      };
      /** @description Reload current revision, resolve holds or correct validation. */
      422: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          "application/json": components["schemas"]["AvailabilityProblem"];
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
  suppressAvailabilityDelivery: {
    parameters: {
      query?: never;
      header: {
        Origin: string;
        "X-CSRF-Token": string;
      };
      path: {
        id: string;
      };
      cookie?: never;
    };
    requestBody: {
      content: {
        "application/json": components["schemas"]["StaffSuppressAlert"];
      };
    };
    responses: {
      /** @description Successful bounded operation */
      204: {
        headers: {
          [name: string]: unknown;
        };
        content?: never;
      };
      /** @description Reload current revision, resolve holds or correct validation. */
      409: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          "application/json": components["schemas"]["AvailabilityProblem"];
        };
      };
      /** @description Reload current revision, resolve holds or correct validation. */
      422: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          "application/json": components["schemas"]["AvailabilityProblem"];
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
  getStaffUserSessions: {
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
      /** @description Successful bounded operation */
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
  revokeStaffUserSessions: {
    parameters: {
      query?: never;
      header: {
        Origin: string;
        "X-CSRF-Token": string;
      };
      path: {
        id: string;
      };
      cookie?: never;
    };
    requestBody?: never;
    responses: {
      /** @description Successful bounded operation */
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
  getPublishedContentVersion: {
    parameters: {
      query?: never;
      header?: never;
      path: {
        kind: string;
        label: string;
      };
      cookie?: never;
    };
    requestBody?: never;
    responses: {
      /** @description Successful bounded operation */
      200: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          "application/json": components["schemas"]["SiteContent"];
        };
      };
      /** @description Reload current revision, resolve holds or correct validation. */
      409: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          "application/json": components["schemas"]["ContentProblem"];
        };
      };
      /** @description Reload current revision, resolve holds or correct validation. */
      422: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          "application/json": components["schemas"]["ContentProblem"];
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
  customerAccountOverview: {
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
          "application/json": components["schemas"]["AccountOverview"];
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
  portalGetAuthSession: {
    parameters: {
      query?: never;
      header?: never;
      path: {
        portal: components["schemas"]["AuthPortal"];
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
  portalRequestEmailCode: {
    parameters: {
      query?: never;
      header: {
        "X-CSRF-Token": string;
        Origin: string;
      };
      path: {
        portal: components["schemas"]["AuthPortal"];
      };
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
  portalVerifyEmailCode: {
    parameters: {
      query?: never;
      header: {
        "X-CSRF-Token": string;
        Origin: string;
      };
      path: {
        portal: components["schemas"]["AuthPortal"];
      };
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
  portalStartGoogle: {
    parameters: {
      query?: never;
      header: {
        "X-CSRF-Token": string;
        Origin: string;
      };
      path: {
        portal: components["schemas"]["AuthPortal"];
      };
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
  portalFinishGoogle: {
    parameters: {
      query: {
        state: string;
        code: string;
      };
      header?: never;
      path: {
        portal: components["schemas"]["AuthPortal"];
      };
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
  portalLogout: {
    parameters: {
      query?: never;
      header: {
        "X-CSRF-Token": string;
        Origin: string;
      };
      path: {
        portal: components["schemas"]["AuthPortal"];
      };
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
  portalDisableMFA: {
    parameters: {
      query?: never;
      header: {
        "X-CSRF-Token": string;
        Origin: string;
      };
      path: {
        portal: components["schemas"]["AuthPortal"];
      };
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
  portalRevokeSessions: {
    parameters: {
      query?: never;
      header: {
        "X-CSRF-Token": string;
        Origin: string;
      };
      path: {
        portal: components["schemas"]["AuthPortal"];
      };
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
  portalEnrollMFA: {
    parameters: {
      query?: never;
      header: {
        "X-CSRF-Token": string;
        Origin: string;
      };
      path: {
        portal: components["schemas"]["AuthPortal"];
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
  portalVerifyMFA: {
    parameters: {
      query?: never;
      header: {
        "X-CSRF-Token": string;
        Origin: string;
      };
      path: {
        portal: components["schemas"]["AuthPortal"];
      };
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
  portalRegenerateRecoveryCodes: {
    parameters: {
      query?: never;
      header: {
        "X-CSRF-Token": string;
        Origin: string;
      };
      path: {
        portal: components["schemas"]["AuthPortal"];
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
  getGameDiscovery: {
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
      /** @description Bounded public evidence; no private identities. Responses are not cached. */
      200: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          "application/json": components["schemas"]["CatalogDiscoveryView"];
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
      /** @description Public query rate limit; respect Retry-After. */
      429: {
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
  getPublicMetrics: {
    parameters: {
      query?: never;
      header?: never;
      path?: never;
      cookie?: never;
    };
    requestBody?: never;
    responses: {
      /** @description Bounded public evidence; no private identities. Responses are not cached. */
      200: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          "application/json": components["schemas"]["PublicMetrics"];
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
      /** @description Public query rate limit; respect Retry-After. */
      429: {
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
  publicReviewShowcase: {
    parameters: {
      query?: never;
      header?: never;
      path?: never;
      cookie?: never;
    };
    requestBody?: never;
    responses: {
      /** @description Validated review response; public representations omit private identities and moderation notes. */
      200: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          "application/json": components["schemas"]["ReviewShowcase"];
        };
      };
      /** @description Refresh changed review or correct input. */
      409: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          "application/json": components["schemas"]["ReviewProblem"];
        };
      };
      /** @description Refresh changed review or correct input. */
      422: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          "application/json": components["schemas"]["ReviewProblem"];
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
  recoverCustomerOrder: {
    parameters: {
      query?: never;
      header?: never;
      path: {
        key: string;
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
          "application/json": {
            /** @description Owned order ID, or empty when no request has been saved. */
            order_id: string;
          };
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
  getBoosterSessionAgenda: {
    parameters: {
      query?: {
        after?: string;
        state?: "" | "proposed" | "confirmed";
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
          "application/json": components["schemas"]["BoosterAgenda"];
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
  getBoosterFulfillmentReadiness: {
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
          "application/json": components["schemas"]["FulfillmentReadiness"];
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
  getAdminFulfillmentReadiness: {
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
          "application/json": components["schemas"]["FulfillmentReadiness"];
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
  publishBoosterAvailabilitySeries: {
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
        "application/json": components["schemas"]["AvailabilitySeriesInput"];
      };
    };
    responses: {
      /** @description Successful private order response */
      200: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          "application/json": components["schemas"]["AvailabilitySeriesResult"];
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
  publishAdminAvailabilitySeries: {
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
        "application/json": components["schemas"]["AvailabilitySeriesInput"];
      };
    };
    responses: {
      /** @description Successful private order response */
      200: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          "application/json": components["schemas"]["AvailabilitySeriesResult"];
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
  previewOrderQuote: {
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
          "application/json": components["schemas"]["OrderQuotePreview"];
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
  getResaleMarketGames: {
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
      /** @description Validated account commerce projection */
      200: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          "application/json": components["schemas"]["AccountMarketGames"];
        };
      };
      /** @description Authorization, stale revision, inventory or financial evidence rejection */
      default: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          "application/json": components["schemas"]["ResaleProblem"];
        };
      };
    };
  };
  getCustomerRefundsEvidenceHistory: {
    parameters: {
      query?: {
        after?: number;
      };
      header?: never;
      path: {
        id: string;
      };
      cookie?: never;
    };
    requestBody?: never;
    responses: {
      /** @description Private payment result */
      200: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          "application/json": components["schemas"]["TransferHistory"];
        };
      };
      /** @description Authentication, authorization or payment validation rejected */
      default: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          "application/json": components["schemas"]["PaymentProblem"];
        };
      };
    };
  };
  getCustomerPayoutsEvidenceHistory: {
    parameters: {
      query?: {
        after?: number;
      };
      header?: never;
      path: {
        id: string;
      };
      cookie?: never;
    };
    requestBody?: never;
    responses: {
      /** @description Private payment result */
      200: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          "application/json": components["schemas"]["TransferHistory"];
        };
      };
      /** @description Authentication, authorization or payment validation rejected */
      default: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          "application/json": components["schemas"]["PaymentProblem"];
        };
      };
    };
  };
  getAdminRefundsEvidenceHistory: {
    parameters: {
      query?: {
        after?: number;
      };
      header?: never;
      path: {
        id: string;
      };
      cookie?: never;
    };
    requestBody?: never;
    responses: {
      /** @description Private payment result */
      200: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          "application/json": components["schemas"]["TransferHistory"];
        };
      };
      /** @description Authentication, authorization or payment validation rejected */
      default: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          "application/json": components["schemas"]["PaymentProblem"];
        };
      };
    };
  };
  getAdminPayoutsEvidenceHistory: {
    parameters: {
      query?: {
        after?: number;
      };
      header?: never;
      path: {
        id: string;
      };
      cookie?: never;
    };
    requestBody?: never;
    responses: {
      /** @description Private payment result */
      200: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          "application/json": components["schemas"]["TransferHistory"];
        };
      };
      /** @description Authentication, authorization or payment validation rejected */
      default: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          "application/json": components["schemas"]["PaymentProblem"];
        };
      };
    };
  };
  inspectFinanceReconciliation: {
    parameters: {
      query: {
        direction: "incoming" | "outgoing";
        payment_id: string;
      };
      header?: never;
      path?: never;
      cookie?: never;
    };
    requestBody?: never;
    responses: {
      /** @description Private payment result */
      200: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          "application/json": components["schemas"]["ReconciliationReview"];
        };
      };
      /** @description Authentication, authorization or payment validation rejected */
      default: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          "application/json": components["schemas"]["PaymentProblem"];
        };
      };
    };
  };
  getShopApiV1AdminShopProducts: {
    parameters: {
      query?: {
        after?: string;
        q?: string;
        game?: string;
        state?: string;
        availability?: "available" | "unavailable";
      };
      header?: never;
      path?: never;
      cookie?: never;
    };
    requestBody?: never;
    responses: {
      /** @description Bounded product projection */
      200: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          "application/json": components["schemas"]["ShopProducts"];
        };
      };
      /** @description Authorization, validation, concurrency or unavailable rejection */
      default: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          "application/json": components["schemas"]["ShopProblem"];
        };
      };
    };
  };
  postShopApiV1AdminShopProducts: {
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
        "application/json": components["schemas"]["ShopCreate"];
      };
    };
    responses: {
      /** @description Bounded product projection */
      200: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          "application/json": components["schemas"]["ShopProductDraft"];
        };
      };
      /** @description Authorization, validation, concurrency or unavailable rejection */
      default: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          "application/json": components["schemas"]["ShopProblem"];
        };
      };
    };
  };
  getShopApiV1AdminShopProductsId: {
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
      /** @description Bounded product projection */
      200: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          "application/json": components["schemas"]["ShopProductDraft"];
        };
      };
      /** @description Authorization, validation, concurrency or unavailable rejection */
      default: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          "application/json": components["schemas"]["ShopProblem"];
        };
      };
    };
  };
  postShopApiV1AdminShopProductsIdDraft: {
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
        "application/json": components["schemas"]["ShopSave"];
      };
    };
    responses: {
      /** @description Bounded product projection */
      200: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          "application/json": components["schemas"]["ShopProductDraft"];
        };
      };
      /** @description Authorization, validation, concurrency or unavailable rejection */
      default: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          "application/json": components["schemas"]["ShopProblem"];
        };
      };
    };
  };
  getShopApiV1AdminShopProductsIdPreview: {
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
      /** @description Bounded product projection */
      200: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          "application/json": components["schemas"]["ShopPreview"];
        };
      };
      /** @description Authorization, validation, concurrency or unavailable rejection */
      default: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          "application/json": components["schemas"]["ShopProblem"];
        };
      };
    };
  };
  getShopApiV1AdminShopProductsIdReleases: {
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
      /** @description Bounded product projection */
      200: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          "application/json": components["schemas"]["ShopReleaseHistory"];
        };
      };
      /** @description Authorization, validation, concurrency or unavailable rejection */
      default: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          "application/json": components["schemas"]["ShopProblem"];
        };
      };
    };
  };
  postShopApiV1AdminShopProductsIdPublish: {
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
        "application/json": components["schemas"]["ShopChange"];
      };
    };
    responses: {
      /** @description Bounded product projection */
      200: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          "application/json": components["schemas"]["ShopProductDraft"];
        };
      };
      /** @description Authorization, validation, concurrency or unavailable rejection */
      default: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          "application/json": components["schemas"]["ShopProblem"];
        };
      };
    };
  };
  postShopApiV1AdminShopProductsIdPause: {
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
        "application/json": components["schemas"]["ShopChange"];
      };
    };
    responses: {
      /** @description Bounded product projection */
      200: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          "application/json": components["schemas"]["ShopProductDraft"];
        };
      };
      /** @description Authorization, validation, concurrency or unavailable rejection */
      default: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          "application/json": components["schemas"]["ShopProblem"];
        };
      };
    };
  };
  postShopApiV1AdminShopProductsIdResume: {
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
        "application/json": components["schemas"]["ShopChange"];
      };
    };
    responses: {
      /** @description Bounded product projection */
      200: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          "application/json": components["schemas"]["ShopProductDraft"];
        };
      };
      /** @description Authorization, validation, concurrency or unavailable rejection */
      default: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          "application/json": components["schemas"]["ShopProblem"];
        };
      };
    };
  };
  postShopApiV1AdminShopProductsIdArchive: {
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
        "application/json": components["schemas"]["ShopChange"];
      };
    };
    responses: {
      /** @description Bounded product projection */
      200: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          "application/json": components["schemas"]["ShopProductDraft"];
        };
      };
      /** @description Authorization, validation, concurrency or unavailable rejection */
      default: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          "application/json": components["schemas"]["ShopProblem"];
        };
      };
    };
  };
  postShopApiV1AdminShopProductsIdRestore: {
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
        "application/json": components["schemas"]["ShopChange"];
      };
    };
    responses: {
      /** @description Bounded product projection */
      200: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          "application/json": components["schemas"]["ShopProductDraft"];
        };
      };
      /** @description Authorization, validation, concurrency or unavailable rejection */
      default: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          "application/json": components["schemas"]["ShopProblem"];
        };
      };
    };
  };
  postShopApiV1AdminShopProductsIdStock: {
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
        "application/json": components["schemas"]["ShopStockChange"];
      };
    };
    responses: {
      /** @description Bounded product projection */
      200: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          "application/json": components["schemas"]["ShopProductDraft"];
        };
      };
      /** @description Authorization, validation, concurrency or unavailable rejection */
      default: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          "application/json": components["schemas"]["ShopProblem"];
        };
      };
    };
  };
  getShopApiV1GamesSlugShop: {
    parameters: {
      query?: {
        after?: string;
        q?: string;
        region?: string;
        category?: string;
      };
      header?: never;
      path: {
        slug: string;
      };
      cookie?: never;
    };
    requestBody?: never;
    responses: {
      /** @description Current scoped shop state */
      200: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          "application/json": components["schemas"]["ShopPublicPage"];
        };
      };
      /** @description Validation, authorization, revision or availability failure */
      default: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          "application/json": components["schemas"]["ShopProblem"];
        };
      };
    };
  };
  getShopApiV1GamesSlugShopId: {
    parameters: {
      query?: never;
      header?: never;
      path: {
        slug: string;
        id: string;
      };
      cookie?: never;
    };
    requestBody?: never;
    responses: {
      /** @description Current scoped shop state */
      200: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          "application/json": components["schemas"]["ShopPublicProduct"];
        };
      };
      /** @description Validation, authorization, revision or availability failure */
      default: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          "application/json": components["schemas"]["ShopProblem"];
        };
      };
    };
  };
  postShopApiV1GamesSlugShopIdReserve: {
    parameters: {
      query?: never;
      header: {
        "X-CSRF-Token": string;
      };
      path: {
        slug: string;
        id: string;
      };
      cookie?: never;
    };
    requestBody: {
      content: {
        "application/json": components["schemas"]["ShopReserve"];
      };
    };
    responses: {
      /** @description Current scoped shop state */
      200: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          "application/json": components["schemas"]["ShopDelivery"];
        };
      };
      /** @description Validation, authorization, revision or availability failure */
      default: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          "application/json": components["schemas"]["ShopProblem"];
        };
      };
    };
  };
  getShopApiV1OrdersIdShop: {
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
      /** @description Current scoped shop state */
      200: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          "application/json": components["schemas"]["ShopDelivery"];
        };
      };
      /** @description Validation, authorization, revision or availability failure */
      default: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          "application/json": components["schemas"]["ShopProblem"];
        };
      };
    };
  };
  postShopApiV1OrdersIdShopRecipient: {
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
        "application/json": components["schemas"]["ShopRecipientAccess"];
      };
    };
    responses: {
      /** @description Current scoped shop state */
      200: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          "application/json": components["schemas"]["ShopRecipient"];
        };
      };
      /** @description Validation, authorization, revision or availability failure */
      default: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          "application/json": components["schemas"]["ShopProblem"];
        };
      };
    };
  };
  getShopApiV1AdminOrdersIdShop: {
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
      /** @description Current scoped shop state */
      200: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          "application/json": components["schemas"]["ShopDelivery"];
        };
      };
      /** @description Validation, authorization, revision or availability failure */
      default: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          "application/json": components["schemas"]["ShopProblem"];
        };
      };
    };
  };
  postShopApiV1AdminOrdersIdShopRecipient: {
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
        "application/json": components["schemas"]["ShopRecipientAccess"];
      };
    };
    responses: {
      /** @description Current scoped shop state */
      200: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          "application/json": components["schemas"]["ShopRecipient"];
        };
      };
      /** @description Validation, authorization, revision or availability failure */
      default: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          "application/json": components["schemas"]["ShopProblem"];
        };
      };
    };
  };
  postShopApiV1AdminOrdersIdShopAction: {
    parameters: {
      query?: never;
      header: {
        "X-CSRF-Token": string;
      };
      path: {
        id: string;
        action: string;
      };
      cookie?: never;
    };
    requestBody: {
      content: {
        "application/json": components["schemas"]["ShopDeliveryChange"];
      };
    };
    responses: {
      /** @description Current scoped shop state */
      200: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          "application/json": components["schemas"]["ShopDelivery"];
        };
      };
      /** @description Validation, authorization, revision or availability failure */
      default: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          "application/json": components["schemas"]["ShopProblem"];
        };
      };
    };
  };
  getArticleApiV1AdminNews: {
    parameters: {
      query?: {
        after?: string;
        q?: string;
        game?: string;
        state?: string;
        kind?: string;
        author?: string;
      };
      header?: never;
      path?: never;
      cookie?: never;
    };
    requestBody?: never;
    responses: {
      /** @description Bounded editorial projection */
      200: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          "application/json": components["schemas"]["Articles"];
        };
      };
      /** @description Authorization, validation, unavailable or revision conflict */
      default: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          "application/json": components["schemas"]["ArticleProblem"];
        };
      };
    };
  };
  postArticleApiV1AdminNews: {
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
        "application/json": components["schemas"]["ArticleCreate"];
      };
    };
    responses: {
      /** @description Bounded editorial projection */
      200: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          "application/json": components["schemas"]["ArticleDraft"];
        };
      };
      /** @description Authorization, validation, unavailable or revision conflict */
      default: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          "application/json": components["schemas"]["ArticleProblem"];
        };
      };
    };
  };
  getArticleApiV1AdminNewsId: {
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
      /** @description Bounded editorial projection */
      200: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          "application/json": components["schemas"]["ArticleDraft"];
        };
      };
      /** @description Authorization, validation, unavailable or revision conflict */
      default: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          "application/json": components["schemas"]["ArticleProblem"];
        };
      };
    };
  };
  postArticleApiV1AdminNewsIdDraft: {
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
        "application/json": components["schemas"]["ArticleSave"];
      };
    };
    responses: {
      /** @description Bounded editorial projection */
      200: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          "application/json": components["schemas"]["ArticleDraft"];
        };
      };
      /** @description Authorization, validation, unavailable or revision conflict */
      default: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          "application/json": components["schemas"]["ArticleProblem"];
        };
      };
    };
  };
  getArticleApiV1AdminNewsIdPreview: {
    parameters: {
      query?: {
        revision?: string;
      };
      header?: never;
      path: {
        id: string;
      };
      cookie?: never;
    };
    requestBody?: never;
    responses: {
      /** @description Bounded editorial projection */
      200: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          "application/json": components["schemas"]["ArticlePreview"];
        };
      };
      /** @description Authorization, validation, unavailable or revision conflict */
      default: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          "application/json": components["schemas"]["ArticleProblem"];
        };
      };
    };
  };
  getArticleApiV1AdminNewsIdHistory: {
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
      /** @description Bounded editorial projection */
      200: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          "application/json": components["schemas"]["ArticleHistory"];
        };
      };
      /** @description Authorization, validation, unavailable or revision conflict */
      default: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          "application/json": components["schemas"]["ArticleProblem"];
        };
      };
    };
  };
  postArticleApiV1AdminNewsIdPublish: {
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
        "application/json": components["schemas"]["ArticleChange"];
      };
    };
    responses: {
      /** @description Bounded editorial projection */
      200: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          "application/json": components["schemas"]["ArticleDraft"];
        };
      };
      /** @description Authorization, validation, unavailable or revision conflict */
      default: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          "application/json": components["schemas"]["ArticleProblem"];
        };
      };
    };
  };
  postArticleApiV1AdminNewsIdSchedule: {
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
        "application/json": components["schemas"]["ArticleChange"];
      };
    };
    responses: {
      /** @description Bounded editorial projection */
      200: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          "application/json": components["schemas"]["ArticleDraft"];
        };
      };
      /** @description Authorization, validation, unavailable or revision conflict */
      default: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          "application/json": components["schemas"]["ArticleProblem"];
        };
      };
    };
  };
  postArticleApiV1AdminNewsIdUnschedule: {
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
        "application/json": components["schemas"]["ArticleChange"];
      };
    };
    responses: {
      /** @description Bounded editorial projection */
      200: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          "application/json": components["schemas"]["ArticleDraft"];
        };
      };
      /** @description Authorization, validation, unavailable or revision conflict */
      default: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          "application/json": components["schemas"]["ArticleProblem"];
        };
      };
    };
  };
  postArticleApiV1AdminNewsIdUnpublish: {
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
        "application/json": components["schemas"]["ArticleChange"];
      };
    };
    responses: {
      /** @description Bounded editorial projection */
      200: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          "application/json": components["schemas"]["ArticleDraft"];
        };
      };
      /** @description Authorization, validation, unavailable or revision conflict */
      default: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          "application/json": components["schemas"]["ArticleProblem"];
        };
      };
    };
  };
  postArticleApiV1AdminNewsIdArchive: {
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
        "application/json": components["schemas"]["ArticleChange"];
      };
    };
    responses: {
      /** @description Bounded editorial projection */
      200: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          "application/json": components["schemas"]["ArticleDraft"];
        };
      };
      /** @description Authorization, validation, unavailable or revision conflict */
      default: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          "application/json": components["schemas"]["ArticleProblem"];
        };
      };
    };
  };
  postArticleApiV1AdminNewsIdRestore: {
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
        "application/json": components["schemas"]["ArticleChange"];
      };
    };
    responses: {
      /** @description Bounded editorial projection */
      200: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          "application/json": components["schemas"]["ArticleDraft"];
        };
      };
      /** @description Authorization, validation, unavailable or revision conflict */
      default: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          "application/json": components["schemas"]["ArticleProblem"];
        };
      };
    };
  };
  getArticleApiV1GamesSlugNews: {
    parameters: {
      query?: {
        after?: string;
        q?: string;
        kind?: string;
      };
      header?: never;
      path: {
        slug: string;
      };
      cookie?: never;
    };
    requestBody?: never;
    responses: {
      /** @description Bounded editorial projection */
      200: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          "application/json": components["schemas"]["ArticlePublicPage"];
        };
      };
      /** @description Authorization, validation, unavailable or revision conflict */
      default: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          "application/json": components["schemas"]["ArticleProblem"];
        };
      };
    };
  };
  getArticleApiV1GamesSlugNewsArticle: {
    parameters: {
      query?: never;
      header?: never;
      path: {
        slug: string;
        article: string;
      };
      cookie?: never;
    };
    requestBody?: never;
    responses: {
      /** @description Bounded editorial projection */
      200: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          "application/json": components["schemas"]["ArticlePublic"];
        };
      };
      /** @description Authorization, validation, unavailable or revision conflict */
      default: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          "application/json": components["schemas"]["ArticleProblem"];
        };
      };
    };
  };
  getArticleSitemap: {
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
      /** @description Bounded editorial projection */
      200: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          "application/json": components["schemas"]["ArticleSitemap"];
        };
      };
      /** @description Authorization, validation, unavailable or revision conflict */
      default: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          "application/json": components["schemas"]["ArticleProblem"];
        };
      };
    };
  };
  listAdminJobAttempts: {
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
      /** @description Narrow authenticated operational result; job payloads and secrets are excluded */
      200: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          "application/json": components["schemas"]["OperationalJobAttempts"];
        };
      };
      /** @description Refresh observed state or correct the request */
      409: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          "application/json": components["schemas"]["OperationalProblem"];
        };
      };
      /** @description Refresh observed state or correct the request */
      422: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          "application/json": components["schemas"]["OperationalProblem"];
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
  uploadEditorialArtwork: {
    parameters: {
      query: {
        purpose: "game" | "cover" | "product" | "inline";
        focus_x: number;
        focus_y: number;
      };
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
        "image/jpeg": string;
        "image/png": string;
        "image/webp": string;
      };
    };
    responses: {
      /** @description Checked responsive derivatives. Does not save or publish any catalog/article/product. */
      200: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          "application/json": components["schemas"]["Artwork"];
        };
      };
      /** @description Correct validation or reload current state. */
      409: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          "application/json": components["schemas"]["ArtworkProblem"];
        };
      };
      /** @description Correct validation or reload current state. */
      422: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          "application/json": components["schemas"]["ArtworkProblem"];
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
  getPublishedArtwork: {
    parameters: {
      query?: never;
      header?: never;
      path: {
        id: string;
        variant:
          "wide" | "wide-small" | "mobile" | "mobile-small" | "card" | "thumb";
      };
      cookie?: never;
    };
    requestBody?: never;
    responses: {
      /** @description Checked image pixels; private cache revalidation required. */
      200: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          "image/jpeg": string;
          "image/png": string;
        };
      };
      /** @description Unchanged pixels; current access was verified. */
      304: {
        headers: {
          [name: string]: unknown;
        };
        content?: never;
      };
      /** @description Image is missing, not ready or not currently published. */
      404: {
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
  previewEditorialArtwork: {
    parameters: {
      query?: never;
      header?: never;
      path: {
        id: string;
        variant:
          "wide" | "wide-small" | "mobile" | "mobile-small" | "card" | "thumb";
      };
      cookie?: never;
    };
    requestBody?: never;
    responses: {
      /** @description Checked image pixels; private cache revalidation required. */
      200: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          "image/jpeg": string;
          "image/png": string;
        };
      };
      /** @description Unchanged pixels; current access was verified. */
      304: {
        headers: {
          [name: string]: unknown;
        };
        content?: never;
      };
      /** @description Image is missing, not ready or not currently published. */
      404: {
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
  inviteStaff: {
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
        "application/json": components["schemas"]["StaffInvitation"];
      };
    };
    responses: {
      /** @description Independent staff identity provisioned */
      201: {
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
  accountAgreementDefaults: {
    parameters: {
      query?: never;
      header?: never;
      path?: never;
      cookie?: never;
    };
    requestBody?: never;
    responses: {
      /** @description Approved wording; transaction facts must be supplied separately */
      200: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          "application/json": components["schemas"]["AccountAgreementDefaults"];
        };
      };
      /** @description Sign in required */
      401: {
        headers: {
          [name: string]: unknown;
        };
        content?: never;
      };
      /** @description Staff permission required */
      403: {
        headers: {
          [name: string]: unknown;
        };
        content?: never;
      };
    };
  };
  recordManualSellerPayout: {
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
        "application/json": components["schemas"]["ManualPayoutInput"];
      };
    };
    responses: {
      /** @description Validated account commerce projection */
      200: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          "application/json": components["schemas"]["RefundTransfer"];
        };
      };
      /** @description Authorization, stale revision, inventory or financial evidence rejection */
      default: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          "application/json": components["schemas"]["ResaleProblem"];
        };
      };
    };
  };
  getSellerSellingProgress: {
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
      /** @description Validated account commerce projection */
      200: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          "application/json": components["schemas"]["SellingProgress"];
        };
      };
      /** @description Authorization, stale revision, inventory or financial evidence rejection */
      default: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          "application/json": components["schemas"]["ResaleProblem"];
        };
      };
    };
  };
  getAdminSellingProgress: {
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
      /** @description Validated account commerce projection */
      200: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          "application/json": components["schemas"]["SellingProgress"];
        };
      };
      /** @description Authorization, stale revision, inventory or financial evidence rejection */
      default: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          "application/json": components["schemas"]["ResaleProblem"];
        };
      };
    };
  };
  memberChatFormRead: {
    parameters: {
      query?: never;
      header?: {
        /** @description Select this endpoint’s portal; defaults to customer. Exactly one matching portal cookie is used. Conversation/media membership, staff route projection and MFA still apply; booster conversation listing/creation is not allowed. */
        "X-Playora-Portal"?: components["schemas"]["AuthPortal"];
      };
      path: {
        id: string;
        form: string;
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
          "application/json": components["schemas"]["ChatForm"];
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
  memberChatFormLegacy: {
    parameters: {
      query?: never;
      header?: {
        /** @description Select this endpoint’s portal; defaults to customer. Exactly one matching portal cookie is used. Conversation/media membership, staff route projection and MFA still apply; booster conversation listing/creation is not allowed. */
        "X-Playora-Portal"?: components["schemas"]["AuthPortal"];
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
          "application/json": components["schemas"]["ChatFormLegacy"];
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
  memberChatFormReveal: {
    parameters: {
      query?: never;
      header: {
        "X-CSRF-Token": string;
        Origin: string;
        /** @description Select this endpoint’s portal; defaults to customer. Exactly one matching portal cookie is used. Conversation/media membership, staff route projection and MFA still apply; booster conversation listing/creation is not allowed. */
        "X-Playora-Portal"?: components["schemas"]["AuthPortal"];
      };
      path: {
        id: string;
        form: string;
      };
      cookie?: never;
    };
    requestBody: {
      content: {
        "application/json": components["schemas"]["EmptyCommand"];
      };
    };
    responses: {
      /** @description Successful private response */
      200: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          "application/json": components["schemas"]["ChatFormSecret"];
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
  memberChatFormReply: {
    parameters: {
      query?: never;
      header: {
        "X-CSRF-Token": string;
        Origin: string;
        /** @description Select this endpoint’s portal; defaults to customer. Exactly one matching portal cookie is used. Conversation/media membership, staff route projection and MFA still apply; booster conversation listing/creation is not allowed. */
        "X-Playora-Portal"?: components["schemas"]["AuthPortal"];
      };
      path: {
        id: string;
        form: string;
      };
      cookie?: never;
    };
    requestBody: {
      content: {
        "application/json": components["schemas"]["ChatFormReply"];
      };
    };
    responses: {
      /** @description Successful private response */
      200: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          "application/json": components["schemas"]["ChatForm"];
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
  staffChatFormRead: {
    parameters: {
      query?: never;
      header?: never;
      path: {
        id: string;
        form: string;
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
          "application/json": components["schemas"]["ChatForm"];
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
  staffChatFormLegacy: {
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
          "application/json": components["schemas"]["ChatFormLegacy"];
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
  staffChatFormReveal: {
    parameters: {
      query?: never;
      header: {
        "X-CSRF-Token": string;
        Origin: string;
      };
      path: {
        id: string;
        form: string;
      };
      cookie?: never;
    };
    requestBody: {
      content: {
        "application/json": components["schemas"]["EmptyCommand"];
      };
    };
    responses: {
      /** @description Successful private response */
      200: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          "application/json": components["schemas"]["ChatFormSecret"];
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
  staffChatFormOptions: {
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
          "application/json": components["schemas"]["ChatFormOptions"];
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
  staffChatFormCreate: {
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
        "application/json": components["schemas"]["ChatFormCreate"];
      };
    };
    responses: {
      /** @description Successful private response */
      200: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          "application/json": components["schemas"]["ChatForm"];
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
  staffChatFormCancel: {
    parameters: {
      query?: never;
      header: {
        "X-CSRF-Token": string;
        Origin: string;
      };
      path: {
        id: string;
        form: string;
      };
      cookie?: never;
    };
    requestBody: {
      content: {
        "application/json": components["schemas"]["ChatFormCancel"];
      };
    };
    responses: {
      /** @description Successful private response */
      200: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          "application/json": components["schemas"]["ChatForm"];
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
  getSupplierConnections: {
    parameters: {
      query?: never;
      header?: never;
      path?: never;
      cookie?: never;
    };
    requestBody?: never;
    responses: {
      /** @description Private supplier projection */
      200: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          "application/json": components["schemas"]["SupplierConnections"];
        };
      };
      /** @description Authorization, validation, concurrency or supplier availability rejection */
      default: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          "application/json": components["schemas"]["SupplierProblem"];
        };
      };
    };
  };
  getSupplierLibrary: {
    parameters: {
      query?: {
        import?: string;
        after?: string;
        q?: string;
        game?: string;
        category?: string;
      };
      header?: never;
      path: {
        connection:
          | "nexus-sandbox"
          | "nexus-production"
          | "vendoria-test"
          | "vendoria-production";
      };
      cookie?: never;
    };
    requestBody?: never;
    responses: {
      /** @description Private supplier projection */
      200: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          "application/json": components["schemas"]["SupplierLibrary"];
        };
      };
      /** @description Authorization, validation, concurrency or supplier availability rejection */
      default: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          "application/json": components["schemas"]["SupplierProblem"];
        };
      };
    };
  };
  createSupplierImport: {
    parameters: {
      query?: never;
      header: {
        "X-CSRF-Token": string;
      };
      path: {
        connection:
          | "nexus-sandbox"
          | "nexus-production"
          | "vendoria-test"
          | "vendoria-production";
      };
      cookie?: never;
    };
    requestBody: {
      content: {
        "application/json": components["schemas"]["SupplierImportRequest"];
      };
    };
    responses: {
      /** @description Private supplier projection */
      202: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          "application/json": components["schemas"]["SupplierImport"];
        };
      };
      /** @description Authorization, validation, concurrency or supplier availability rejection */
      default: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          "application/json": components["schemas"]["SupplierProblem"];
        };
      };
    };
  };
  setSupplierMarkup: {
    parameters: {
      query?: never;
      header: {
        "X-CSRF-Token": string;
      };
      path: {
        connection:
          | "nexus-sandbox"
          | "nexus-production"
          | "vendoria-test"
          | "vendoria-production";
      };
      cookie?: never;
    };
    requestBody: {
      content: {
        "application/json": components["schemas"]["SupplierMarkupInput"];
      };
    };
    responses: {
      /** @description Private supplier projection */
      200: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          "application/json": components["schemas"]["SupplierConnection"];
        };
      };
      /** @description Authorization, validation, concurrency or supplier availability rejection */
      default: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          "application/json": components["schemas"]["SupplierProblem"];
        };
      };
    };
  };
  setSupplierOfferPrice: {
    parameters: {
      query?: never;
      header: {
        "X-CSRF-Token": string;
      };
      path: {
        connection:
          | "nexus-sandbox"
          | "nexus-production"
          | "vendoria-test"
          | "vendoria-production";
      };
      cookie?: never;
    };
    requestBody: {
      content: {
        "application/json": components["schemas"]["SupplierOfferSettings"];
      };
    };
    responses: {
      /** @description Private supplier projection */
      200: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          "application/json": components["schemas"]["SupplierPricing"];
        };
      };
      /** @description Authorization, validation, concurrency or supplier availability rejection */
      default: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          "application/json": components["schemas"]["SupplierProblem"];
        };
      };
    };
  };
  getSupplierImport: {
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
      /** @description Private supplier projection */
      200: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          "application/json": components["schemas"]["SupplierImport"];
        };
      };
      /** @description Authorization, validation, concurrency or supplier availability rejection */
      default: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          "application/json": components["schemas"]["SupplierProblem"];
        };
      };
    };
  };
  cancelSupplierImport: {
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
        "application/json": Record<string, never>;
      };
    };
    responses: {
      /** @description Private supplier projection */
      200: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          "application/json": components["schemas"]["SupplierImport"];
        };
      };
      /** @description Authorization, validation, concurrency or supplier availability rejection */
      default: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          "application/json": components["schemas"]["SupplierProblem"];
        };
      };
    };
  };
  receiveNexusSandboxSignal: {
    parameters: {
      query?: never;
      header: {
        Sign: string;
      };
      path?: never;
      cookie?: never;
    };
    requestBody: {
      content: {
        "application/json": {
          [key: string]: unknown;
        };
      };
    };
    responses: {
      /** @description Recognized status signal recorded, duplicate received, or authenticated unknown event ignored */
      204: {
        headers: {
          [name: string]: unknown;
        };
        content?: never;
      };
      /** @description Missing, ambiguous or incorrect signature */
      403: {
        headers: {
          [name: string]: unknown;
        };
        content?: never;
      };
      /** @description Connection is not configured in this application */
      404: {
        headers: {
          [name: string]: unknown;
        };
        content?: never;
      };
      /** @description Body exceeds the 256 KiB limit */
      413: {
        headers: {
          [name: string]: unknown;
        };
        content?: never;
      };
      /** @description Unsupported content type or encoding */
      415: {
        headers: {
          [name: string]: unknown;
        };
        content?: never;
      };
      /** @description Authenticated payload is invalid */
      422: {
        headers: {
          [name: string]: unknown;
        };
        content?: never;
      };
      /** @description Signal cannot be recorded or requires an unfinished interactive workflow; retry later */
      503: {
        headers: {
          [name: string]: unknown;
        };
        content?: never;
      };
    };
  };
  receiveVendoriaTestSignal: {
    parameters: {
      query?: never;
      header: {
        Sign: string;
      };
      path?: never;
      cookie?: never;
    };
    requestBody: {
      content: {
        "application/json": {
          [key: string]: unknown;
        };
      };
    };
    responses: {
      /** @description Recognized status signal recorded, duplicate received, or authenticated unknown event ignored */
      204: {
        headers: {
          [name: string]: unknown;
        };
        content?: never;
      };
      /** @description Missing, ambiguous or incorrect signature */
      403: {
        headers: {
          [name: string]: unknown;
        };
        content?: never;
      };
      /** @description Connection is not configured in this application */
      404: {
        headers: {
          [name: string]: unknown;
        };
        content?: never;
      };
      /** @description Body exceeds the 256 KiB limit */
      413: {
        headers: {
          [name: string]: unknown;
        };
        content?: never;
      };
      /** @description Unsupported content type or encoding */
      415: {
        headers: {
          [name: string]: unknown;
        };
        content?: never;
      };
      /** @description Authenticated payload is invalid */
      422: {
        headers: {
          [name: string]: unknown;
        };
        content?: never;
      };
      /** @description Signal cannot be recorded or requires an unfinished interactive workflow; retry later */
      503: {
        headers: {
          [name: string]: unknown;
        };
        content?: never;
      };
    };
  };
  receiveNexusProductionSignal: {
    parameters: {
      query?: never;
      header: {
        Sign: string;
      };
      path?: never;
      cookie?: never;
    };
    requestBody: {
      content: {
        "application/json": {
          [key: string]: unknown;
        };
      };
    };
    responses: {
      /** @description Recognized status signal recorded, duplicate received, or authenticated unknown event ignored */
      204: {
        headers: {
          [name: string]: unknown;
        };
        content?: never;
      };
      /** @description Missing, ambiguous or incorrect signature */
      403: {
        headers: {
          [name: string]: unknown;
        };
        content?: never;
      };
      /** @description Connection is not configured in this application */
      404: {
        headers: {
          [name: string]: unknown;
        };
        content?: never;
      };
      /** @description Body exceeds the 256 KiB limit */
      413: {
        headers: {
          [name: string]: unknown;
        };
        content?: never;
      };
      /** @description Unsupported content type or encoding */
      415: {
        headers: {
          [name: string]: unknown;
        };
        content?: never;
      };
      /** @description Authenticated payload is invalid */
      422: {
        headers: {
          [name: string]: unknown;
        };
        content?: never;
      };
      /** @description Signal cannot be recorded or requires an unfinished interactive workflow; retry later */
      503: {
        headers: {
          [name: string]: unknown;
        };
        content?: never;
      };
    };
  };
  receiveVendoriaProductionSignal: {
    parameters: {
      query?: never;
      header: {
        Sign: string;
      };
      path?: never;
      cookie?: never;
    };
    requestBody: {
      content: {
        "application/json": {
          [key: string]: unknown;
        };
      };
    };
    responses: {
      /** @description Recognized status signal recorded, duplicate received, or authenticated unknown event ignored */
      204: {
        headers: {
          [name: string]: unknown;
        };
        content?: never;
      };
      /** @description Missing, ambiguous or incorrect signature */
      403: {
        headers: {
          [name: string]: unknown;
        };
        content?: never;
      };
      /** @description Connection is not configured in this application */
      404: {
        headers: {
          [name: string]: unknown;
        };
        content?: never;
      };
      /** @description Body exceeds the 256 KiB limit */
      413: {
        headers: {
          [name: string]: unknown;
        };
        content?: never;
      };
      /** @description Unsupported content type or encoding */
      415: {
        headers: {
          [name: string]: unknown;
        };
        content?: never;
      };
      /** @description Authenticated payload is invalid */
      422: {
        headers: {
          [name: string]: unknown;
        };
        content?: never;
      };
      /** @description Signal cannot be recorded or requires an unfinished interactive workflow; retry later */
      503: {
        headers: {
          [name: string]: unknown;
        };
        content?: never;
      };
    };
  };
}
