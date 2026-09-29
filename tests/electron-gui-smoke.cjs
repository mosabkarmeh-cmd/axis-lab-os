const { chromium } = require("playwright");

const CDP_URL = process.env.AXIS_CDP_URL || "http://127.0.0.1:9222";
const BASE_TIMEOUT = 30000;
async function waitForPage(browser) {
  const deadline = Date.now() + 60000;
  while (Date.now() < deadline) {
    const pages = browser.contexts().flatMap((context) => context.pages());
    const page = pages.find((candidate) => !candidate.isClosed());
    if (page) return page;
    await new Promise((resolve) => setTimeout(resolve, 1000));
  }
  throw new Error("Electron renderer page did not become available through CDP.");
}
async function main() {
  const browser = await chromium.connectOverCDP(CDP_URL);
  const page = await waitForPage(browser);
  page.setDefaultTimeout(BASE_TIMEOUT);
  await page.waitForLoadState("domcontentloaded").catch(() => {});
  await page.getByText("AXIS LAB OS", { exact: false }).first().waitFor();
  await page.getByRole("button", { name: "حساب جديد" }).click();
  await page.getByLabel("الاسم الكامل").fill("GUI Test Employee");
  await page.getByLabel("البريد الإلكتروني").fill(`gui-employee-${Date.now()}@example.test`);
  await page.getByLabel("كلمة المرور").fill("GuiTest-2026-Strong!");
  await page.getByRole("button", { name: "فني تشغيل ليزر" }).click();
  await page.getByRole("button", { name: "إتمام التسجيل وإصدار المفتاح" }).click();
  await page.getByText("الإنتاج والتشغيل اليدوي", { exact: false }).waitFor();
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
  console.log("Electron GUI smoke: PASS");
  console.log("Registration: PASS");
  console.log("Employee routing: PASS");
  console.log("Employee navigation: PASS");
  console.log("Financial-field exposure check: PASS");
  console.log("Renderer navigation stability: PASS");
  await browser.close();
}
main().catch(async (error) => {
  console.error("Electron GUI smoke: FAIL");
  console.error(error && error.stack ? error.stack : error);
  process.exitCode = 1;
});