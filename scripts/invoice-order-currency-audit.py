import json
import urllib.request

BASE = "http://127.0.0.1:3000"
EMAIL = "admin@axislab.com"
PASSWORDS = ["InventoryReportTest123", "BootstrapPass123"]

def request(path, payload=None, token=None):
    data = None if payload is None else json.dumps(payload).encode()
    headers = {"Content-Type": "application/json"}
    if token:
        headers["Authorization"] = f"Bearer {token}"
    req = urllib.request.Request(BASE + path, data=data, headers=headers)
    with urllib.request.urlopen(req) as response:
        return json.load(response)

login = None
login_password = None
for password in PASSWORDS:
    try:
        login = request("/api/auth/login", {"email": EMAIL, "password": password})
        login_password = password
        break
    except Exception:
        pass
if not login or not login_password:
    raise RuntimeError("Could not authenticate local audit account")
token = login["token"]
if login.get("user", {}).get("mustChangePassword"):
    request("/api/auth/change-password", {"currentPassword": login_password, "newPassword": PASSWORDS[0]}, token)
    login = request("/api/auth/login", {"email": EMAIL, "password": PASSWORDS[0]})
    token = login["token"]

orders = request("/api/orders", token=token)
invoices = request("/api/accounting/invoices", token=token)["invoices"]
analytics = request("/api/reports/analytics", token=token)["analytics"]

order_errors = []
for order in orders:
    total = float(order.get("totalPrice") or 0)
    paid = float(order.get("paidAmount") or 0)
    remaining = float(order.get("remaining") or 0)
    item_total = sum(float(item.get("totalPrice") or 0) for item in order.get("items") or [])
    if abs(remaining - max(0, total - paid)) > 0.02:
        order_errors.append({"id": order.get("id"), "reason": "remaining mismatch", "total": total, "paid": paid, "remaining": remaining})
    if order.get("items") and abs(item_total - float(order.get("subtotal") or item_total)) > 0.02:
        order_errors.append({"id": order.get("id"), "reason": "item subtotal mismatch", "items": item_total, "subtotal": order.get("subtotal")})

invoice_errors = []
for invoice in invoices:
    total = float(invoice.get("totalPrice") or 0)
    paid = float(invoice.get("paidAmount") or 0)
    remaining = float(invoice.get("remaining") or 0)
    item_total = sum(float(item.get("total") or 0) for item in invoice.get("items") or [])
    if invoice.get("status") != "credit_note" and abs(remaining - max(0, total - paid)) > 0.02:
        invoice_errors.append({"id": invoice.get("id"), "reason": "remaining mismatch", "total": total, "paid": paid, "remaining": remaining})
    if invoice.get("items") and abs(item_total - total) > 0.02:
        invoice_errors.append({"id": invoice.get("id"), "reason": "invoice item total mismatch", "items": item_total, "total": total})

sales = analytics["sales"]
financial = analytics["financial"]
exchange_rate = 135
expected_orders_value = sum((float(order.get("totalPrice") or 0) / exchange_rate) for order in orders)
expected_revenue = sum(float(invoice.get("paidAmount") or 0) for invoice in invoices)
expected_receivables = sum(float(invoice.get("remaining") or 0) for invoice in invoices)
assert abs(float(sales["totalOrdersValue"]) - expected_orders_value) <= 0.02
assert abs(float(financial["totalRevenue"]) - expected_revenue) <= 0.02
assert abs(float(financial["totalReceivables"]) - expected_receivables) <= 0.02
assert not order_errors, order_errors
assert not invoice_errors, invoice_errors

print(json.dumps({
    "status": "PASS",
    "currencyContract": "orders/invoices stored and reported in USD; SYP is presentation-only",
    "orders": {"count": len(orders), "sourceCurrency": "SYP", "totalSourceSYP": round(sum(float(order.get("totalPrice") or 0) for order in orders), 2), "totalUSD": round(expected_orders_value, 2)},
    "invoices": {"count": len(invoices), "totalUSD": round(sum(float(i.get("totalPrice") or 0) for i in invoices), 2), "paidUSD": round(expected_revenue, 2), "remainingUSD": round(expected_receivables, 2)},
    "reports": {"salesTotalUSD": round(float(sales["totalOrdersValue"]), 2), "revenueUSD": round(float(financial["totalRevenue"]), 2), "receivablesUSD": round(float(financial["totalReceivables"]), 2), "netProfitUSD": round(float(financial["netProfit"]), 2)},
    "orderInvariantErrors": len(order_errors),
    "invoiceInvariantErrors": len(invoice_errors),
}, ensure_ascii=False, indent=2))
