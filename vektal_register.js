const fs = require("fs");
const path = require("path");

const { chromium } = require("playwright-extra");
const StealthPlugin = require("puppeteer-extra-plugin-stealth");

chromium.use(StealthPlugin());

/* ================= CONFIG ================= */

const TARGET_URL = "https://vektalnodes.in/ref/JTWNBO";
const SCREEN_DIR = path.resolve(__dirname, "screenshots");

/* ================= UTILS ================= */

function ensureDir() {
  if (!fs.existsSync(SCREEN_DIR)) {
    fs.mkdirSync(SCREEN_DIR, { recursive: true });
  }
}

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

function rand(min, max) {
  return Math.floor(Math.random() * (max - min) + min);
}

async function humanPause(min = 500, max = 2000) {
  await sleep(rand(min, max));
}

async function snap(page, name) {
  const file = path.join(SCREEN_DIR, `${Date.now()}_${name}.png`);
  await page.screenshot({ path: file, fullPage: true });
}

/* ================= 账号 ================= */

function randomItem(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

function genAccount() {
  const firstNames = ["Lucas","Ethan","Noah","Liam","Mason"];
  const lastNames = ["Smith","Johnson","Brown","Taylor","White"];

  const first = randomItem(firstNames);
  const last = randomItem(lastNames);
  const num = rand(100, 999);

  return {
    first,
    last,
    username: `${first}${last}${num}`.toLowerCase(),
    email: `${first}${num}${rand(10,99)}@gmail.com`.toLowerCase(),
    password: `Aa!${first}${num}${Math.random().toString(36).slice(2,6)}`
  };
}

/* ================= human typing ================= */

async function humanType(page, selector, text) {
  const el = page.locator(selector);
  await el.click();

  for (let char of text) {
    await el.type(char, { delay: rand(80, 180) });
  }
}

/* ================= MAIN ================= */

(async () => {
  ensureDir();

  const browser = await chromium.launch({
    headless: true,
    args: [
      "--no-sandbox",
      "--disable-blink-features=AutomationControlled"
    ]
  });

  const context = await browser.newContext({
    viewport: {
      width: rand(1100, 1400),
      height: rand(700, 900)
    },
    userAgent:
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/122 Safari/537.36",
    locale: "en-US"
  });

  const page = await context.newPage();

  // hide webdriver
  await page.addInitScript(() => {
    Object.defineProperty(navigator, "webdriver", {
      get: () => undefined
    });
  });

  page.on("request", (req) => {
    if (req.method() === "POST") {
      console.log("📡 POST =>", req.url());
    }
  });

  const acc = genAccount();
  console.log("🧾", acc);

  await page.goto(TARGET_URL, { waitUntil: "domcontentloaded" });

  await humanPause(1000, 3000);

  await page.waitForSelector('input[name="email"]');

  /* ===== 填表（加入随机停顿） ===== */

  await humanType(page, 'input[name="first_name"]', acc.first);
  await humanPause();

  await humanType(page, 'input[name="last_name"]', acc.last);
  await humanPause();

  await humanType(page, 'input[name="username"]', acc.username);
  await humanPause();

  await humanType(page, 'input[name="email"]', acc.email);
  await humanType(page, 'input[name="confirm_email"]', acc.email);

  await humanPause();

  await humanType(page, 'input[name="password"]', acc.password);
  await humanType(page, 'input[name="confirm_password"]', acc.password);

  await page.fill('input[name="referral_code"]', "CEJRAR");

  await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));

  await snap(page, "form_done");

  /* ===== checkbox ===== */

  await humanPause();

  await page.click('input[name="accept_legal"]', { delay: rand(100, 300) });

  await snap(page, "checked");

  /* ===== submit ===== */

  const btn = page.locator('button[data-legal-consent-submit]');

  await btn.waitFor();

  await humanPause(1000, 2500);

  // hover + move (模拟真人)
  await btn.hover();
  await humanPause(300, 800);

  await btn.click();

  await humanPause(5000, 8000);

  await snap(page, "after_submit");

  console.log("🎉 attempt done");

  await browser.close();
})();
