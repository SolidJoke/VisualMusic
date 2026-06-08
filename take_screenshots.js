import { chromium } from 'playwright';
import fs from 'fs';
import path from 'path';

const SCREENS_DIR = path.join(process.cwd(), 'docs', 'design', 'screenshots');
if (!fs.existsSync(SCREENS_DIR)) {
  fs.mkdirSync(SCREENS_DIR, { recursive: true });
}

const resolutions = [
  { name: '4K', width: 3840, height: 2160 },
  { name: 'QHD', width: 2560, height: 1440 },
  { name: 'FHD', width: 1920, height: 1080 },
  { name: 'Tablet', width: 1024, height: 768 },
  { name: 'Mobile', width: 375, height: 812 },
  { name: 'Mobile_Landscape', width: 812, height: 375 },
  { name: 'Tablet_Landscape', width: 1024, height: 600 }
];

async function capture() {
  const browser = await chromium.launch();
  
  for (const res of resolutions) {
    const context = await browser.newContext({
      viewport: { width: res.width, height: res.height },
      deviceScaleFactor: 1
    });
    const page = await context.newPage();
    console.log(`Navigating for ${res.name}...`);
    await page.goto('http://localhost:5173');
    // Wait for the main studio panel to render
    await page.waitForSelector('[data-testid="studio-panel"]', { timeout: 10000 }).catch(() => {});
    await page.waitForTimeout(1000); // Wait for fonts and visualizer

    console.log(`Taking Studio screenshot for ${res.name}...`);
    await page.screenshot({ path: path.join(SCREENS_DIR, `Studio_${res.name}.png`) });

    // Switch to Dictionary mode
    const dictBtn = await page.$('[data-testid="btn-mode-dictionary"]');
    if (dictBtn) {
      await dictBtn.click();
      await page.waitForSelector('[data-testid="dictionary-panel"]', { timeout: 5000 }).catch(() => {});
      await page.waitForTimeout(1000); // Wait for transition
      console.log(`Taking Dictionary screenshot for ${res.name}...`);
      await page.screenshot({ path: path.join(SCREENS_DIR, `Dictionary_${res.name}.png`) });
    } else {
      console.log('Could not find Dictionary button');
    }

    await context.close();
  }
  
  await browser.close();
  console.log('Screenshots completed.');
}

capture().catch(console.error);
