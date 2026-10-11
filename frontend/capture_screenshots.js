import puppeteer from 'puppeteer-core';
import path from 'path';
import fs from 'fs';

const chromePath = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const outputDir = path.resolve('..', 'docs', 'screenshots');

if (!fs.existsSync(outputDir)) {
  fs.mkdirSync(outputDir, { recursive: true });
}

const pagesToCapture = [
  { name: '01_mission_control.png', selector: 'Mission Control', waitMs: 2500 },
  { name: '02_molecule_lab.png', selector: 'Molecule Lab', waitMs: 3000 },
  { name: '03_voltage_explorer.png', selector: 'Voltage Explorer', waitMs: 2500 },
  { name: '04_noise_lab.png', selector: 'Noise & Mitigation', waitMs: 3500 },
  { name: '05_candidate_ranking.png', selector: 'Candidate Ranking', waitMs: 2500 },
  { name: '06_active_learning.png', selector: 'Active-Learning', waitMs: 2500 },
  { name: '07_fault_tolerant.png', selector: 'Fault-Tolerant', waitMs: 2500 },
  { name: '08_battery_digital_twin.png', selector: 'Battery Digital Twin', waitMs: 3500 },
  { name: '09_about_methodology.png', selector: 'About & Methodology', waitMs: 2000 },
];

async function captureAll() {
  console.log('Launching Chrome via puppeteer-core at:', chromePath);
  const browser = await puppeteer.launch({
    executablePath: chromePath,
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--window-size=1440,920'],
    defaultViewport: { width: 1440, height: 900 },
  });

  const page = await browser.newPage();
  console.log('Navigating to http://127.0.0.1:5173...');
  await page.goto('http://127.0.0.1:5173', { waitUntil: 'networkidle0', timeout: 30000 });

  // 1. Mission Control
  console.log('Capturing 01_mission_control.png...');
  await new Promise((r) => setTimeout(r, 2000));
  await page.screenshot({ path: path.join(outputDir, '01_mission_control.png') });
  console.log('✓ Saved 01_mission_control.png');

  // Loop through remaining pages via navigation clicks
  for (let i = 1; i < pagesToCapture.length; i++) {
    const item = pagesToCapture[i];
    console.log(`Navigating to ${item.name}...`);
    try {
      // Find button by text in sidebar
      const clicked = await page.evaluate((text) => {
        const buttons = Array.from(document.querySelectorAll('aside button'));
        const target = buttons.find((b) => b.textContent && b.textContent.includes(text));
        if (target) {
          target.click();
          return true;
        }
        return false;
      }, item.selector);

      if (!clicked) {
        console.warn(`Could not find button for ${item.selector}`);
      }

      await new Promise((r) => setTimeout(r, item.waitMs));
      const targetPath = path.join(outputDir, item.name);
      await page.screenshot({ path: targetPath });
      console.log(`✓ Saved ${item.name}`);
    } catch (err) {
      console.error(`Error capturing ${item.name}:`, err);
    }
  }

  await browser.close();
  console.log('All 9 screenshots captured successfully!');
}

captureAll().catch((err) => {
  console.error('Fatal error during capture:', err);
  process.exit(1);
});
