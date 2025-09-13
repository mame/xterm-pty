import { test } from '@playwright/test';
import { inputKey, expectLines } from './helper';

test('echo', async ({ page }) => {
  await page.goto('http://localhost:33333/signals/index.html');
  await inputKey(page, "Control+KeyC");
  await expectLines(page, [
	/terminal size: 24 rows, \d+ columns/,
	"^Creceived SIGINT",
  ]);
  const { width, height } = page.viewportSize()!;
  await page.setViewportSize({ width: width * 2, height });
  await expectLines(page, [
	/terminal size: 24 rows, \d+ columns/,
	"^Creceived SIGINT",
	"received SIGWINCH",
	/terminal size: 24 rows, \d+ columns/,
  ]);
});
