import { chromium } from "@playwright/test";

const base = "http://127.0.0.1:4321";
const out = "C:/Users/Pavel/Desktop/agencyai/docs/screenshots";
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
await page.goto(base + "/#dashboard");
await page.waitForSelector("canvas#chart", { timeout: 15000 });
await page.waitForTimeout(600);
await page.screenshot({ path: out + "/dashboard.png" });
await page.goto(base + "/#chat");
await page.waitForSelector("[data-role-badge]", { timeout: 15000 });
await page.waitForTimeout(400);
await page.screenshot({ path: out + "/chat.png" });
// второй кадр чата: после двух шагов (роль подрядчика, SLA-карточка)
await page.click('[data-action="next"]');
await page.click('[data-action="next"]');
await page.waitForTimeout(300);
await page.screenshot({ path: out + "/chat-contractor.png" });
await browser.close();
console.log("screenshots ok");
