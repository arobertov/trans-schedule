const { test } = require('playwright/test');

test('capture admin runtime errors', async ({ page }) => {
  const errors = [];

  page.on('pageerror', (error) => {
    errors.push(`pageerror: ${error.message}`);
  });

  page.on('console', (message) => {
    if (message.type() === 'error') {
      errors.push(`console: ${message.text()}`);
    }
  });

  const response = await page.goto('http://localhost:3000/admin', {
    waitUntil: 'domcontentloaded',
  });

  await page.waitForTimeout(5000);

  console.log(`status: ${response ? response.status() : 'no-response'}`);
  console.log(`url: ${page.url()}`);

  for (const error of errors) {
    console.log(error);
  }

  const bodyText = await page.locator('body').innerText();
  console.log(`body-has-invalid-element: ${bodyText.includes('Element type is invalid')}`);
});