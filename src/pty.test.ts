import { expect, test } from "vitest";
import type { Terminal } from "@xterm/xterm";
import { openpty } from "./pty";

// A minimal stand-in for xterm.js: output is consumed immediately, and the
// returned `input` function emulates key input.
const fakeTerminal = () => {
  let onData: (data: string) => void = () => {};
  const dummy = { dispose: () => {} };
  const xterm = {
    write: (_buf: Uint8Array, callback: () => void) => callback(),
    onData: (listener: (data: string) => void) => {
      onData = listener;
      return dummy;
    },
    onBinary: () => dummy,
    onResize: () => dummy,
  };
  return {
    xterm: xterm as unknown as Terminal,
    input: (data: string) => onData(data),
  };
};

test("slave is writable when onWritable fires after C-q", () => {
  const { master, slave } = openpty();
  const { xterm, input } = fakeTerminal();
  master.activate(xterm);

  // Stop the output with C-s and fill the buffer.
  input("\x13");
  slave.write(" ".repeat(8192));
  expect(slave.writable).toBe(false);

  const writableOnNotification: boolean[] = [];
  slave.onWritable(() => writableOnNotification.push(slave.writable));

  // Resume the output with C-q.
  input("\x11");
  expect(slave.writable).toBe(true);
  expect(writableOnNotification.length).toBeGreaterThan(0);
  expect(writableOnNotification.every((w) => w)).toBe(true);
});
