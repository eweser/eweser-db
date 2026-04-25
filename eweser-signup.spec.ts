import { test, expect } from '@playwright/test';

test('signup page loads and renders form', async ({ page }) => {
  const email = `qa-test-${Date.now()}@gmail.com`;
  await page.goto(
    'https://login.eweser.com/sign-up?collections=all&domain=note.eweser.com&name=Ewe%20Note&redirect=https%3A%2F%2Fnote.eweser.com%2F',
    { waitUntil: 'domcontentloaded' }
  );
  await expect(page.getByLabel('Name')).toBeVisible({ timeout: 20000 });
  await expect(page.getByLabel('Email')).toBeVisible();
  await expect(page.getByLabel('Password')).toBeVisible();

  await page.getByLabel('Name').fill('Prod QA');
  await page.getByLabel('Email').fill(email);
  await page.getByLabel('Password').fill('Password123!');
  await page.getByRole('button', { name: 'Create account' }).click();

  await expect(page).toHaveURL(/await-confirm|signin|sign-up|verify|sign-in/i, {
    timeout: 20000,
  });
});
