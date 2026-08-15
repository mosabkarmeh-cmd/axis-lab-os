import json
import urllib.request

BASE = "http://127.0.0.1:3000"
TEMP_PASSWORD = "BootstrapPass123"
NEW_PASSWORD = "InventoryReportTest123"

def request(path, payload=None, token=None):
    data = None if payload is None else json.dumps(payload).encode()
    headers = {"Content-Type": "application/json"}
    if token:
        headers["Authorization"] = f"Bearer {token}"
    req = urllib.request.Request(BASE + path, data=data, headers=headers)
    with urllib.request.urlopen(req) as response:
        return json.load(response)

try:
    login = request("/api/auth/login", {"email": "admin@axislab.com", "password": TEMP_PASSWORD})
except Exception:
    login = request("/api/auth/login", {"email": "admin@axislab.com", "password": NEW_PASSWORD})
token = login["token"]
if login.get("user", {}).get("mustChangePassword"):
    request("/api/auth/change-password", {"currentPassword": TEMP_PASSWORD, "newPassword": NEW_PASSWORD}, token)
    token = request("/api/auth/login", {"email": "admin@axislab.com", "password": NEW_PASSWORD})["token"]

analytics = request("/api/reports/analytics", token=token)["analytics"]
rate = 135
rows = analytics["inventory"]["stockStatus"]
checks = []
for row in rows:
    usd = float(row["stockValue"] or 0)
    syp = round(usd * rate)
    checks.append({"name": row["name"], "quantity": row["stockQuantity"], "stockValueUSD": round(usd, 2), "stockValueSYP": syp, "lowStock": row["isLowStock"]})

total_usd = float(analytics["inventory"]["totalInventoryValue"] or 0)
assert round(total_usd * rate) == sum(row["stockValueSYP"] for row in checks), "Report total does not equal sum of row values"
print(json.dumps({"rate": rate, "rows": checks, "totalUSD": round(total_usd, 2), "totalSYP": round(total_usd * rate), "status": "PASS"}, ensure_ascii=False, indent=2))
