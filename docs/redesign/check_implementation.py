"""Validate the DI00 design-to-runtime inventory without claiming delivery."""

import json
from pathlib import Path

HERE = Path(__file__).resolve().parent
ROOT = HERE.parent.parent


def read(name):
    return json.loads((HERE / name).read_text())


def main():
    matrix = read("implementation-matrix.json")
    baseline = {row["id"]: row for row in read("design/screens.json")}
    rows = matrix["screens"]
    mapped = {row["id"]: row for row in rows}
    assert len(rows) == len(mapped), "Duplicate screen ID"
    assert set(baseline) <= set(mapped), "Missing accepted view"
    additions = {f"SH{i:02}" for i in range(1, 10)} | {
        f"NW{i:02}" for i in range(1, 7)
    }
    assert set(mapped) == set(baseline) | additions, "Unspecified addendum view"
    api = json.loads((ROOT / "backend/api/openapi.json").read_text())["paths"]
    families = matrix["apiFamilies"]
    for name, family in families.items():
        assert family["status"] in {"existing-adapt", "proposed", "implemented"}, name
        if family["status"] in {"existing-adapt", "implemented"}:
            assert set(family["paths"]) <= set(api), f"Unknown existing API: {name}"
    for row in rows:
        assert row["apiFamily"] in families, row["id"]
        assert row["mode"] in {"reuse", "adapt", "new"}, row["id"]
        assert row["status"] in {"planned", "in_progress", "verified"}, row["id"]
        assert row["phase"] in {f"DI{i:02}" for i in range(16)}, row["id"]
        assert row["targetRoute"].startswith("/") or row["targetRoute"] == "*", row["id"]
        assert row["states"] and row["scenarios"], row["id"]
        if row["status"] == "verified":
            assert row["evidence"], f"Verified without evidence: {row['id']}"
        if row["id"] in baseline:
            screen = baseline[row["id"]]
            assert row["baselineRoute"] == screen["route"], row["id"]
            assert row["states"] == [s["name"] for s in screen["states"]], row["id"]
    routes = read("implementation-routes.json")
    expected = {s["route"] for s in baseline.values()} - {
        "*", "/admin/login", "/booster/login"
    }
    assert len(routes) == len({r["route"] for r in routes}), "Duplicate legacy route"
    assert {r["route"] for r in routes} == expected, "Legacy route gap"
    for row in routes:
        assert set(row["screens"]) == {
            ident for ident, screen in baseline.items()
            if screen["route"] == row["route"]
        }, row["route"]
        assert row["strategy"] and row["contract"], row["route"]
    journeys = read("journey-evidence.json")
    accepted = {row["id"]: row for row in read("design/flows.json")}
    assert {row["id"] for row in journeys} == set(accepted) | {f"SN{i:02}" for i in range(1, 7)}, "Journey gap"
    assert len(journeys) == 37, "Duplicate journey"
    for journey in journeys:
        if journey["id"] in accepted:
            original = accepted[journey["id"]]
            assert journey["acceptedBranches"] == original["branches"], journey["id"]
            assert journey["acceptedDoneGuard"] == original["done"], journey["id"]
        assert journey["exceptionsAndDoneGuards"] and journey["browserEvidence"] and journey["domainEvidence"]
        for base, key in (("frontend/tests/e2e", "browserEvidence"), ("backend/internal/integration", "domainEvidence")):
            for name in journey[key]:
                assert Path(name).name == name and (ROOT / base / name).is_file(), name
    print("31 accepted + 6 addendum journeys mapped to existing scenario files; execution evidence remains separate.")
    print(
        f"DI00 coverage: {len(baseline)} accepted + {len(additions)} added views; "
        f"{len(routes)} preserved/transitioned route contracts."
    )
    print("Inventories valid. Runtime implementation/qualification remains separately tracked.")


if __name__ == "__main__":
    main()
