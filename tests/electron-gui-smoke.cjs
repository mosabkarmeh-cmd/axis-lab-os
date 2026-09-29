const { _electron: electron } = require("playwright");

const appPath = process.env.AXIS_APP_PATH;
if (!appPath) throw new Error("AXIS_APP_PATH is required");

async function main() {
  const killer = setTimeout(() => {
    console.error("Electron GUI smoke timed out after 90 seconds.");
    process.exit(124);
  }, 90000);

  let electronApp;
  try {
    electronApp = await electron.launch({ executablePath: appPath, timeout: 30000 });
    const page = await electronApp.firstWindow({ timeout: 30000 });
    page.setDefaultTimeout(10000);
    await page.waitForLoadState("domcontentloaded").catch(() => {});
    await page.getByText("AXIS LAB OS", { exact: false }).first().waitFor();

    await page.getByRole("button", { name: "حساب جديد" }).click();
    await page.locator('input[type="text"]').first().fill("GUI Test Employee");
    await page.locator('input[type="email"]').fill(`gui-employee-${Date.now()}@example.test`);
    await page.locator('input[type="password"]').fill("GuiTest-2026-Strong!");
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
    console.log("Packaged EXE launch: PASS");
    console.log("Registration: PASS");
    console.log("Employee routing/navigation: PASS");
    console.log("Financial-field exposure check: PASS");
  } finally {
    clearTimeout(killer);
    if (electronApp) await electronApp.close().catch(() => {});
  }
}

main().catch((error) => {
  console.error("Electron GUI smoke: FAIL");
  console.error(error && error.stack ? error.stack : error);
  process.exitCode = 1;
});