import json
import urllib.request

BASE = "http://127.0.0.1:3000"
EMAIL = "admin@axislab.com"
PASSWORDS = ["InventoryReportTest123", "BootstrapPass123"]
RATE = 135

def request(path, payload=None, token=None):
    data = json.dumps(payload).encode() if payload is not None else None
    headers = {"Content-Type": "application/json"}
    if token:
        headers["Authorization"] = f"Bearer {token}"
    req = urllib.request.Request(BASE + path, data=data, headers=headers, method="POST" if payload is not None else "GET")
    with urllib.request.urlopen(req) as response:
        return json.load(response)

login = None
password = None
for candidate in PASSWORDS:
    try:
        login = request("/api/auth/login", {"email": EMAIL, "password": candidate})
        password = candidate
        break
    except Exception:
        pass
if not login:
    raise RuntimeError("Cannot authenticate local account")
token = login["token"]
if login.get("user", {}).get("mustChangePassword"):
    request("/api/auth/change-password", {"currentPassword": password, "newPassword": PASSWORDS[0]}, token)
    token = request("/api/auth/login", {"email": EMAIL, "password": PASSWORDS[0]})["token"]

def get(path):
    return request(path, token=token)

materials_response = get("/api/materials")
materials = materials_response.get("materials", materials_response.get("data", materials_response if isinstance(materials_response, list) else []))
orders = get("/api/orders")
analytics = get("/api/reports/analytics")["analytics"]
transparent = next((m for m in materials if m.get("id") == "m-1" or "أكريليك شفاف" in m.get("name", "")), None)
if not transparent:
    raise AssertionError("Transparent acrylic material not found")
assert round(float(transparent["pricePerUnit"])) == 1350, transparent
assert analytics["sales"]["totalOrdersValueSYP"] == analytics["sales"]["totalOrdersValue"], analytics["sales"]
assert round(float(analytics["sales"]["totalOrdersValueUSD"]), 2) == round(float(analytics["sales"]["totalOrdersValueSYP"]) / RATE, 2), analytics["sales"]
print(json.dumps({
    "exchangeRate": RATE,
    "transparentAcrylic": {"priceSYP": transparent["pricePerUnit"], "derivedUSD": round(transparent["pricePerUnit"] / RATE, 2)},
    "materials": [{"id": m.get("id"), "name": m.get("name"), "priceSYP": m.get("pricePerUnit"), "derivedUSD": round(float(m.get("pricePerUnit") or 0) / RATE, 2)} for m in materials],
    "orders": {"count": len(orders), "totalSYP": sum(float(o.get("totalPrice") or 0) for o in orders)},
    "salesReport": analytics["sales"],
}, ensure_ascii=False, indent=2))
print("syp-operational-currency-check: PASS")
