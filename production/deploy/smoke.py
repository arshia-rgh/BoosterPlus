"""Read-only HTTPS smoke checks; certificate verification is always enabled."""
import ssl
import urllib.error
import urllib.request


def client(ca=None):
    return urllib.request.build_opener(urllib.request.HTTPSHandler(context=ssl.create_default_context(cafile=ca)))


def public_smoke(origin, ca=None):
    opener = client(ca)
    for path, text in (("/", "PLAYORA"), ("/games", "Choose your game"), ("/account", "Your account"), ("/admin", "Administration"), ("/admin/orders", "Order queue")):
        with opener.open(origin + path, timeout=15) as response:
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


class NoRedirect(urllib.request.HTTPRedirectHandler):
    def redirect_request(self, req, fp, code, msg, headers, newurl):
        return None


def redirect_smoke(http_origin, https_origin):
    try:
        with urllib.request.build_opener(NoRedirect()).open(http_origin + "/games?source=smoke", timeout=10):
            raise RuntimeError("HTTP did not redirect to HTTPS")
    except urllib.error.HTTPError as error:
        if error.code != 308 or error.headers.get("Location") != https_origin + "/games?source=smoke":
            raise RuntimeError("Gateway redirect lost the HTTPS origin or request path") from None
    print("HTTP redirect preserves path and query on the HTTPS origin")
