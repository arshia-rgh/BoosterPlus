# Connecting playoragames.com

Owner-selected domain, 4 October 2026. Registrar: Server.ir. Primary server: ParsPack Germany, `195.248.241.192`. This document contains public DNS values only. The owner's existing external contact inbox is stored in a private server file, outside Git.

## 1. Active DNS at Cloudflare

Server.ir confirmed that DNS zone hosting is unavailable with the owner's domain-only arrangement, despite showing a record editor. The owner enabled Cloudflare DNS and changed the registrar's nameservers. No domain transfer was needed.

Verified through public resolvers on 4 October 2026:

| Record | Verified value |
| --- | --- |
| Nameservers | `ajay.ns.cloudflare.com`, `raina.ns.cloudflare.com` |
| `playoragames.com` A | `195.248.241.192` |
| `mail.playoragames.com` A | `195.248.241.192` |

Manage future A/MX/TXT records in **Cloudflare → playoragames.com → DNS → Records**, not Server.ir's inactive record editor. Both current A records use DNS-only routing. Keep mail DNS-only permanently; review website proxying separately against trusted proxy and client-IP controls. Do not publish IPv6 until its routing and mail reverse DNS are qualified.

The earlier default delegation to `ns1.ipeserver6.com`/`ns2.ipeserver6.com` returned SERVFAIL; it has been replaced. The verified DNS result does not establish application launch readiness.

## 2. Mail reverse DNS at ParsPack

The owner requested PTR from ParsPack. Public resolvers confirm:

`195.248.241.192 → mail.playoragames.com → 195.248.241.192`

Forward and reverse IPv4 resolution agree. MX/SPF/DKIM/DMARC, mailbox provisioning and inbox delivery remain separate qualification items. The DKIM record must use the actual generated public key; never copy a private key into DNS.

## HTTPS bootstrap receipt

On4October2026, the isolated bootstrap gateway obtained publicly trusted
Let’s Encrypt certificates for both names. Independent HTTPS requests verified
hostname/trust and the intended responses: website 503 maintenance, mail 404.
Only ports 80/443 were added to the existing SSH-preserving firewall. No
application/data network, reverse proxy, public SMTP or checkout is enabled.
Certificates expire 2 January 2027; automatic renewal remains to be qualified.
Stop the bootstrap project before the signed release gateway binds those ports;
reuse the protected gateway certificate directory without regenerating keys.

## 3. Existing external contact inbox

Use the owner-provided existing inbox for operational contact and certificate configuration. It must remain reachable when PLAYORA's own server is unavailable. Providing an address is not evidence that alert delivery or independent outage detection has passed. No password is needed in chat. The actual address is deliberately omitted here.

## 4. ParsPack backup option

The owner reports an automatic backup option stored on another server. Its actual schedule, retention, isolation, export and restore behavior have not been verified. A provider image backup may be useful, but it does not yet qualify consistent TiDB/media recovery or the15-minute recovery-point target.

Suggested ParsPack support ticket:

> برای سرورم می‌خواهم بکاپ خارج از سرور اصلی داشته باشم. بکاپ خودکار شما هر چند ساعت گرفته می‌شود، چند نسخه و چند روز نگهداری می‌شود، و آیا پس از خرابی یا حذف سرور اصلی همچنان قابل بازیابی است؟ آیا می‌توان آن را بدون بازنویسی سرور اصلی روی یک سرور مجزا بازیابی یا دانلود کرد؟ آیا همه دیسک‌ها و داده‌های Docker را شامل می‌شود؟ آیا فضای Object Storage سازگار با S3 با HTTPS و دسترسی خصوصی هم ارائه می‌کنید تا بکاپ رمزگذاری‌شده دیتابیس و فایل‌های برنامه را مستقیم در آن ذخیره کنیم؟ لطفاً محل ذخیره‌سازی، ظرفیت و هزینه را هم اعلام کنید.

The implemented recovery tooling expects private HTTPS S3-compatible off-host storage for encrypted archives and TiDB logs. Do not count a provider snapshot as this S3 destination unless that capability is actually supplied. A restore into an isolated target, key recovery and measured timings remain mandatory. Do not restore onto the primary server just to test the backup feature.

Reference: [Cloudflare primary DNS setup](https://developers.cloudflare.com/dns/zone-setups/full-setup/setup/).
