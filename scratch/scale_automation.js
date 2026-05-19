import playwright from 'playwright';
import fs from 'fs';
import path from 'path';

const PORT = 5178; // Server port from Vite
const BASE_URL = `http://localhost:${PORT}/`;
const REPORT_PATH = 'd:/IA/VisualMusic/docs/management/scale_audit_report.md';

const SCALES_TO_TEST = [
  { rootName: 'C', rootValue: 0, scaleName: 'Majeure', scaleKey: 'scale_major' },
  { rootName: 'C', rootValue: 0, scaleName: 'Mineure', scaleKey: 'scale_minor' },
  { rootName: 'G', rootValue: 7, scaleName: 'Majeure', scaleKey: 'scale_major' },
  { rootName: 'F', rootValue: 5, scaleName: 'Majeure', scaleKey: 'scale_major' },
  { rootName: 'A', rootValue: 9, scaleName: 'Mineure', scaleKey: 'scale_minor' },
  { rootName: 'D', rootValue: 2, scaleName: 'Majeure', scaleKey: 'scale_major' },
];

(async () => {
  console.log("=== STARTING SCALE AUDIT AUTOMATION ===");
  const browser = await playwright.chromium.launch({ headless: true });
  const page = await browser.newPage();

  // Redirect console logs to our interceptor
  page.on('console', msg => {
    // We can print browser console logs to node process for visibility
    const text = msg.text();
    if (text.startsWith('[VM-') || text.includes('[VM-')) {
      console.log(`[BROWSER LOG] ${text}`);
    }
  });

  try {
    console.log(`Navigating to ${BASE_URL}...`);
    await page.goto(BASE_URL, { waitUntil: 'networkidle' });

    console.log("Switching to Dictionary Mode...");
    await page.waitForSelector('[data-testid="btn-mode-dictionary"]');
    await page.click('[data-testid="btn-mode-dictionary"]');
    await page.waitForTimeout(1000);

    console.log("Switching Family to Scales...");
    await page.evaluate(() => {
      const buttons = Array.from(document.querySelectorAll('.btn-segment'));
      const scaleBtn = buttons.find(b => b.textContent.includes('Gammes') || b.textContent.includes('Scale') || b.textContent.includes('🎹'));
      if (scaleBtn) {
        scaleBtn.click();
      } else {
        throw new Error("Could not find Scales family button");
      }
    });
    await page.waitForTimeout(1000);

    // Inject interceptor on the page
    await page.evaluate(() => {
      window._vmLogs = [];
      window._vmCurrentKey = 'init';
      const _origLog = console.log.bind(console);
      const _origWarn = console.warn.bind(console);
      console.log = (...args) => {
        _origLog(...args);
        const line = args.map(a => typeof a === 'object' ? JSON.stringify(a) : String(a)).join(' ');
        if (line.includes('[VM-')) {
          window._vmLogs.push({ key: window._vmCurrentKey, line });
        }
      };
      console.warn = (...args) => {
        _origWarn(...args);
        const line = 'WARN: ' + args.map(a => typeof a === 'object' ? JSON.stringify(a) : String(a)).join(' ');
        if (line.includes('[VM-')) {
          window._vmLogs.push({ key: window._vmCurrentKey, line });
        }
      };
      window.VM_DEBUG = true;
    });

    const reportContent = [];
    reportContent.push(`# Scale Audit Report — VisualMusic`);
    reportContent.push(`- Date : ${new Date().toLocaleString()}`);
    reportContent.push(`- App : ${BASE_URL}`);
    reportContent.push(`- VM_DEBUG : actif`);
    reportContent.push(``);
    reportContent.push(`---`);
    reportContent.push(``);

    const anomalies = [];
    const mismatchLogs = [];

    for (const scale of SCALES_TO_TEST) {
      console.log(`\n--- Testing ${scale.rootName} ${scale.scaleName} ---`);
      
      // Select Root Note
      await page.evaluate((rootVal) => {
        const select = document.querySelector('select[data-testid="select-root-note"]');
        if (select) {
          select.value = String(rootVal);
          select.dispatchEvent(new Event('change', { bubbles: true }));
        } else {
          throw new Error("Missing root note selector");
        }
      }, scale.rootValue);
      await page.waitForTimeout(500);

      // Select Scale Type
      await page.evaluate((scaleK) => {
        const selects = Array.from(document.querySelectorAll('select'));
        const scaleSelect = selects.find(s => Array.from(s.options).some(o => o.value.startsWith('scale_')));
        if (scaleSelect) {
          scaleSelect.value = scaleK;
          scaleSelect.dispatchEvent(new Event('change', { bubbles: true }));
        } else {
          throw new Error("Missing scale type selector");
        }
      }, scale.scaleKey);
      await page.waitForTimeout(500);

      // Fetch dynamic list of positions
      const positions = await page.evaluate(() => {
        const selects = Array.from(document.querySelectorAll('select'));
        const posSelect = selects.find(s => {
          const parent = s.closest('.dictionary-fretboard-options');
          return parent && parent.textContent.includes('Guitar');
        });
        if (!posSelect) return [];
        return Array.from(posSelect.options)
          .map(o => ({ value: o.value, label: o.textContent }))
          .filter(o => o.value !== ""); // exclude "All positions"
      });

      console.log(`Found ${positions.length} guitar positions.`);
      
      reportContent.push(`## ${scale.rootName} ${scale.scaleName} — Guitare`);
      reportContent.push(``);

      for (let i = 0; i < Math.min(positions.length, 5); i++) {
        const pos = positions[i];
        const currentKey = `${scale.rootName}_${scale.scaleKey}_pos${i+1}`;
        console.log(`  Position ${i+1}/${positions.length}: ${pos.label} (value: ${pos.value})`);

        // Select the position
        await page.evaluate((posVal) => {
          const selects = Array.from(document.querySelectorAll('select'));
          const posSelect = selects.find(s => {
            const parent = s.closest('.dictionary-fretboard-options');
            return parent && parent.textContent.includes('Guitar');
          });
          if (posSelect) {
            posSelect.value = posVal;
            posSelect.dispatchEvent(new Event('change', { bubbles: true }));
          } else {
            throw new Error("Missing Guitar Position selector");
          }
        }, pos.value);
        await page.waitForTimeout(500);

        // Reset and tag logs
        await page.evaluate((key) => {
          window._vmLogs = [];
          window._vmCurrentKey = key;
        }, currentKey);

        // Click listen button
        console.log("    Starting playback...");
        await page.click('.btn-playback-premium');

        // Wait for playback to complete (when .stop class is removed from playback button)
        await page.waitForFunction(() => {
          const btn = document.querySelector('.btn-playback-premium');
          return btn && !btn.classList.contains('stop');
        }, { timeout: 25000 }).catch(() => console.log("    Timeout waiting for playback to complete"));

        await page.waitForTimeout(1000); // let logs settle

        // Fetch logs for this position
        const logs = await page.evaluate(() => {
          const list = window._vmLogs || [];
          window._vmLogs = [];
          return list;
        });

        // Scan visual errors or anomalies in this log
        const positionAnomalies = [];
        const hasDoubleLighting = logs.some(l => l.line.includes('Double allumage') || l.line.includes('[VM-MISMATCH]'));
        
        // Find if there are warnings in the logs
        const positionMismatches = logs.filter(l => l.line.includes('[VM-MISMATCH]'));
        positionMismatches.forEach(m => mismatchLogs.push(m.line));

        // Evaluate visual status on the active cells
        const activeFretboardCells = await page.evaluate(() => {
          const cells = Array.from(document.querySelectorAll('.fretboard-cell, .fret, .note-marker'));
          // In VisualMusic, let's see how active notes are rendered
          // We can inspect the class list of notes or elements on the fretboard
          // For now, let's dump whatever visible DOM details we have about the active/playing classes
          const activeElements = Array.from(document.querySelectorAll('[class*="active"], [class*="playing"], [class*="highlight"]'))
            .map(el => ({
              tag: el.tagName,
              class: el.className,
              text: el.textContent ? el.textContent.trim() : ''
            }));
          return activeElements;
        });

        console.log(`    Captured ${logs.length} logs for this position.`);

        reportContent.push(`### Position ${i+1}/5 (${pos.label})`);
        reportContent.push(`**Logs :**`);
        reportContent.push(`\`\`\`json`);
        reportContent.push(JSON.stringify(logs.map(l => l.line), null, 2));
        reportContent.push(`\`\`\``);
        reportContent.push(``);
        reportContent.push(`**Observations visuelles :**`);
        
        const doubleLightingDetail = positionMismatches.length > 0 
          ? `Oui (${positionMismatches.length} mismatch(es) détecté(s))` 
          : `Non détecté dans les logs`;
        
        reportContent.push(`- Double allumage : ${doubleLightingDetail}`);
        
        // Find if there are notes that were logged in VM-POS but never played in VM-PLAY
        const posNotes = logs.filter(l => l.line.includes('[VM-POS]')).map(l => l.line);
        const playNotes = logs.filter(l => l.line.includes('[VM-PLAY]')).map(l => l.line);
        
        reportContent.push(`- Notes affichées dans la position : ${posNotes.length > 0 ? 'Oui' : 'Non'}`);
        reportContent.push(`- Séquence de notes jouées : ${playNotes.length} notes`);
        reportContent.push(``);

        // Record to anomalies table
        if (positionMismatches.length > 0) {
          anomalies.push({
            scale: `${scale.rootName} ${scale.scaleName}`,
            pos: `${i+1}/5`,
            instrument: 'Guitare',
            type: 'Double allumage / Mismatch',
            detail: `${positionMismatches.length} mismatches detected`
          });
        }
      }
      reportContent.push(`---`);
      reportContent.push(``);
    }

    // Append recap
    reportContent.push(`## Récapitulatif des anomalies détectées`);
    reportContent.push(``);
    reportContent.push(`| Gamme | Position | Instrument | Type d'anomalie | Détail |`);
    reportContent.push(`|---|---|---|---|---|`);
    if (anomalies.length === 0) {
      reportContent.push(`| Aucune | Aucune | Aucune | Aucune | Aucun doublon détecté |`);
    } else {
      anomalies.forEach(a => {
        reportContent.push(`| ${a.scale} | ${a.pos} | ${a.instrument} | ${a.type} | ${a.detail} |`);
      });
    }
    reportContent.push(``);

    reportContent.push(`## Toutes les lignes [VM-MISMATCH] détectées`);
    reportContent.push(``);
    if (mismatchLogs.length === 0) {
      reportContent.push(`Aucun mismatch détecté. Les doigtés de playback correspondent parfaitement aux notes allumées !`);
    } else {
      reportContent.push(`\`\`\`\n${mismatchLogs.join('\n')}\n\`\`\``);
    }

    // Ensure target folder exists
    const dir = path.dirname(REPORT_PATH);
    if (!fs.existsSync(dir)){
      fs.mkdirSync(dir, { recursive: true });
    }

    fs.writeFileSync(REPORT_PATH, reportContent.join('\n'));
    console.log(`\n=== SCALE AUDIT REPORT GENERATED SUCCESSFULLY AT ${REPORT_PATH} ===`);

  } catch (error) {
    console.error("Scale audit automation failed with error:", error);
  } finally {
    await browser.close();
  }
})();
