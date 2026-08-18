#!/usr/bin/env python3
"""Recursively audit a Roblox community's ally graph and role lists.

Uses only public GET endpoints. No Roblox cookie or credentials are required.
The output is intended as source data for Communications Studio publishing
identity/permission planning.
"""

from __future__ import annotations

import json
import sys
import time
import urllib.error
import urllib.parse
import urllib.request
from collections import deque
from datetime import datetime, timezone
from pathlib import Path

ROOT_GROUP_ID = 12238375
BASE = "https://groups.roblox.com"
USER_AGENT = "USAR-Communications-Studio-Audit/1.0 (+https://github.com/nationalarchivesusar/communications-studio)"
TIMEOUT = 30
MAX_GROUPS = 500


def get_json(url: str):
    req = urllib.request.Request(url, headers={"User-Agent": USER_AGENT, "Accept": "application/json"})
    with urllib.request.urlopen(req, timeout=TIMEOUT) as resp:
        raw = resp.read().decode("utf-8", errors="replace")
        return resp.status, json.loads(raw)


def safe_get(url: str):
    try:
        status, data = get_json(url)
        return {"ok": True, "status": status, "data": data, "url": url}
    except urllib.error.HTTPError as exc:
        body = exc.read().decode("utf-8", errors="replace")
        try:
            parsed = json.loads(body)
        except Exception:
            parsed = body[:2000]
        return {"ok": False, "status": exc.code, "error": parsed, "url": url}
    except Exception as exc:
        return {"ok": False, "status": None, "error": repr(exc), "url": url}


def fetch_group(group_id: int):
    return safe_get(f"{BASE}/v1/groups/{group_id}")


def fetch_roles(group_id: int):
    return safe_get(f"{BASE}/v1/groups/{group_id}/roles")


def extract_related_groups(payload):
    """Best-effort parser for Roblox relationship response shapes."""
    if not isinstance(payload, dict):
        return [], None

    candidates = None
    for key in ("relatedGroups", "data", "groups"):
        value = payload.get(key)
        if isinstance(value, list):
            candidates = value
            break
    if candidates is None:
        candidates = []

    out = []
    for item in candidates:
        if not isinstance(item, dict):
            continue
        # Known relationship APIs have returned either direct group objects or
        # wrappers containing a `group` field.
        group = item.get("group") if isinstance(item.get("group"), dict) else item
        gid = group.get("id") or group.get("groupId") or group.get("group_id")
        try:
            gid = int(gid)
        except Exception:
            continue
        out.append({
            "id": gid,
            "name": group.get("name"),
            "memberCount": group.get("memberCount") or group.get("member_count"),
            "raw": item,
        })

    next_index = payload.get("nextRowIndex")
    if next_index is None:
        next_index = payload.get("nextPageCursor") or payload.get("nextPage")
    return out, next_index


def fetch_allies(group_id: int):
    """Fetch all allies, trying documented/legacy query shapes."""
    all_groups = []
    seen_ids = set()
    attempts_log = []

    # First try the long-standing Groups API relationship endpoint.
    start = 0
    for _page in range(20):
        params = urllib.parse.urlencode({
            "model.startRowIndex": start,
            "model.maxRows": 100,
        })
        url = f"{BASE}/v1/groups/{group_id}/relationships/allies?{params}"
        res = safe_get(url)
        attempts_log.append({k: res.get(k) for k in ("url", "ok", "status", "error") if k in res})
        if not res["ok"]:
            break
        groups, next_index = extract_related_groups(res["data"])
        for g in groups:
            if g["id"] not in seen_ids:
                seen_ids.add(g["id"])
                all_groups.append(g)
        # Many versions expose nextRowIndex. If absent, a short page means done.
        if next_index is None:
            if len(groups) < 100:
                return all_groups, attempts_log
            start += len(groups)
        else:
            try:
                nxt = int(next_index)
            except Exception:
                return all_groups, attempts_log
            if nxt <= start or not groups:
                return all_groups, attempts_log
            start = nxt

    if all_groups:
        return all_groups, attempts_log

    # Fallback query shape used by some wrappers/versions.
    start = 0
    for _page in range(20):
        params = urllib.parse.urlencode({"startRowIndex": start, "maxRows": 100})
        url = f"{BASE}/v1/groups/{group_id}/relationships/allies?{params}"
        res = safe_get(url)
        attempts_log.append({k: res.get(k) for k in ("url", "ok", "status", "error") if k in res})
        if not res["ok"]:
            break
        groups, next_index = extract_related_groups(res["data"])
        for g in groups:
            if g["id"] not in seen_ids:
                seen_ids.add(g["id"])
                all_groups.append(g)
        if next_index is None:
            if len(groups) < 100:
                break
            start += len(groups)
        else:
            try:
                nxt = int(next_index)
            except Exception:
                break
            if nxt <= start or not groups:
                break
            start = nxt

    return all_groups, attempts_log


def compact_roles(response):
    if not response.get("ok"):
        return []
    data = response.get("data")
    roles = data.get("roles", []) if isinstance(data, dict) else []
    out = []
    for role in roles:
        if not isinstance(role, dict):
            continue
        out.append({
            "id": role.get("id"),
            "name": role.get("name"),
            "rank": role.get("rank"),
            "memberCount": role.get("memberCount"),
        })
    return out


def compact_group(response, fallback_id):
    if not response.get("ok") or not isinstance(response.get("data"), dict):
        return {"id": fallback_id, "name": None}
    d = response["data"]
    owner = d.get("owner") if isinstance(d.get("owner"), dict) else None
    return {
        "id": d.get("id", fallback_id),
        "name": d.get("name"),
        "description": d.get("description"),
        "memberCount": d.get("memberCount"),
        "owner": owner,
        "hasVerifiedBadge": d.get("hasVerifiedBadge"),
        "publicEntryAllowed": d.get("publicEntryAllowed"),
    }


def main():
    queue = deque([(ROOT_GROUP_ID, 0, None)])
    visited = set()
    records = {}
    edges = []

    while queue and len(visited) < MAX_GROUPS:
        group_id, depth, discovered_from = queue.popleft()
        if group_id in visited:
            continue
        visited.add(group_id)
        print(f"Auditing group {group_id} at depth {depth}", flush=True)

        group_res = fetch_group(group_id)
        roles_res = fetch_roles(group_id)
        allies, ally_attempts = fetch_allies(group_id)

        group = compact_group(group_res, group_id)
        records[str(group_id)] = {
            "group": group,
            "depth": depth,
            "discoveredFrom": discovered_from,
            "roles": compact_roles(roles_res),
            "allies": [{k: g.get(k) for k in ("id", "name", "memberCount")} for g in allies],
            "errors": {
                "group": None if group_res.get("ok") else {"status": group_res.get("status"), "error": group_res.get("error")},
                "roles": None if roles_res.get("ok") else {"status": roles_res.get("status"), "error": roles_res.get("error")},
                "allies": ally_attempts if not allies else None,
            },
        }

        for ally in allies:
            aid = ally["id"]
            edges.append({"from": group_id, "to": aid})
            if aid not in visited:
                queue.append((aid, depth + 1, group_id))

        time.sleep(0.12)

    output = {
        "generatedAt": datetime.now(timezone.utc).isoformat(),
        "rootGroupId": ROOT_GROUP_ID,
        "groupCount": len(records),
        "maxGroups": MAX_GROUPS,
        "truncated": bool(queue),
        "groups": records,
        "edges": edges,
    }

    out = Path("audit-output")
    out.mkdir(exist_ok=True)
    (out / "roblox-org-audit.json").write_text(json.dumps(output, indent=2, ensure_ascii=False), encoding="utf-8")

    # Human-readable compact report for quick inspection in logs/artifact.
    lines = [f"Roblox organization audit — {len(records)} groups", ""]
    for rec in sorted(records.values(), key=lambda r: (r["depth"], (r["group"].get("name") or "").lower())):
        g = rec["group"]
        lines.append(f"## depth {rec['depth']} — {g.get('name') or '[unknown]'} ({g.get('id')})")
        lines.append("Roles: " + ", ".join(f"{x.get('name')} [rank {x.get('rank')}]" for x in rec["roles"]) if rec["roles"] else "Roles: [none/error]")
        lines.append("Allies: " + ", ".join(f"{x.get('name') or '[unknown]'} ({x.get('id')})" for x in rec["allies"]) if rec["allies"] else "Allies: [none/error]")
        lines.append("")
    (out / "roblox-org-audit.md").write_text("\n".join(lines), encoding="utf-8")

    print(json.dumps({"groupCount": len(records), "truncated": bool(queue)}, indent=2), flush=True)
    return 0


if __name__ == "__main__":
    sys.exit(main())
