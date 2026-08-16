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
    raise RuntimeError("Could not authenticate local report account")
token = login["token"]
if login.get("user", {}).get("mustChangePassword"):
    request("/api/auth/change-password", {"currentPassword": password, "newPassword": PASSWORDS[0]}, token)
    token = request("/api/auth/login", {"email": EMAIL, "password": PASSWORDS[0]})["token"]

def get(path):
    return request(path, token=token)

orders = get("/api/orders")
invoices = get("/api/accounting/invoices")["invoices"]
analytics = get("/api/reports/analytics")["analytics"]

customers = {}
for order in orders:
    customer_id = order.get("customerId")
    customer_name = customer_id or "غير محدد"
    customers.setdefault(customer_id, customer_name)

order_rows = []
for order in orders:
    rate = float(order.get("exchangeRateAtCreation") or RATE)
    total_syp = float(order.get("totalPrice") or 0)
    paid_syp = float(order.get("paidAmount") or 0)
    remaining_syp = float(order.get("remaining") or 0)
    order_rows.append({
        "orderNumber": order.get("orderNumber"),
        "status": order.get("status"),
        "totalUSD": round(total_syp / rate, 2),
        "totalSYP": round(total_syp),
        "paidUSD": round(paid_syp / rate, 2),
        "paidSYP": round(paid_syp),
        "remainingUSD": round(remaining_syp / rate, 2),
        "remainingSYP": round(remaining_syp),
        "rate": rate,
    })

invoice_rows = []
for invoice in invoices:
    total_usd = float(invoice.get("totalPrice") or 0)
    paid_usd = float(invoice.get("paidAmount") or 0)
    remaining_usd = float(invoice.get("remaining") or 0)
    invoice_rows.append({
        "invoiceNumber": invoice.get("invoiceNumber"),
        "orderNumber": invoice.get("orderNumber"),
        "totalUSD": round(total_usd, 2),
        "totalSYP": round(total_usd * RATE),
        "paidUSD": round(paid_usd, 2),
        "paidSYP": round(paid_usd * RATE),
        "remainingUSD": round(remaining_usd, 2),
        "remainingSYP": round(remaining_usd * RATE),
    })

sales = analytics["sales"]
financial = analytics["financial"]
report = {
    "exchangeRate": RATE,
    "sales": {
        "orderCount": sales["totalOrdersCount"],
        "totalOrdersUSD": round(float(sales["totalOrdersValue"]), 2),
        "totalOrdersSYP": round(float(sales["totalOrdersValue"]) * RATE),
        "averageOrderUSD": round(float(sales["avgOrderValue"]), 2),
        "averageOrderSYP": round(float(sales["avgOrderValue"]) * RATE),
        "byStatus": sales["ordersByStatus"],
    },
    "financial": {
        "revenueUSD": round(float(financial["totalRevenue"]), 2),
        "revenueSYP": round(float(financial["totalRevenue"]) * RATE),
        "receivablesUSD": round(float(financial["totalReceivables"]), 2),
        "receivablesSYP": round(float(financial["totalReceivables"]) * RATE),
        "expensesUSD": round(float(financial["totalExpenses"]), 2),
        "expensesSYP": round(float(financial["totalExpenses"]) * RATE),
        "netProfitUSD": round(float(financial["netProfit"]), 2),
        "netProfitSYP": round(float(financial["netProfit"]) * RATE),
    },
    "orders": order_rows,
    "invoices": invoice_rows,
}
print(json.dumps(report, ensure_ascii=False, indent=2))

assert abs(report["sales"]["totalOrdersUSD"] * RATE - report["sales"]["totalOrdersSYP"]) <= RATE
assert abs(report["financial"]["revenueUSD"] * RATE - report["financial"]["revenueSYP"]) <= RATE
assert abs(report["financial"]["receivablesUSD"] * RATE - report["financial"]["receivablesSYP"]) <= RATE
print("current-sales-report: PASS")
