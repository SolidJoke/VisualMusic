import puppeteer from 'puppeteer';

(async () => {
    console.log("Starting local headless browser test...");
    const browser = await puppeteer.launch({
        args: ['--no-sandbox', '--disable-setuid-sandbox']
    });
    const page = await browser.newPage();
    
    page.on('console', msg => {
        const text = msg.text();
        if (msg.type() === 'error' || text.includes('Error')) {
            console.log(`[BROWSER ERROR] ${text}`);
            if (msg.stackTrace && typeof msg.stackTrace === 'function') {
               console.log(msg.stackTrace());
            }
        }
    });

    page.on('pageerror', error => {
         console.log(`[PAGE EXCEPTION] ${error.message}`);
         console.log(error.stack);
    });

    try {
        await page.goto('http://localhost:5175', { waitUntil: 'networkidle2' });
        console.log("Page loaded. Looking for Expert Fingering toggle...");
        
        // Wait for and click "Voir Doigtés (Expert)"
        const toggleSelector = 'text/Voir Doigtés'; // Find element containing text
        await page.waitForSelector("xpath///button[contains(., 'Voir Doigtés')]", {timeout: 3000}).catch(() => console.log("Missing expert toggle"));
        const expertBtns = await page.$x("//button[contains(., 'Voir Doigtés')]");
        if (expertBtns.length > 0) {
            await expertBtns[0].click();
            console.log("Clicked Expert Fingering toggle.");
        }

        console.log("Looking for chord button 'C' or any chord in progression...");
        // Wait for progression chords to appear
        await page.waitForSelector('.progression-track .chord-button', {timeout: 2000}).catch(() => {});
        const chords = await page.$$('.progression-track .chord-button');
        if (chords.length > 0) {
            console.log(`Found ${chords.length} chords. Clicking the first one...`);
            await chords[0].click();
            console.log("Clicked first chord.");
            // Wait a bit to observe consequences
            await new Promise(resolve => setTimeout(resolve, 1000));
            
            console.log("Clicking the second chord...");
            if(chords.length > 1) await chords[1].click();
            await new Promise(resolve => setTimeout(resolve, 1000));
        } else {
            console.log("No chord buttons found in progression track.");
        }

        console.log("Test sequence complete. Closing.");
    } catch (e) {
        console.error("Test script failed:", e);
    } finally {
        await browser.close();
    }
})();
