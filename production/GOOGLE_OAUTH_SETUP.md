# PLAYORA Google sign-in setup

Create a project named PLAYORA at <https://console.cloud.google.com/>. In Google
Auth Platform, initialize Branding with app name PLAYORA and your existing
support/contact email. Select External audience. In Data Access request only
`openid` and `https://www.googleapis.com/auth/userinfo.email`, matching the
backend's OpenID/email scopes; no Gmail, Drive or Calendar permission is needed.

In Clients choose Create client, Web application, name PLAYORA website. Register
these exact Authorized redirect URIs, without trailing slashes:

```text
https://playoragames.com/api/v1/auth/portals/customer/google/callback
https://admin.playoragames.com/api/v1/auth/portals/admin/google/callback
https://pro.playoragames.com/api/v1/auth/portals/booster/google/callback
```

This implementation redirects through the backend, so a JavaScript origin is
not required. One client supports all three redirects; portal-bound challenges,
sessions and required staff MFA remain separate. Add the two staff callbacks to the existing client before cutover. Keep the customer callback unchanged; do not rename the path portion or add a trailing slash. Retire the old customer-host staff callbacks only after the new portals are verified. Existing browser cookies are host-only: staff sign in again on their new hostname. Never redirect an old OAuth callback with its code/state to another hostname.

Download the client JSON when creating the client. Keep it outside the repository
in a private directory, with file permissions 0600. Share only its absolute local
path with the deployment agent, never its contents. The agent installs
`GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET` in protected backend runtime
configuration; neither belongs in frontend settings or the example environment.

For testing, keep Audience in Testing and add your and your testers' Google
addresses under Test users. Before public availability, review Google's audience,
publishing and branding requirements. Where requested use authorized domain
`playoragames.com`, homepage `https://playoragames.com`, privacy page
`https://playoragames.com/privacy` and terms page `https://playoragames.com/terms`.
These pages must be actually accessible with approved content before treating
them as completed branding evidence. Do not claim Google's verification passed
merely because the client was created.

After installation qualify all three real callbacks, consent cancellation,
wrong-portal/expired challenge rejection, session isolation, account conflicts,
logout and staff second factor. Email sign-in is a separate configured path.

Checked 4 October 2026 against Google's [consent setup](https://developers.google.com/workspace/guides/configure-oauth-consent)
and [web-server OAuth instructions](https://developers.google.com/identity/protocols/oauth2/web-server).
