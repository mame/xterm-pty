import { test } from '@playwright/test';
import { expectLines } from './helper';

test('classic asyncify', async ({ page }) => {
  await page.goto('http://localhost:33333/vite-example-dist/index.html');
  await expectLines(page, ["Hello, world!"]);
});
