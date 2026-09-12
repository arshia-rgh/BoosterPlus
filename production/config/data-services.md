# Data services and operating limits

Production Compose intentionally contains no database, object store or mail catcher. Supply managed TiDB and S3 endpoints with verified TLS, actual bucket access policy, a real transactional SMTP service and private credentials. Database runtime identity needs SELECT/INSERT/UPDATE/DELETE in the application schema; the separate migration identity needs the reviewed DDL privileges. Never distribute its credentials to API, worker or frontend.

Self-managed TiDB requires a separately operated PD/TiKV/TiDB deployment, persistent SSD storage, cluster TLS, monitoring, backups and independent failure domains. Three replicas on one host do not provide disaster tolerance. R10/R11 must qualify query plans, migration duration, load and recovery for the actual topology. The staging unistore database is a disposable test fixture only.

Object storage must prevent public bucket/object access and restrict application credentials to `media/`. Existing media quarantine/clean lifecycle, checksum validation, scanning and authorization stay in the backend. Apply versioning/retention consistent with the approved privacy policy and recovery plan; blindly expiring encrypted records or clean files can break live orders. The deployment dependency probe briefly uses a random `media/checks/` key and always attempts deletion, including after ambiguous writes. Monitor failed probe cleanup.

ClamAV is the sole local data helper in production. Reserve its documented memory budget, persist only signatures and share its Unix socket with API/worker. It needs outbound signature updates; no public scanner port is opened. Signature cache is not a customer-data backup. The existing upload scanner rejects definitions older than 72 hours and fails closed on scanner outages.

R10 owns off-host encrypted SQL/media backup automation, RPO/RTO configuration, actual restore rehearsals, rollback/upgrade drills, monitoring/alerts and secret rotation. Before any real production rollout, operators must have recoverable data/keys and a verified backup process. The R04 stack alone makes no durability or availability promise.
