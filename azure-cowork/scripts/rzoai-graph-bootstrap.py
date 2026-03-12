#!/usr/bin/env python3
"""
RZOAI Graph API Bootstrap — Verify and establish Graph API connectivity from inside the VM.

Run this after rzoai-entra-join.ps1 completes.

This script:
  1. Authenticates to the ReZonAi tenant using SP agent credentials from env vars
  2. Verifies connectivity to all 18 user agents and 8 SP agents
  3. Tests mail send capability via rzoai-clawcog
  4. Reports health status for KSM step 1 (Perceive)
  5. Writes a local health report for Autognosis consumption

Environment Variables Required:
    RZOAI_TENANT_ID           — ReZonAi tenant ID (default: 6a5b8c74-51fa-4950-9a13-0fe9cfad1134)
    RZOAI_MASTER_CLIENT_ID    — Master app client ID
    RZOAI_MASTER_SECRET       — Master app client secret
    RZOAI_INGESTION_CLIENT_ID — Ingestion SP client ID
    RZOAI_INGESTION_SECRET    — Ingestion SP client secret
    RZOAI_CLAWCOG_CLIENT_ID   — Clawcog SP client ID (for mail send)
    RZOAI_CLAWCOG_SECRET      — Clawcog SP client secret

    For --full mode (SP auth checks), also set:
    RZOAI_AUTOGNOSIS_CLIENT_ID / RZOAI_AUTOGNOSIS_SECRET
    RZOAI_ECAN_CLIENT_ID / RZOAI_ECAN_SECRET
    RZOAI_RESERVOIR_CLIENT_ID / RZOAI_RESERVOIR_SECRET
    RZOAI_MOSES_CLIENT_ID / RZOAI_MOSES_SECRET
    RZOAI_CEO_CLIENT_ID / RZOAI_CEO_SECRET
    RZOAI_EMAIL_WORKER_CLIENT_ID / RZOAI_EMAIL_WORKER_SECRET

Usage:
    python rzoai-graph-bootstrap.py
    python rzoai-graph-bootstrap.py --full    # Include SP agent health checks
    python rzoai-graph-bootstrap.py --notify  # Send status email via rzoai-clawcog
"""

import argparse
import json
import os
import sys
import time
from datetime import datetime, timezone

try:
    import requests
except ImportError:
    print("ERROR: 'requests' package not installed. Run: pip install requests")
    sys.exit(1)


# =============================================================================
# CONFIGURATION — All credentials from environment variables
# =============================================================================

TENANT_ID = os.environ.get("RZOAI_TENANT_ID", "6a5b8c74-51fa-4950-9a13-0fe9cfad1134")
TOKEN_URL = f"https://login.microsoftonline.com/{TENANT_ID}/oauth2/v2.0/token"
GRAPH_BASE = "https://graph.microsoft.com/v1.0"

# Expected user agents
EXPECTED_USERS = [
    "9@rzo.ai", "a@rzo.ai", "c@rzo.ai", "d@rzo.ai", "e@rzo.ai",
    "i@rzo.ai", "j@rzo.ai", "m@rzo.ai", "o@rzo.ai", "p@rzo.ai",
    "r@rzo.ai", "s@rzo.ai", "u@rzo.ai", "v@rzo.ai", "w@rzo.ai",
    "x@rzo.ai", "y@rzo.ai", "z@rzo.ai"
]

# Expected SP agents
EXPECTED_SP_AGENTS = [
    {"name": "rzoai-autognosis", "role": "Meta-Cognitive Self-Monitor", "env_prefix": "RZOAI_AUTOGNOSIS"},
    {"name": "rzoai-ecan", "role": "Attention Economics", "env_prefix": "RZOAI_ECAN"},
    {"name": "rzoai-reservoir", "role": "Deep Tree ESN", "env_prefix": "RZOAI_RESERVOIR"},
    {"name": "rzoai-moses", "role": "Evolutionary Pattern Mining", "env_prefix": "RZOAI_MOSES"},
    {"name": "rzoai-ceo", "role": "Cognitive Execution Orchestration", "env_prefix": "RZOAI_CEO"},
    {"name": "rzoai-ingestion", "role": "Data Ingestion Pipeline", "env_prefix": "RZOAI_INGESTION"},
    {"name": "rzoai-clawcog", "role": "Multi-Channel Messaging Gateway", "env_prefix": "RZOAI_CLAWCOG"},
    {"name": "rzoai-email-worker", "role": "Cloudflare Email Router", "env_prefix": "RZOAI_EMAIL_WORKER"},
]

# Expected groups
EXPECTED_GROUPS = [
    "Autognosis-Admins", "KSM-Operators", "DevOps-Agents",
    "Memory-Agents", "Channel-Agents", "Executive-Agents",
    "Ingestion-Agents", "All-Agents", "Autognosis-Observers",
    "Autogenesis-Creators"
]


def get_sp_creds(env_prefix: str) -> tuple:
    """Get SP agent credentials from environment variables."""
    client_id = os.environ.get(f"{env_prefix}_CLIENT_ID", "")
    secret = os.environ.get(f"{env_prefix}_SECRET", "")
    return client_id, secret


# =============================================================================
# AUTHENTICATION
# =============================================================================

def get_token(client_id: str, client_secret: str) -> str:
    """Acquire an OAuth2 client_credentials token for the ReZonAi tenant."""
    if not client_id or not client_secret:
        raise RuntimeError("Missing client_id or client_secret")
    resp = requests.post(TOKEN_URL, data={
        "client_id": client_id,
        "client_secret": client_secret,
        "scope": "https://graph.microsoft.com/.default",
        "grant_type": "client_credentials"
    })
    data = resp.json()
    if "access_token" in data:
        return data["access_token"]
    raise RuntimeError(f"Token acquisition failed: {data.get('error_description', data)}")


def graph_get(token: str, endpoint: str, params: dict = None) -> dict:
    """Make a GET request to the Graph API."""
    headers = {"Authorization": f"Bearer {token}", "Content-Type": "application/json"}
    resp = requests.get(f"{GRAPH_BASE}/{endpoint}", headers=headers, params=params)
    if resp.ok:
        return resp.json()
    return {"error": resp.status_code, "message": resp.text[:500]}


# =============================================================================
# HEALTH CHECKS
# =============================================================================

def check_organization(token: str) -> dict:
    """Verify organization identity."""
    data = graph_get(token, "organization")
    orgs = data.get("value", [])
    if orgs:
        org = orgs[0]
        domains = [d["name"] for d in org.get("verifiedDomains", [])]
        return {
            "status": "OK",
            "displayName": org.get("displayName"),
            "tenantId": org.get("id"),
            "domains": domains
        }
    return {"status": "FAIL", "error": "No organization data"}


def check_users(token: str) -> dict:
    """Verify all 18 user agents exist and are enabled."""
    data = graph_get(token, "users", {
        "$select": "userPrincipalName,accountEnabled,displayName",
        "$top": "50"
    })
    users = data.get("value", [])
    found_upns = {u["userPrincipalName"] for u in users}

    results = []
    for expected in EXPECTED_USERS:
        present = expected in found_upns
        enabled = False
        if present:
            user = next(u for u in users if u["userPrincipalName"] == expected)
            enabled = user.get("accountEnabled", False)
        results.append({"upn": expected, "present": present, "enabled": enabled})

    ok_count = sum(1 for r in results if r["present"] and r["enabled"])
    return {
        "status": "OK" if ok_count == len(EXPECTED_USERS) else "DEGRADED",
        "total_expected": len(EXPECTED_USERS),
        "total_ok": ok_count,
        "users": results
    }


def check_groups(token: str) -> dict:
    """Verify all 10 groups exist."""
    data = graph_get(token, "groups", {"$select": "displayName,id", "$top": "50"})
    groups = data.get("value", [])
    found_names = {g["displayName"] for g in groups}

    results = []
    for expected in EXPECTED_GROUPS:
        results.append({"name": expected, "present": expected in found_names})

    ok_count = sum(1 for r in results if r["present"])
    return {
        "status": "OK" if ok_count == len(EXPECTED_GROUPS) else "DEGRADED",
        "total_expected": len(EXPECTED_GROUPS),
        "total_ok": ok_count,
        "groups": results
    }


def check_applications(token: str) -> dict:
    """Verify SP agent applications exist."""
    data = graph_get(token, "applications", {"$select": "displayName,appId", "$top": "50"})
    apps = data.get("value", [])
    found_names = {a["displayName"] for a in apps}

    results = []
    for expected in EXPECTED_SP_AGENTS:
        results.append({
            "name": expected["name"],
            "role": expected["role"],
            "present": expected["name"] in found_names
        })

    ok_count = sum(1 for r in results if r["present"])
    return {
        "status": "OK" if ok_count == len(EXPECTED_SP_AGENTS) else "DEGRADED",
        "total_expected": len(EXPECTED_SP_AGENTS),
        "total_ok": ok_count,
        "agents": results
    }


def check_sp_auth() -> dict:
    """Test authentication for each SP agent using env var credentials."""
    results = []
    for agent in EXPECTED_SP_AGENTS:
        cid, csec = get_sp_creds(agent["env_prefix"])
        if cid and csec:
            try:
                token = get_token(cid, csec)
                org = graph_get(token, "organization")
                auth_ok = "value" in org
                results.append({"name": agent["name"], "auth": auth_ok, "error": None})
            except Exception as e:
                results.append({"name": agent["name"], "auth": False, "error": str(e)[:200]})
        else:
            results.append({
                "name": agent["name"],
                "auth": False,
                "error": f"Missing env vars: {agent['env_prefix']}_CLIENT_ID / {agent['env_prefix']}_SECRET"
            })

    configured = [r for r in results if r["error"] is None or "Missing env" not in (r["error"] or "")]
    ok_count = sum(1 for r in results if r["auth"])
    total = len(configured) if configured else len(results)
    return {
        "status": "OK" if ok_count == total and total > 0 else "DEGRADED" if ok_count > 0 else "UNCONFIGURED",
        "total_expected": len(EXPECTED_SP_AGENTS),
        "total_configured": len(configured),
        "total_ok": ok_count,
        "agents": results
    }


# =============================================================================
# NOTIFICATION
# =============================================================================

def send_status_email(report: dict) -> bool:
    """Send health report email via rzoai-clawcog SP agent."""
    cid, csec = get_sp_creds("RZOAI_CLAWCOG")
    if not cid or not csec:
        print("  [WARN] RZOAI_CLAWCOG credentials not set — cannot send email")
        return False

    try:
        token = get_token(cid, csec)
    except Exception as e:
        print(f"  [WARN] Cannot acquire clawcog token: {e}")
        return False

    body_lines = [
        "<h2>ReZonAi VM Health Report</h2>",
        f"<p><b>Timestamp:</b> {report['timestamp']}</p>",
        f"<p><b>Hostname:</b> {report.get('hostname', 'unknown')}</p>",
        "<h3>Component Status</h3>",
        "<table border='1' cellpadding='5'>",
        "<tr><th>Component</th><th>Status</th><th>Details</th></tr>",
    ]

    for component, data in report.get("checks", {}).items():
        status = data.get("status", "UNKNOWN")
        color = "green" if status == "OK" else "orange" if status == "DEGRADED" else "red"
        details = f"{data['total_ok']}/{data['total_expected']}" if "total_ok" in data else ""
        body_lines.append(f"<tr><td>{component}</td><td style='color:{color}'><b>{status}</b></td><td>{details}</td></tr>")

    body_lines.extend(["</table>", "<p><i>Generated by rzoai-graph-bootstrap.py — KSM Step 1 (Perceive)</i></p>"])

    headers = {"Authorization": f"Bearer {token}", "Content-Type": "application/json"}
    mail_payload = {
        "message": {
            "subject": f"[ReZonAi] VM Health Report — {report['timestamp'][:10]}",
            "body": {"contentType": "HTML", "content": "\n".join(body_lines)},
            "toRecipients": [{"emailAddress": {"address": "d@rzo.ai"}}]
        },
        "saveToSentItems": False
    }

    resp = requests.post(f"{GRAPH_BASE}/users/d@rzo.ai/sendMail", headers=headers, json=mail_payload)
    if resp.status_code == 202:
        print("  [OK] Health report email sent to d@rzo.ai")
        return True
    else:
        print(f"  [WARN] Email send failed: {resp.status_code} — {resp.text[:200]}")
        return False


# =============================================================================
# MAIN
# =============================================================================

def main():
    parser = argparse.ArgumentParser(description="ReZonAi Graph API Bootstrap")
    parser.add_argument("--full", action="store_true", help="Include SP agent auth checks")
    parser.add_argument("--notify", action="store_true", help="Send status email via clawcog")
    parser.add_argument("--output", default=None, help="Output JSON report path")
    args = parser.parse_args()

    print("=" * 60)
    print("  RZOAI GRAPH API BOOTSTRAP")
    print("=" * 60)
    print(f"  Tenant: ReZonAi ({TENANT_ID})")
    print(f"  Time:   {datetime.now(timezone.utc).isoformat()}")
    print("=" * 60)

    # Determine which credentials to use for initial auth
    master_cid, master_sec = get_sp_creds("RZOAI_MASTER")
    ingest_cid, ingest_sec = get_sp_creds("RZOAI_INGESTION")

    # Try master first, then ingestion
    token = None
    print("\n[1/5] Authenticating...")
    for label, cid, sec in [("master app", master_cid, master_sec), ("ingestion SP", ingest_cid, ingest_sec)]:
        if cid and sec:
            try:
                token = get_token(cid, sec)
                print(f"  [OK] Authenticated via {label}")
                break
            except Exception as e:
                print(f"  [WARN] {label} auth failed: {e}")

    if not token:
        print("  [FAIL] No valid credentials found. Set RZOAI_MASTER_CLIENT_ID/SECRET or RZOAI_INGESTION_CLIENT_ID/SECRET")
        sys.exit(1)

    # Run health checks
    report = {
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "hostname": os.environ.get("COMPUTERNAME", os.environ.get("HOSTNAME", "unknown")),
        "tenant_id": TENANT_ID,
        "checks": {}
    }

    print("[2/5] Checking organization...")
    report["checks"]["organization"] = check_organization(token)
    org = report["checks"]["organization"]
    print(f"  [{org['status']}] {org.get('displayName', 'N/A')} — domains: {', '.join(org.get('domains', []))}")

    print("[3/5] Checking user agents...")
    report["checks"]["users"] = check_users(token)
    users = report["checks"]["users"]
    print(f"  [{users['status']}] {users['total_ok']}/{users['total_expected']} users active")

    print("[3/5] Checking groups...")
    report["checks"]["groups"] = check_groups(token)
    groups = report["checks"]["groups"]
    print(f"  [{groups['status']}] {groups['total_ok']}/{groups['total_expected']} groups present")

    print("[3/5] Checking SP agent applications...")
    report["checks"]["applications"] = check_applications(token)
    apps = report["checks"]["applications"]
    print(f"  [{apps['status']}] {apps['total_ok']}/{apps['total_expected']} SP agents registered")

    if args.full:
        print("[4/5] Checking SP agent authentication (full mode)...")
        report["checks"]["sp_auth"] = check_sp_auth()
        sp = report["checks"]["sp_auth"]
        print(f"  [{sp['status']}] {sp['total_ok']}/{sp['total_expected']} SP agents authenticated ({sp['total_configured']} configured)")
        for agent in sp["agents"]:
            status = "OK" if agent["auth"] else "FAIL"
            err = f" — {agent['error']}" if agent.get("error") else ""
            print(f"    {agent['name']:25s} [{status}]{err}")

    # Overall status
    all_statuses = [c["status"] for c in report["checks"].values()]
    if all(s == "OK" for s in all_statuses):
        report["overall"] = "HEALTHY"
    elif any(s == "FAIL" for s in all_statuses):
        report["overall"] = "CRITICAL"
    else:
        report["overall"] = "DEGRADED"

    print(f"\n[5/5] Overall status: {report['overall']}")

    # Write report
    output_path = args.output or os.path.join(
        os.environ.get("USERPROFILE", os.path.expanduser("~")),
        "Desktop", "rzoai-health-report.json"
    )
    try:
        with open(output_path, "w") as f:
            json.dump(report, f, indent=2)
        print(f"  Report saved to: {output_path}")
    except Exception as e:
        print(f"  [WARN] Could not save report: {e}")
        print(json.dumps(report, indent=2))

    if args.notify:
        print("\nSending status notification...")
        send_status_email(report)

    print("\n" + "=" * 60)
    print("  BOOTSTRAP COMPLETE")
    print("=" * 60)

    return 0 if report["overall"] in ("HEALTHY", "DEGRADED") else 1


if __name__ == "__main__":
    sys.exit(main())
