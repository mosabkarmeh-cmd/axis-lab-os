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
    electronApp = await electron.launch({ executablePath: appPath, timeout: 30000, env: { ...process.env, AXIS_GUI_TEST: "1", NODE_ENV: "production", ALLOW_PUBLIC_REGISTRATION: "false" } });
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
    // Acquire the CI-only session outside the renderer, then install the exact HttpOnly cookie into the Electron browser context.
    const fixtureResponse = await fetch("http://127.0.0.1:3210/api/test/gui-session", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ role: "employee" })
    });
    const fixtureBody = await fixtureResponse.json().catch(() => ({}));
    if (!fixtureResponse.ok) throw new Error("GUI employee session fixture failed: HTTP " + fixtureResponse.status + " body=" + JSON.stringify(fixtureBody));
    if (fixtureBody?.user?.role !== "employee") throw new Error("GUI session fixture did not return an employee user");
    const setCookies = typeof fixtureResponse.headers.getSetCookie === "function"
      ? fixtureResponse.headers.getSetCookie()
      : [fixtureResponse.headers.get("set-cookie")].filter(Boolean);
    const sessionCookie = setCookies.find((value) => /^axislab_token=/i.test(value || ""));
    if (!sessionCookie) throw new Error("GUI session fixture did not return axislab_token cookie");
    const tokenMatch = sessionCookie.match(/^axislab_token=([^;]+)/i);
    if (!tokenMatch) throw new Error("Unable to parse axislab_token cookie");
    await electronApp.context().addCookies([{
      name: "axislab_token",
      value: tokenMatch[1],
      domain: "127.0.0.1",
      path: "/",
      httpOnly: true,
      secure: false,
      sameSite: "Lax"
    }]);
    const verifyBeforeReload = await page.evaluate(async () => {
      const response = await fetch("/api/auth/verify");
      return { status: response.status, body: await response.text() };
    });
    if (verifyBeforeReload.status !== 200) throw new Error("GUI token verification before reload failed: " + JSON.stringify(verifyBeforeReload));
    await page.reload();
    try {
      await page.getByText("الطلبات والعملاء", { exact: false }).first().waitFor();
    } catch (error) {
      console.error("POST-RELOAD URL: " + page.url());
      console.error("POST-RELOAD BODY:\n" + (await page.locator("body").innerText()).slice(0, 12000));
      throw error;
    }
    try {
      await page.getByText("الإنتاج والتشغيل اليدوي", { exact: false }).waitFor();
    } catch (error) {
      console.error("POST-REGISTER BODY:\n" + (await page.locator("body").innerText()).slice(0, 12000));
      await page.screenshot({ path: process.env.AXIS_GUI_SCREENSHOT || "axis-lab-gui-failure.png", fullPage: true }).catch(() => {});
      throw error;
    }
    await page.locator("button").filter({ hasText: "الطلبات والعملاء" }).first().click();
    await page.getByText("الطلبات والعملاء", { exact: false }).first().waitFor();

    const bodyText = await page.locator("body").innerText();
    const forbiddenLabels = ["matCost", "finalPrice", "تكلفة المواد", "سعر التكلفة", "هامش الربح", "الربح الصافي"];
    const leaked = forbiddenLabels.filter((label) => bodyText.includes(label));
    if (leaked.length) throw new Error(`Employee UI exposed forbidden financial fields: ${leaked.join(", ")}`);

    // Employee sessions are intentionally blocked from submitting financial values.
    // Switch to an admin CI fixture before exercising the real financial order workflow.
    const adminFixtureResponse = await fetch("http://127.0.0.1:3210/api/test/gui-session", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ role: "admin" })
    });
    const adminFixtureBody = await adminFixtureResponse.json().catch(() => ({}));
    if (!adminFixtureResponse.ok) throw new Error("GUI admin session fixture failed: HTTP " + adminFixtureResponse.status + " body=" + JSON.stringify(adminFixtureBody));
    const adminCookies = typeof adminFixtureResponse.headers.getSetCookie === "function"
      ? adminFixtureResponse.headers.getSetCookie()
      : [adminFixtureResponse.headers.get("set-cookie")].filter(Boolean);
    const adminSessionCookie = adminCookies.find((value) => /^axislab_token=/i.test(value || ""));
    if (!adminSessionCookie) throw new Error("GUI admin session fixture did not return axislab_token cookie");
    const adminTokenMatch = adminSessionCookie.match(/^axislab_token=([^;]+)/i);
    if (!adminTokenMatch) throw new Error("Unable to parse admin axislab_token cookie");
    await electronApp.context().addCookies([{
      name: "axislab_token",
      value: adminTokenMatch[1],
      domain: "127.0.0.1",
      path: "/",
      httpOnly: true,
      secure: false,
      sameSite: "Lax"
    }]);
    const adminVerify = await page.evaluate(async () => {
      const response = await fetch("/api/auth/verify");
      return { status: response.status, body: await response.text() };
    });
    if (adminVerify.status !== 200) throw new Error("GUI admin token verification failed: " + JSON.stringify(adminVerify));
    await page.reload();
    await page.getByText("الطلبات والعملاء", { exact: false }).first().waitFor({ timeout: 15000 });

    await page.getByRole("button", { name: /الإنتاج والتشغيل/ }).click();
    await page.getByText("الإنتاج والتشغيل", { exact: false }).first().waitFor();
    await page.getByRole("button", { name: /الرئيسية/ }).click();
    // Home navigation completed; continue directly into the business workflow.

    // Real end-to-end business workflow: customer -> order -> item -> quantity -> deposit -> save.
    await page.getByRole("button", { name: /الطلبات والعملاء/ }).click();
    await page.getByText("الطلبات والعملاء", { exact: false }).first().waitFor();
    await page.getByRole("button", { name: /طلب جديد لعميل/ }).click();
    const modal = page.locator("#add-order-modal-container");
    await modal.waitFor();

    const customerName = "CI E2E Customer " + Date.now();
    await modal.getByPlaceholder("ابحث أو اختر العميل (مثال: الأمل)...").fill(customerName);
    await modal.getByRole("button", { name: new RegExp('إضافة "' + customerName + '".*عميل سريع جديد') }).click();
    await modal.getByPlaceholder("ابحث أو اختر العميل (مثال: الأمل)...").waitFor({ timeout: 15000 });
    await modal.getByText("مرتبط", { exact: true }).waitFor({ timeout: 20000 });

    await modal.getByRole("button", { name: /إضافة مادة يدوياً/ }).click();
    await modal.locator('button[title="حذف هذا العنصر"]').first().click();
    const itemName = "CI E2E Laser Item " + Date.now();
    await modal.getByPlaceholder("مادة القص (مثال: أكريليك شفاف 4ملم)").last().fill(itemName);
    await modal.getByPlaceholder("الكمية").last().fill("2");
    await modal.getByPlaceholder("السعر").last().fill("500000");
    await modal.locator("label").filter({ hasText: "المبلغ المقبوض سلفاً (ل.س)" }).locator("..").locator("input").fill("300000");

    await modal.getByText("المبلغ الإجمالي النهائي", { exact: true }).waitFor();
    const customerBackdrop = modal.locator("div.fixed.inset-0.z-40.bg-transparent");
    if (await customerBackdrop.count()) await customerBackdrop.click({ position: { x: 1, y: 1 } });
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