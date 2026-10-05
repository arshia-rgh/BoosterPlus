# PLAYORA mail DNS — owner setup

Open **Cloudflare → playoragames.com → DNS → Records → Add record**.
Add these two TXT records. TTL can remain Auto. These are public values; no
password or private key belongs in DNS.

## 1. SPF

- Type: **TXT**
- Name: **@**
- Content:

```text
v=spf1 ip4:195.248.241.192 -all
```

If an SPF record already exists at the root, update that single record instead
of adding a second SPF record. This policy authorizes only the selected server;
review it before using any other sender.

## 2. DKIM

- Type: **TXT**
- Name: **mail._domainkey**
- Content (copy the whole single line):

```text
v=DKIM1; k=rsa; p=MIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIBCgKCAQEAsM1Aix9724/ksDqwSdup0z2N9PkwRVAq3fZ9jD1dHPzilDKZ9YBbNbEBQiq4bYQv4bjItxRuh4eGYnMWUts3wxbEswNSl/GGTITYv8nuNsn+odgzsHoWn0TH1gS1J5cdfxjydoPr/j88MzVjh9oAPz1YCA0IJRrHxYBzbRNm7rL1MKzwaJ/9bbY9j7QWnkf92smOXOvS7QP+SmcFHWVyNfLeqmEZyfzgz4Kdhd/NhO24YH86xXbYpLgWevfbx1FVAXqE0D612Unij0Yq9tzBMlhjS/plDDehntGpSjeimELxk6KzLZOExELj5E1XClCnhGTigGvlOPMMo8wJXi7vwQIDAQAB
```

The matching RSA 2048 private key was generated with the official Rspamd helper,
verified against this public key and installed privately on the server. Publishing
this public value does not expose the private key. Do not regenerate the server
key after publishing this record without a coordinated DNS rotation.

## Publication verified — 4 October 2026

The owner saved both records. Independent queries through 1.1.1.1 and 8.8.8.8
returned exactly one matching SPF record and one matching DKIM record. DKIM TXT
segments were reassembled and compared byte-for-byte with the installed signing
identity’s public value. This verifies DNS publication, not message signing or
inbox delivery. Leave the verified website/mail A records and nameservers unchanged.

## 3. MX — receiving mail

The receiving port passed an external TLS/relay/postmaster-recipient check on
4 October 2026. Add this record now:

- Type: **MX**
- Name: **@**
- Mail server: **mail.playoragames.com**
- Priority: **10**
- TTL: **Auto**

Keep `mail` A as DNS-only. MX values are hostnames, without `https://` or a port.

## 4. Initial DMARC — approved by the owner on 4 October 2026

- Type: **TXT**
- Name: **_dmarc**
- Content:

```text
v=DMARC1; p=none
```

This initial policy requests no DMARC-based rejection while alignment is tested.
It has no `rua`/`ruf` destination: automatic aggregate/forensic reports remain
disabled until the owner chooses report retention. Inspect the authorized test
messages' authentication results directly. A later enforcement/reporting policy
requires an explicit update; this initial record is not full mail qualification.

Both new records were published by the owner and verified exactly through
1.1.1.1 and 8.8.8.8 on 4 October 2026. Both approved test messages have now been
submitted to SMTP. The separately authorized DMARC recheck was sent once at
13:55 Tehran on 4 October, with Gmail remote SMTP acceptance verified. The owner
subsequently confirmed Inbox placement and SPF, DKIM and DMARC all PASS for that
message. Earlier Spam/DMARC failure remains recorded in MAIL.md; this single
recipient had already marked an earlier test “not spam.” General deliverability
and application-message qualification remain separate. All approved sends are
consumed; no additional test message is authorized.
