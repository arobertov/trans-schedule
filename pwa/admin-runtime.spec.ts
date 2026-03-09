import { test } from "@playwright/test";

test("capture admin runtime errors", async ({ page }) => {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(`pageerror: ${e.message}`));
  page.on("console", (msg) => {
    if (msg.type() === "error") errors.push(`console: ${msg.text()}`);
  });
  const resp = await page.goto("http://localhost:3000/admin", { waitUntil: "networkidle" });
  console.log("STATUS", resp?.status());
  await page.waitForTimeout(2000);
  const body = await page.locator("body").innerText();
  console.log("BODY_HAS_INVALID", body.includes("Element type is invalid"));
  console.log("ERROR_COUNT", errors.length);
  for (const e of errors) console.log(e);
});
