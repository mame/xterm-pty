import { test, expect, type Page } from '@playwright/test';
import { inputKey } from './helper';

// poll(2) and select(2) with a timeout must return as soon as the PTY becomes
// readable or a signal handler is called, instead of sleeping until the
// timeout expires.
async function runPollTest(page: Page, url: string) {
  const rows = page.locator('#terminal .xterm-rows');
  const waitFor = (text: string) => expect(rows).toContainText(text, { timeout: 15000 });

  await page.goto(url);
  for (const kind of ['poll', 'select']) {
    await waitFor(`${kind}-readable: press a key`);
    await page.waitForTimeout(200);
    await inputKey(page, 'KeyA');

    await waitFor(`${kind}-interrupted: press C-c`);
    await page.waitForTimeout(200);
    await inputKey(page, 'Control+KeyC');
  }
  await waitFor('Poll test end');

  const text = await rows.innerText();
  for (const kind of ['poll', 'select']) {
    for (const name of ['readable', 'interrupted']) {
      expect(text).toContain(`${kind}-${name}: ok`);
    }
  }
}

test('poll asyncify', async ({ page }) => {
  await runPollTest(page, 'http://localhost:33333/poll/index.html');
});

test('poll worker', async ({ page }) => {
  await runPollTest(page, 'http://localhost:33333/poll/worker.html');
});
