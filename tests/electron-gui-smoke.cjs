const { _electron: electron } = require("playwright");

const appPath = process.env.AXIS_APP_PATH;
if (!appPath) throw new Error("AXIS_APP_PATH is required");

async function main() {
  const killer = setTimeout(() => {
    console.error("Electron GUI smoke timed out after 90 seconds.");
    process.exit(124);
  }, 90000);

  let electronApp;
  const tracePath = process.env.AXIS_GUI_TRACE || "axis-lab-gui-trace.zip";
  try {
    electronApp = await electron.launch({ executablePath: appPath, timeout: 30000 });
    await electronApp.context().tracing.start({ screenshots: true, snapshots: true, sources: true });
    const page = await electronApp.firstWindow({ timeout: 30000 });
    page.setDefaultTimeout(10000);
    await page.waitForLoadState("domcontentloaded").catch(() => {});
    await page.getByText("AXIS LAB OS", { exact: false }).first().waitFor();

    // The production authentication UI must be present before the test-only session fixture is injected.
    await page.getByRole("button", { name: "تسجيل الدخول", exact: true }).waitFor();
    await page.locator('input[type="email"]').waitFor();
    await page.locator('input[type="password"]').waitFor();

    // Obtain an employee session only through the CI-only fixture endpoint.
    const session = await page.evaluate(async () => {
      const response = await fetch("http://127.0.0.1:3210/api/test/gui-session", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ role: "employee" }), credentials: "include" });
      return { ok: response.ok, status: response.status, body: await response.json() };
    });
    if (!session.ok) throw new Error(`GUI employee session fixture failed: HTTP ${session.status}`);
    if (session.body?.user?.role !== "employee") throw new Error("GUI session fixture did not return an employee user");
    const currentSession = await page.evaluate(async () => { const response = await fetch("/api/auth/me", { credentials: "include" }); return { ok: response.ok, body: await response.json() }; });
    if (!currentSession.ok || currentSession.body?.user?.role !== "employee") throw new Error("GUI fixture cookie was not accepted by /api/auth/me");
    await page.reload();
    await page.getByText("AXIS LAB v0.15.0", { exact: false }).waitFor();
    try {
      await page.getByText("الإنتاج والتشغيل اليدوي", { exact: false }).waitFor();
    } catch (error) {
      console.error("POST-REGISTER BODY:\n" + (await page.locator("body").innerText()).slice(0, 12000));
      await page.screenshot({ path: process.env.AXIS_GUI_SCREENSHOT || "axis-lab-gui-failure.png", fullPage: true }).catch(() => {});
      throw error;
    }
    await page.getByText("AXIS LAB OS / v0.15.0", { exact: false }).waitFor();
    await page.getByRole("button", { name: /الطلبات والعملاء/ }).click();
    await page.getByText("الطلبات والعملاء", { exact: false }).first().waitFor();

    const bodyText = await page.locator("body").innerText();
    const forbiddenLabels = ["matCost", "finalPrice", "تكلفة المواد", "سعر التكلفة", "هامش الربح", "الربح الصافي"];
    const leaked = forbiddenLabels.filter((label) => bodyText.includes(label));
    if (leaked.length) throw new Error(`Employee UI exposed forbidden financial fields: ${leaked.join(", ")}`);

    await page.getByRole("button", { name: /الإنتاج والتشغيل اليدوي/ }).click();
    await page.getByText("الإنتاج والتشغيل اليدوي", { exact: false }).first().waitFor();
    await page.getByRole("button", { name: /الرئيسية/ }).click();
    await page.getByText("AXIS LAB OS / v0.15.0", { exact: false }).waitFor();

    // Real end-to-end business workflow: customer -> order -> item -> quantity -> deposit -> save.
    await page.getByRole("button", { name: /الطلبات والعملاء/ }).click();
    await page.getByText("الطلبات والعملاء", { exact: false }).first().waitFor();
    await page.getByRole("button", { name: /طلب جديد لعميل/ }).click();
    const modal = page.locator("#add-order-modal-container");
    await modal.waitFor();

    const customerName = "CI E2E Customer " + Date.now();
    await modal.getByPlaceholder("ابحث أو اختر العميل (مثال: الأمل)...").fill(customerName);
    await modal.getByRole("button", { name: new RegExp('إضافة "' + customerName + '".*عميل سريع جديد') }).click();
    await modal.getByText("مرتبط", { exact: true }).waitFor();

    await modal.getByRole("button", { name: /إضافة مادة يدوياً/ }).click();
    const itemName = "CI E2E Laser Item " + Date.now();
    await modal.getByPlaceholder("مادة القص (مثال: أكريليك شفاف 4ملم)").fill(itemName);
    await modal.getByPlaceholder("الكمية").fill("2");
    await modal.getByPlaceholder("السعر").fill("500000");
    await modal.getByLabel("المبلغ المقبوض سلفاً (ل.س)").fill("300000");

    await modal.getByText("المبلغ الإجمالي النهائي", { exact: true }).waitFor();
    const summaryText = await modal.innerText();
    if (!(summaryText.includes("1,000,000") || summaryText.includes("1000000"))) throw new Error("GUI pricing calculation did not reach expected 1,000,000 ل.س total");
    if (!(summaryText.includes("700,000") || summaryText.includes("700000"))) throw new Error("GUI deposit/remaining calculation did not reach expected 700,000 ل.س remaining");

    await modal.getByRole("button", { name: /تأكيد وتسجيل الطلب بالكامل/ }).click();
    await modal.waitFor({ state: "hidden", timeout: 15000 });
    await page.getByText(customerName, { exact: false }).first().waitFor({ timeout: 15000 });

    console.log("Customer creation through GUI: PASS");
    console.log("Order creation through GUI: PASS");
    console.log("Order item + quantity entry: PASS");
    console.log("Deposit + remaining calculation: PASS");
    console.log("Order persistence visible in GUI: PASS");

    console.log("Electron GUI smoke: PASS");
    console.log("Packaged EXE launch: PASS");
    console.log("Login UI rendering: PASS");
    console.log("CI-only employee session fixture: PASS");
    console.log("Employee GUI session: PASS");
    console.log("Employee routing/navigation: PASS");
    console.log("Financial-field exposure check: PASS");
  } finally {
    clearTimeout(killer);
    if (electronApp) {
      await electronApp.context().tracing.stop({ path: tracePath }).catch(() => {});
      await electronApp.close().catch(() => {});
    }
  }
}

main().catch((error) => {
  console.error("Electron GUI smoke: FAIL");
  console.error(error && error.stack ? error.stack : error);
  process.exitCode = 1;
});