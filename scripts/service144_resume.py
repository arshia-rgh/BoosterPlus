"""One exact, owner-approved continuation of service144 full6.

Previously passed application checks are retained only for unchanged bytes.
The failed browser cases and remaining production checks need completed,
hash-bound evidence. Clean checkouts use the normal gate.
"""
import hashlib
import json
from pathlib import Path
import subprocess

BASE = "6b2cfb959b169ed89bbd47e133ff552f3fcae976"
MANIFEST_SHA = "313b432e897102a01b4bbd750d535f9ae229d5ca6abd895335071d468d645409"
LOG_SHA = "c40bba097e6c8d232ccdc0a4ca0c5b9bebc0b8579c332f08ab0dfb6be842b709"
PRODUCTION_LOG_SHA = "0d24353050e08ac7e5b188b8a754c1677655faeecf2da72daf138f441c07b996"
PRODUCTION_PROOF_SHA = "f6160bf03a0a15e75d2289fab18362e736a9eed40b2174f558b69676029f5dda"
FIXTURE_PATCH_SHA = "7f293edac6dd04baba20db1a048ec4e197650c5907d2d7feffe0329f2872158b"
FAILED_DATABASE_ARTIFACTS = {
    "database-retry1/state.json": "926a4348ca52b9d5e8a66ba478b79c261a0af4218ca253f10713af17e49d586c",
    "database-retry1/proof.json": "5eb2e4383b741cf7e616dbfaa80219345b41e6b35325d721d16e13af50d7cab8",
    "database-retry1/database.log": "d332834657a5d0b15e1d7713850bcb4a135fba74db42e2ad764a7cb45ef427c3",
    "database-retry1/fixture-unit.log": "24adda79e21044fef19cdc7f0606a9cd7770fc9a99c705a8622ee923c13bce5d",
    "database-retry1/run.py": "cc63545ee60e4de4d22a283591b5afa9cf8a88b8c1c749496f68b5ff87a933a0",
    "database-retry1/patch-manifest.json": "4d4a87229001f0b429c1d6fdacf7985afb0528e8d8c9e6d96e36fb5ba65bf12f",
    "database-retry1/before-manifest.json": "055830a8024c11ed4a19f511b9e5e5319e9f1098d7aca9fb6f3bf19a3647de84",
}
FIXTURE_ORIGINAL = {
    "production/deploy/self_hosted_test.py": "4e3259c3586bff43f3f1bb6290dc8edc184b623efa56b5701b7804a8c6056d2e",
    "production/deploy/test_self_hosted_fixture.py": "ebf051967d04a2034c793534c3980f58dd3feabde6f2e8eed732bc796eddb3fb",
}
RETAINED_PRODUCTION_STAGES = ["webmail_template", "deployment_unit", "gateway_build_scan",
                              "staging", "runtime_configuration", "infrastructure_audit"]
# Filled only after the remaining checks actually succeed; pending refuses reuse.
PROOF_SHA = "93e6ea9f7cac50122545ac8957b08ce6525d3fe251d903ee3ccedbdb728abc45"
BROWSER_PATHS = {"frontend/tests/e2e/" + name + ".spec.ts" for name in (
    "catalog-admin", "game-shell", "layout", "news", "orders")}
DOCUMENTATION = {"AGENTS.md", "docs/progress.md", "docs/service-experience-release-roadmap.md"}
EXTRA = BROWSER_PATHS | set(FIXTURE_ORIGINAL) | {"scripts/commit_gate.py", "scripts/service144_resume.py",
                       "scripts/test_service144_resume.py", "docs/service144-scoped-continuation.md"}
BROWSER_ARTIFACTS = {
    "browser.log", "state.json", "browser-manifest.json",
    "catalog-retry1/run.log", "catalog-retry1/state.json",
    "catalog-retry1/manifest.json", "catalog-retry1/before.json",
}
INTERRUPTED_ARTIFACTS = {
    "remaining-3.log", "remaining-state.json", "timeout-correction.json", "remaining.py",
}
REMAINING_COMMANDS = [
    ["make", "-C", "frontend", "docker-build", "image-security"],
    ["python3", "frontend/scripts/container-smoke.py"],
    ["make", "-C", "production", "self-hosted-test"],
]

def digest(data):
    return hashlib.sha256(data).hexdigest()

def validate_evidence(manifest, log, proof):
    if digest(manifest) != MANIFEST_SHA or digest(log) != LOG_SHA or digest(proof) != PROOF_SHA:
        raise ValueError("Service144 evidence was replaced, incomplete or not qualified")
    baseline, result = json.loads(manifest), json.loads(proof)
    if len(baseline) != 176 or result.get("base") != BASE or result.get("result") != "passed_remaining_checks" or result.get("production_modified") is not False:
        raise ValueError("Service144 remaining qualification has not passed")
    if result.get("baseline_manifest_sha256") != MANIFEST_SHA or result.get("baseline_log_sha256") != LOG_SHA:
        raise ValueError("Service144 baseline proof differs")
    if result.get("browser_state") != {"stage": "focused_browser_passed",
            "retained_from_first_retry": 8, "catalog_retry_passes": 2, "total": 10}:
        raise ValueError("Failed browser cases have not passed")
    if set(result.get("browser_evidence", {})) != BROWSER_ARTIFACTS:
        raise ValueError("Missing original or corrected browser evidence")
    if set(result.get("interrupted_production_attempt", {})) != INTERRUPTED_ARTIFACTS:
        raise ValueError("Missing interrupted production evidence")
    if result.get("failed_database_attempt") != FAILED_DATABASE_ARTIFACTS:
        raise ValueError("Missing or changed original database fixture failure")
    retained = result.get("retained_production", {})
    failed = retained.get("failed_step", {})
    if (retained.get("proof_sha256") != PRODUCTION_PROOF_SHA
            or retained.get("completed_before_failure") != RETAINED_PRODUCTION_STAGES
            or retained.get("failed_before_business_tests") is not True
            or failed.get("command") != ["make", "-C", "production", "pre-commit"]
            or failed.get("exit_code") != 2 or failed.get("log") != "remaining-3-retry1.log"
            or failed.get("log_sha256") != PRODUCTION_LOG_SHA):
        raise ValueError("Retained production stages do not match the original failed run")
    retry = result.get("database_retry", {})
    if (retry.get("unit_exit_code") != 0 or retry.get("patch_manifest_sha256") != FIXTURE_PATCH_SHA
            or retry.get("original_files") != FIXTURE_ORIGINAL):
        raise ValueError("Database fixture correction is unqualified or broader than approved")
    steps = result.get("steps", [])
    if [step.get("command") for step in steps] != REMAINING_COMMANDS or any(step.get("exit_code") != 0 for step in steps):
        raise ValueError("Missing or failed remaining check")
    sources = result.get("application_and_tests", {})
    if set(sources) != set(baseline) | BROWSER_PATHS | set(FIXTURE_ORIGINAL):
        raise ValueError("Qualified source inventory differs")
    for path, expected in baseline.items():
        if path not in BROWSER_PATHS and sources[path] != expected:
            raise ValueError("Previously passed application source changed")
    return baseline, result

def validate_changes(baseline, proof, changed, content):
    if set(changed) != set(baseline) | EXTRA:
        raise ValueError("Source change outside the owner-approved continuation")
    for path, expected in proof["application_and_tests"].items():
        if path not in DOCUMENTATION and digest(content(path)) != expected:
            raise ValueError("Qualified source changed: " + path)

def run_if_available():
    root = Path(__file__).resolve().parents[1]
    evidence = root / ".cache/qualification/service144-full6"
    if not evidence.exists():
        return False
    def git(*args):
        return subprocess.check_output(["git", *args], cwd=root)
    if git("rev-parse", "HEAD").decode().strip() != BASE:
        return False
    if evidence.is_symlink() or not evidence.is_dir():
        raise ValueError("Unsafe service144 evidence directory")
    def read(name, maximum=32 << 20):
        path = evidence / name
        if path.resolve() != path or not path.is_file() or path.stat().st_size > maximum:
            raise ValueError("Missing or unsafe qualification artifact")
        return path.read_bytes()
    baseline, proof = validate_evidence(read("manifest.json"), read("full6.log"), read("remaining-proof.json"))
    for name, expected in proof["browser_evidence"].items():
        if digest(read(name)) != expected:
            raise ValueError("Browser retry evidence differs: " + name)
    for name, expected in proof["interrupted_production_attempt"].items():
        if digest(read(name)) != expected:
            raise ValueError("Interrupted production evidence differs: " + name)
    retry = proof["database_retry"]
    for name, expected in {
        "remaining-3-retry1.log": PRODUCTION_LOG_SHA,
        "remaining-proof-production-retry1.json": PRODUCTION_PROOF_SHA,
        **FAILED_DATABASE_ARTIFACTS,
        "database-retry2/patch-manifest.json": FIXTURE_PATCH_SHA,
        "database-retry2/fixture-unit.log": retry["unit_log_sha256"],
        "database-retry2/business-integration.log": retry["business_log_sha256"],
        "database-retry2/run.py": retry["runner_sha256"],
    }.items():
        if digest(read(name, 64 << 20)) != expected:
            raise ValueError("Database continuation evidence differs: " + name)
    for name, step in zip(("remaining-1.log", "remaining-2.log", "database-retry2/database.log"), proof["steps"]):
        if step.get("log") != name or digest(read(name, 64 << 20)) != step.get("log_sha256"):
            raise ValueError("Remaining check evidence differs")
    changed = {p.decode() for p in git("diff", "--cached", "--no-renames", "--name-only", "-z", BASE).split(b"\0") if p}
    validate_changes(baseline, proof, changed, lambda path: git("show", ":" + path))
    for row in git("diff", "--cached", "--raw", "--no-renames", BASE).decode().splitlines():
        before, after = row.split()[:2]
        if before not in {":000000", ":100644"} or after != "100644":
            raise ValueError("Unexpected continuation file mode")
    if git("diff", "--name-only"):
        raise ValueError("Stage the reviewed source before qualification")
    used = evidence / "commit-receipt.json"
    if used.exists():
        raise ValueError("Continuation already consumed; inspect commit status")
    tree = git("write-tree").decode().strip()
    print("Service144 scoped continuation: unchanged passed checks retained; failed browser and remaining production checks passed separately", flush=True)
    for command in (
        ["make", "check-repository"],
        ["python3", "-m", "unittest", "discover", "-s", "scripts", "-p", "test_service144_resume.py"],
        ["make", "-C", "backend", "lint", "gosec", "vuln"],
        ["npm", "--prefix", "frontend", "run", "security"],
    ):
        subprocess.run(command, cwd=root, check=True)
    if git("write-tree").decode().strip() != tree or git("diff", "--name-only"):
        raise ValueError("Source changed during commit checks")
    validate_changes(baseline, proof, changed, lambda path: git("show", ":" + path))
    with used.open("x") as stream:
        json.dump({"base": BASE, "tree": tree, "baseline_log_sha256": LOG_SHA,
                   "completed_proof_sha256": PROOF_SHA, "result": "owner_approved_scoped_continuation"}, stream)
    print("Service144 exact-source scoped continuation passed through the normal tracked hook", flush=True)
    return True
