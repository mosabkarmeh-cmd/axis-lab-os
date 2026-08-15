import json
import urllib.request

BASE = "http://127.0.0.1:3000"
EMAIL = "admin@axislab.com"
TEMP_PASSWORD = "BootstrapPass123"
NEW_PASSWORD = "InventoryReportTest123"


def request(path, payload=None, token=None, method=None):
    data = None if payload is None else json.dumps(payload).encode()
    headers = {"Content-Type": "application/json"}
    if token:
        headers["Authorization"] = f"Bearer {token}"
    req = urllib.request.Request(BASE + path, data=data, headers=headers, method=method)
    with urllib.request.urlopen(req) as response:
        return json.load(response)


login = request("/api/auth/login", {"email": EMAIL, "password": TEMP_PASSWORD})
token = login["token"]
if login.get("user", {}).get("mustChangePassword"):
    changed = request(
        "/api/auth/change-password",
        {"currentPassword": TEMP_PASSWORD, "newPassword": NEW_PASSWORD},
        token,
        "POST",
    )
    if not changed.get("success"):
        raise RuntimeError(f"Password change failed: {changed}")
    login = request("/api/auth/login", {"email": EMAIL, "password": NEW_PASSWORD})
    token = login["token"]

materials_response = request("/api/materials", token=token)
materials = materials_response.get("materials", materials_response if isinstance(materials_response, list) else [])
rate = 135
rows = []
for material in materials:
    raw = float(material.get("pricePerUnit") or 0)
    usd = raw / rate if raw >= 10000 else raw
    inventory = material.get("inventory") or {}
    quantity = float(inventory.get("availableQuantity", material.get("stockQuantity", material.get("quantity", 0))) or 0)
    rows.append({
        "name": material.get("name"),
        "raw": raw,
        "usd": round(usd, 2),
        "syp": round(usd * rate),
        "quantity": quantity,
        "valueUSD": round(usd * quantity, 2),
        "valueSYP": round(usd * quantity * rate),
    })

print(json.dumps({
    "loginUser": login.get("user", {}).get("email"),
    "rate": rate,
    "count": len(rows),
    "materials": rows,
    "totalUSD": round(sum(row["valueUSD"] for row in rows), 2),
    "totalSYP": round(sum(row["valueSYP"] for row in rows)),
}, ensure_ascii=False, indent=2))
