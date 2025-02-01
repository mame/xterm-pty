import { test } from '@playwright/test';
import { expectLines } from './helper';

test('classic asyncify', async ({ page }) => {
  await page.goto('http://localhost:33333/classic-asyncify-dist/index.html');
  await expectLines(page, ["Hello, world!"]);
});

test('classic worker', async ({ page }) => {
  await page.goto('http://localhost:33333/classic-worker-dist/index.html');
  await expectLines(page, ["Hello, world!"]);
});
