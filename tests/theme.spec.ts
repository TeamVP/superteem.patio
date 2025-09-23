import { test, expect } from '@playwright/test';

test('RQ-001 theme toggle persists', async ({ page }) => {
  await page.goto('/');
  const themeText = page.locator('p');
  await expect(themeText).toContainText('light');

  await page.getByRole('button', { name: 'Toggle Theme' }).click();
  await expect(themeText).toContainText('dark');
});
