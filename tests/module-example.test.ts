import { test } from '@playwright/test';
import { expectLines } from './helper';

test('module asyncify', async ({ page }) => {
  await page.goto('http://localhost:33333/module-asyncify-dist/index.html');
  await expectLines(page, ["Hello, world!"]);
});

test('module worker', async ({ page }) => {
  await page.goto('http://localhost:33333/module-worker-dist/index.html');
  await expectLines(page, ["Hello, world!"]);
});
