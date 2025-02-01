import { test, expect } from '@playwright/test';
import { inputKey, expectLines } from './helper';

test('plain', async ({ page }) => {
  await page.goto('http://localhost:33333/plain-example-dist/index.html');
  await expectLines(page, ["Hello, world!", "Input your name: "]);
  await inputKey(page, "Shift+KeyF");
  await expectLines(page, ["Hello, world!", "Input your name: F"]);
  await inputKey(page, "Shift+KeyO");
  await expectLines(page, ["Hello, world!", "Input your name: FO"]);
  await inputKey(page, "Backspace");
  await expectLines(page, ["Hello, world!", "Input your name: F"]);
  await inputKey(page, "KeyO");
  await expectLines(page, ["Hello, world!", "Input your name: Fo"]);
  await inputKey(page, "KeyO");
  await expectLines(page, ["Hello, world!", "Input your name: Foo"]);
  await inputKey(page, "Space");
  await expectLines(page, ["Hello, world!", "Input your name: Foo "]);
  await inputKey(page, "Shift+KeyB");
  await expectLines(page, ["Hello, world!", "Input your name: Foo B"]);
  await inputKey(page, "KeyA");
  await expectLines(page, ["Hello, world!", "Input your name: Foo Ba"]);
  await inputKey(page, "KeyR");
  await expectLines(page, ["Hello, world!", "Input your name: Foo Bar"]);
  await inputKey(page, "Enter");
  await expectLines(page, ["Hello, world!", "Input your name: Foo Bar", "Hi, Foo Bar!"]);
});
