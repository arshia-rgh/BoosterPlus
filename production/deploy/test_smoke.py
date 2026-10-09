"""Portal qualification cannot pass redirects or cookies that cross boundaries."""
from email.message import Message
import unittest
from unittest.mock import patch
import urllib.error
from urllib.parse import urlsplit

from smoke import portal_smoke


class Response:
    status = 200

    def __init__(self, cookie="__Host-session=fixture; Path=/; Secure; HttpOnly; SameSite=Lax"):
        self.headers = Message()
        self.headers["Cache-Control"] = "no-store"
        self.headers["Set-Cookie"] = cookie

    def __enter__(self):
        return self

    def __exit__(self, *args):
        return False


class PortalSmokeTest(unittest.TestCase):
    origins = {"customer": "https://playora.test", "admin": "https://admin.playora.test", "booster": "https://booster.playora.test"}

    def opener(self, *, redirect=None, cookie=None, wrong_portal_allowed=False):
        origins = self.origins

        class Opener:
            def open(self, request, timeout):
                self.last_timeout = timeout
                url = urlsplit(request.full_url)
                headers = Message()
                if url.path in ("/admin", "/booster"):
                    headers["Location"] = redirect or origins[url.path[1:]] + "/"
                    headers["Cache-Control"] = "no-store"
                    raise urllib.error.HTTPError(request.full_url, 302, "redirect", headers, None)
                portal = url.path.split("/")[-2]
                if origins[portal] != "https://" + url.netloc and not wrong_portal_allowed:
                    raise urllib.error.HTTPError(request.full_url, 403, "wrong portal", headers, None)
                return Response(cookie) if cookie is not None else Response()

        return Opener()

    def check(self, **changes):
        with patch("smoke.urllib.request.build_opener", return_value=self.opener(**changes)):
            portal_smoke(self.origins["customer"], self.origins["admin"], self.origins["booster"])

    def test_exact_hosts_and_private_cookies_pass(self):
        self.check()

    def test_wrong_redirect_domain_or_lost_root_fails(self):
        for destination in ("https://foreign.test/", self.origins["admin"] + "/admin", "//admin.playora.test/"):
            with self.subTest(destination=destination), self.assertRaisesRegex(RuntimeError, "exact uncached"):
                self.check(redirect=destination)

    def test_shared_domain_and_insecure_cookies_fail(self):
        for cookie in ("session=fixture; Path=/; HttpOnly", "session=fixture; Secure; Domain=.playora.test"):
            with self.subTest(cookie=cookie), self.assertRaisesRegex(RuntimeError, "secure and host-only"):
                self.check(cookie=cookie)

    def test_wrong_portal_success_fails(self):
        with self.assertRaisesRegex(RuntimeError, "different portal"):
            self.check(wrong_portal_allowed=True)


if __name__ == "__main__":
    unittest.main()
