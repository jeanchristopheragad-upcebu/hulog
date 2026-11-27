import { defineConfig } from "@playwright/test";
export default defineConfig({
  testDir: "tests/browser",
  timeout: 30000,
  use: {
    baseURL: "http://127.0.0.1:5173",
    headless: true,
    channel: process.env.PLAYWRIGHT_CHANNEL || "chrome",
  },
  webServer: [
    {
      command: "npm run dev",
      url: "http://127.0.0.1:5173",
      reuseExistingServer: true,
      timeout: 60000,
    },
    {
      command: "PORT=4173 npm start",
      url: "http://127.0.0.1:4173/health",
      reuseExistingServer: true,
      timeout: 60000,
    },
  ],
});
