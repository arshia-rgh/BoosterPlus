"""Read-only HTTPS smoke checks; certificate verification is always enabled."""
import ssl
import urllib.error
import urllib.request


def client(ca=None):
    return urllib.request.build_opener(urllib.request.ProxyHandler({}), urllib.request.HTTPSHandler(context=ssl.create_default_context(cafile=ca)))


def public_smoke(origin, ca=None, *, admin_origin, booster_origin):
    opener = client(ca)
    routes = ((origin, "/", "PLAYORA"), (origin, "/games", "Find your game."), (origin, "/account", "Your account"),
              (admin_origin, "/login", "Admin sign-in"), (booster_origin, "/login", "Booster sign-in"))
    for host, path, text in routes:
        with opener.open(host + path, timeout=15) as response:
            body = response.read(2 << 20).decode()
            if response.status != 200 or text not in body:
                raise RuntimeError("Application route failed HTTPS smoke: " + path + " status=" + str(response.status))
            if "no-store" not in response.headers.get("Cache-Control", "") or "nonce-" not in response.headers.get("Content-Security-Policy", ""):
                raise RuntimeError("Private caching or nonce CSP missing")
            if not response.headers.get("Strict-Transport-Security"):
                raise RuntimeError("HTTPS forwarding did not preserve transport policy")
    request = urllib.request.Request(origin + "/api/v1/me", headers={"X-Booster-Proxy-Key": "forged", "X-Booster-Client-IP": "127.0.0.1", "X-Forwarded-For": "127.0.0.1"})
    try:
        opener.open(request, timeout=10)
        raise RuntimeError("Anonymous API request unexpectedly authorized")
    except urllib.error.HTTPError as error:
        if error.code != 401:
            raise RuntimeError("Unexpected private API response") from None
    print("HTTPS routing, trusted API boundary, private caching and security headers passed")
    portal_smoke(origin, admin_origin, booster_origin, ca)


class NoRedirect(urllib.request.HTTPRedirectHandler):
    def redirect_request(self, req, fp, code, msg, headers, newurl):
        return None


def portal_smoke(origin, admin_origin, booster_origin, ca=None):
    """Read-only public routing/session checks; never request mail or OAuth codes."""
    opener = urllib.request.build_opener(urllib.request.ProxyHandler({}), NoRedirect(),
                                        urllib.request.HTTPSHandler(context=ssl.create_default_context(cafile=ca)))
    for portal, target in (("admin", admin_origin), ("booster", booster_origin)):
        for method in ("GET", "HEAD"):
            try:
                opener.open(urllib.request.Request(origin + "/" + portal, method=method), timeout=15)
                raise RuntimeError("Legacy staff page did not redirect")
            except urllib.error.HTTPError as error:
                if error.code != 302 or error.headers.get("Location") != target + "/" or "no-store" not in error.headers.get("Cache-Control", ""):
                    raise RuntimeError("Legacy staff page did not use the exact uncached portal redirect") from None
    for portal, host in (("customer", origin), ("admin", admin_origin), ("booster", booster_origin)):
        request = urllib.request.Request(host + "/api/v1/auth/portals/" + portal + "/session", headers={"X-Playora-Portal": portal})
        with opener.open(request, timeout=15) as response:
            if response.status != 200 or "no-store" not in response.headers.get("Cache-Control", ""):
                raise RuntimeError("Portal session bootstrap failed")
            cookies = response.headers.get_all("Set-Cookie", [])
            if not cookies or any("domain=" in value.lower() or "; secure" not in value.lower() for value in cookies):
                raise RuntimeError("Portal session cookie must be secure and host-only")
        for other in {"customer", "admin", "booster"} - {portal}:
            request = urllib.request.Request(host + "/api/v1/auth/portals/" + other + "/session", headers={"X-Playora-Portal": other})
            try:
                opener.open(request, timeout=15)
                raise RuntimeError("A different portal's identity route was accepted on this host")
            except urllib.error.HTTPError as error:
                if error.code != 403 or error.headers.get("Location"):
                    raise RuntimeError("Unexpected cross-portal identity response") from None
    print("Separate portal HTTPS, safe legacy redirects, host-only cookies and identity origin isolation passed")


def redirect_smoke(http_origin, https_origin):
    try:
        with urllib.request.build_opener(urllib.request.ProxyHandler({}), NoRedirect()).open(http_origin + "/games?source=smoke", timeout=10):
            raise RuntimeError("HTTP did not redirect to HTTPS")
    except urllib.error.HTTPError as error:
        if error.code != 308 or error.headers.get("Location") != https_origin + "/games?source=smoke":
            raise RuntimeError("Gateway redirect lost the HTTPS origin or request path") from None
    print("HTTP redirect preserves path and query on the HTTPS origin")
