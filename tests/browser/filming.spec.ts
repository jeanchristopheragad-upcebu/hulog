import { test, expect } from "@playwright/test";
test("director and actor complete key filming workflows", async ({
  browser,
  page,
}) => {
  await page.goto("/director");
  await page
    .getByRole("button", { name: "Create production session", exact: true })
    .click();
  await expect(page.locator(".session-strip")).toContainText("SESSION LIVE");
  const code = await page.locator(".session-strip b").innerText();
  const ctx = await browser.newContext({
    viewport: { width: 390, height: 844 },
  });
  const actor = await ctx.newPage();
  await actor.goto("/display?session=" + code);
  await actor
    .getByRole("button", { name: "Connect device", exact: true })
    .click();
  await expect(
    actor.getByText("Device connected · connection settings"),
  ).toBeVisible();
  await actor
    .getByRole("button", { name: "Enter filming mode", exact: true })
    .click();
  await page.locator(".scene-nav button").nth(1).click();
  await page
    .locator(".cue-row")
    .filter({ hasText: "FINAL WARNING. Pay" })
    .click();
  await page.getByRole("button", { name: "FIRE CUE" }).click();
  await expect(actor.locator(".notification")).toContainText(
    "FINAL WARNING. Pay your outstanding balance TODAY.",
  );
  await actor.waitForTimeout(400);
  await actor.screenshot({ path: "tests/phone-display.png" });
  await page
    .getByRole("button", { name: "Incoming call", exact: true })
    .click();
  await expect(actor.locator(".call-screen")).toContainText("UNKNOWN NUMBER");
  await actor.getByRole("button", { name: "ACCEPT", exact: true }).click();
  await expect(actor.locator(".call-screen")).toHaveClass(/active/);
  await page.getByRole("button", { name: "End call", exact: true }).click();
  await expect(actor.locator(".call-screen")).toContainText("CALL ENDED");
  await page.getByLabel("Jump to screen").selectOption("settings");
  for (const p of ["CONTACTS", "PHOTOS", "LOCATION"]) {
    await actor
      .getByRole("button", { name: new RegExp(p + " ALLOWED") })
      .click();
    await actor.getByRole("button", { name: "DENY", exact: true }).click();
  }
  await expect(actor.locator(".settings-app")).toContainText("DENIED");
  await page.locator(".scene-nav button").nth(3).click();
  await page.locator(".cue-row").filter({ hasText: "Too late." }).click();
  await page.getByRole("button", { name: "FIRE CUE" }).click();
  await expect(actor.locator(".notification").first()).toContainText(
    "Too late.",
  );
  await page
    .getByRole("button", { name: "Start overload", exact: true })
    .click();
  await actor.waitForTimeout(700);
  await page.getByRole("button", { name: "STOP ALL EFFECTS" }).click();
  const count = await actor.locator(".notification").count();
  await actor.waitForTimeout(1700);
  expect(await actor.locator(".notification").count()).toBe(count);
  await page.locator(".scene-nav button").nth(5).click();
  await page.locator(".cue-row").filter({ hasText: "Nak, nikaon" }).click();
  await page.getByRole("button", { name: "FIRE CUE" }).click();
  await actor
    .locator(".notification")
    .filter({ hasText: "Nak, nikaon" })
    .click();
  await actor.getByLabel("Unsent message").fill("Ma, dili na nako kaya…");
  await page
    .locator(".cue-row")
    .filter({ hasText: "Delete unsent message" })
    .click();
  await page.getByRole("button", { name: "FIRE CUE" }).click();
  await expect(actor.getByLabel("Unsent message")).toHaveValue("", {
    timeout: 6000,
  });
  await page.getByRole("button", { name: "Black screen", exact: true }).click();
  await expect(actor.locator(".black-screen")).toBeVisible();
  await page.getByRole("button", { name: "Reset scene / cue" }).click();
  await expect(actor.locator(".lock-screen")).toBeVisible();
  await ctx.setOffline(true);
  await expect(actor.locator(".lock-screen")).toBeVisible();
  await ctx.setOffline(false);
  await actor.waitForTimeout(2000);
  await page.getByLabel("Jump to screen").selectOption("portal");
  await expect(actor.locator(".portal-app")).toContainText("ON HOLD");
  await ctx.close();
});
test("scholarship, laptop, editing, documents, responsive layout", async ({
  page,
}) => {
  await page.goto("/director");
  await page.getByLabel("Jump to screen").selectOption("email");
  await page.locator(".email-row").first().click();
  await expect(page.locator(".email-body")).toContainText(
    "We regret to inform you",
  );
  await page.goto("/editor");
  await page.getByRole("button", { name: "emails", exact: true }).click();
  await expect(page.locator("textarea").first()).toContainText("Dear Tala");
  await page.goto("/documents");
  await expect(page.locator(".paper")).toContainText("₱9,600");
  for (const width of [375, 390, 393, 430, 768, 1366, 1920]) {
    await page.setViewportSize({ width, height: 844 });
    await page.goto("/director");
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= window.innerWidth,
      ),
    ).toBe(true);
  }
  await page.screenshot({ path: "tests/director-desktop.png", fullPage: true });
});
test("laptop role and per-device targeting work", async ({ page, browser }) => {

  await page.goto("/director");
  await page
    .getByRole("button", { name: "Create production session", exact: true })
    .click();
  await expect(page.locator(".session-strip")).toContainText("SESSION LIVE");
  const code = await page.locator(".session-strip b").innerText();
  const ctx = await browser.newContext();
  const laptop = await ctx.newPage();
  await laptop.goto("/display?session=" + code);
  await laptop.getByLabel("Unique device role").fill("Tala’s Laptop");
  await laptop
    .getByLabel("Display preset", { exact: true })
    .selectOption("laptop");
  await laptop
    .getByRole("button", { name: "Connect device", exact: true })
    .click();
  await expect(
    laptop.getByText("Device connected · connection settings"),
  ).toBeVisible();
  await laptop.getByRole("button", { name: "Enter filming mode" }).click();
  await expect(page.locator(".device-card").filter({hasText:"Tala’s Laptop"})).toBeVisible();
  await page.locator(".device-card").filter({hasText:"Tala’s Laptop"}).click();
  await page.getByLabel("Jump to screen").selectOption("bpo");
  await expect(laptop.locator(".bpo-app")).toContainText(
    "Customer Support Dashboard",
  );
  await expect(laptop.locator(".browser-chrome")).toBeVisible();
  await laptop.screenshot({ path: "tests/laptop-display.png" });
  await page
    .locator(".cue-row")
    .filter({ hasText: "Scholarship revocation email" })
    .click();
  await page.getByRole("button", { name: "FIRE CUE" }).click();
  await laptop.locator(".notification").click();
  await expect(laptop.locator(".email-body")).toContainText(
    "We regret to inform you",
  );
  await ctx.close();
});
test("built PWA reloads offline and local cues remain usable", async ({
  browser,
}) => {
  const ctx = await browser.newContext();
  const actor = await ctx.newPage();
  await actor.goto("http://127.0.0.1:4173/display");
  await actor.evaluate(async () => {
    await navigator.serviceWorker.ready;
  });
  await actor.waitForFunction(() => !!navigator.serviceWorker.controller);
  await actor.getByText("Local fallback controls", { exact: true }).click();
  await actor
    .locator(".local-actions button")
    .filter({ hasText: "Enrollment on hold" })
    .click();
  await expect(actor.locator(".portal-app")).toBeVisible();
  await ctx.setOffline(true);
  await actor.reload();
  await expect(actor.locator(".portal-app")).toContainText("ON HOLD");
  await actor.getByText("Local fallback controls", { exact: true }).click();
  await actor
    .locator(".local-actions button")
    .filter({ hasText: "BPO customer support dashboard" })
    .click();
  await expect(actor.locator(".bpo-app")).toBeVisible();
  await ctx.close();
});
test("document exports create actual PDF and PNG files", async ({ page }) => {
  await page.goto("/documents");
  const pdf = page.waitForEvent("download");
  await page.getByRole("button", { name: "Export PDF" }).click();
  expect((await pdf).suggestedFilename()).toBe("payslip.pdf");
  const png = page.waitForEvent("download");
  await page.getByRole("button", { name: "Export PNG" }).click();
  expect((await png).suggestedFilename()).toBe("payslip.png");
});

test("director can cancel or confirm ending a session for every device", async ({ page, browser }) => {
  await page.goto("/director");
  await page.getByRole("button", { name: "Create production session", exact: true }).click();
  await expect(page.locator(".session-strip")).toContainText("SESSION LIVE");
  const code = await page.locator(".session-strip b").innerText();
  const ctx = await browser.newContext();
  try {
    const actor = await ctx.newPage();
    await actor.goto("/display?session=" + code);
    await actor.getByRole("button", { name: "Connect device", exact: true }).click();
    await expect(actor.getByText("Device connected · connection settings")).toBeVisible();
    await actor.getByRole("button", { name: "Enter filming mode", exact: true }).click();
    page.once("dialog", (dialog) => dialog.dismiss());
    await page.getByRole("button", { name: "End session", exact: true }).click();
    await expect(page.locator(".session-strip")).toContainText(code);
    page.once("dialog", (dialog) => dialog.accept());
    await page.getByRole("button", { name: "End session", exact: true }).click();
    await expect(page.locator(".session-strip")).toContainText("No session connected");
    await expect(actor.getByText("Connect a filming device", { exact: true })).toBeVisible();
    expect(await page.evaluate(() => localStorage.getItem("hulog:director"))).toBe("null");
    expect(await actor.evaluate(() => localStorage.getItem("hulog:actor"))).toBe("null");
    await actor.getByRole("button", { name: "Connect device", exact: true }).click();
    await expect(actor.getByText("Session not found. Check the code and server.", { exact: true })).toBeVisible();
  } finally { await ctx.close(); }
});
