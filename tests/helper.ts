import { expect, type Page } from '@playwright/test';

export async function inputKey(page: Page, key: string) {
  const input = page.locator("#terminal textarea");
  await input.press(key);
}
export async function expectLines(page: Page, lines: (string | RegExp)[]) {
  const output = await page.locator(`#terminal .xterm-rows > div`).all();
  for (let i = 0; i < output.length; i++) {
	await expect(output[i]).toHaveText(lines[i] || "");
  }
}