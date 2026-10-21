const puppeteer = require('puppeteer');

(async () => {
  const browser = await puppeteer.launch({ headless: "new" });
  const page = await browser.newPage();
  
  page.on('console', msg => {
    if (msg.type() === 'error') {
      console.log('BROWSER ERROR:', msg.text());
    }
  });

  page.on('pageerror', err => {
    console.log('PAGE EXCEPTION:', err.toString());
  });

  try {
    await page.goto('http://localhost:3000/innovation-rh-connect/dashboard/management', { waitUntil: 'networkidle0' });
    console.log('Page loaded successfully');
    
    // Check if the application error text is on the screen
    const bodyText = await page.evaluate(() => document.body.innerText);
    if (bodyText.includes('Application error: a client-side exception has occurred')) {
      console.log('Found Application error text on screen!');
    }
  } catch (e) {
    console.error('Error navigating:', e);
  }

  await browser.close();
})();
