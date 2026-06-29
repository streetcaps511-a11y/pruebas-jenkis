const { test, expect } = require('@playwright/test');

test('Validación básica de carga de página', async ({ page }) => {
  // Navegamos a una página de ejemplo (puedes cambiarlo por tu localhost)
  await page.goto('https://playwright.dev/');

  // Validamos que el título de la página contenga 'Playwright'
  await expect(page).toHaveTitle(/Playwright/);

  // Validamos que exista un enlace visible llamado 'Get started'
  const getStarted = page.locator('text=Get started');
  await expect(getStarted).toBeVisible();
});
