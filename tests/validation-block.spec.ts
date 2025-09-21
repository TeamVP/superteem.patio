import { test, expect } from '@playwright/test';

// Uses demo form in Home.tsx

test('validation blocks then allows submit', async ({ page }) => {
  await page.goto('http://localhost:3000/');
  // Attempt submit empty
  await page.getByRole('button', { name: 'Submit' }).click();
  await expect(page.getByText('Name is required')).toBeVisible();
  await expect(page.getByText('Age required')).toBeVisible();
  // Enter invalid age
  await page.fill('#demo-name', 'Alice');
  await page.fill('#demo-age', '999');
  await page.getByRole('button', { name: 'Submit' }).click();
  await expect(page.getByText('Age must be between 1 and 120')).toBeVisible();
  // Correct age
  await page.fill('#demo-age', '37');
  await page.getByRole('button', { name: 'Submit' }).click();
  await expect(page.getByRole('status')).toHaveText('Submitted!');
});
