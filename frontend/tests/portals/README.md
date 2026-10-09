# Split portal browser qualification

After building storefront, admin and booster with the normal pinned toolchain:

```sh
node --test tests/portals/browser.test.mjs
PLAYWRIGHT_ENGINE=webkit node --test tests/portals/browser.test.mjs
```

Run from `frontend/`. Both browsers must be installed using the pinned Playwright version. Chromium is the default; `PLAYWRIGHT_ENGINE=webkit` runs the same assertions with WebKit. The runner binds disposable local ports, starts the actual SSR server in test mode and resolves three distinct `.localhost` hostnames to loopback. Its backend is a read-only synthetic fixture, and the browser blocks every non-fixture origin. No production data, external messages or real payments are used.

Desktop and mobile journeys cover independent staff entries, root URLs, native admin order search, queue-to-record navigation, local record sections and retained drafts, browser history, reloads, unknown-route portal context, bundled assets, explicit storefront links, old path redirects and host-only cookie separation. Evidence stays under ignored `.cache/portal-browser/chromium/` and `.cache/portal-browser/webkit/`.

These checks qualify frontend routing and browser behavior only. They do not prove backend authorization, Google OAuth, authenticator validation or real device behavior. Keep the separate backend integration/security gate and real provider owner acceptance.
