import { expect, test } from "vitest";
import type { Terminal } from "@xterm/xterm";
import { openpty } from "./pty";
import { Flags } from "./termios";

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

test("slave is not notified as readable on C-s/C-q in non-canonical mode", () => {
  const { master, slave } = openpty();
  const { xterm, input } = fakeTerminal();
  master.activate(xterm);

  const t = slave.ioctl("TCGETS");
  slave.ioctl("TCSETS", { ...t, lflag: t.lflag & ~Flags.ICANON });

  let notified = 0;
  slave.onReadable(() => notified++);

  // C-s and C-q (with IXON) deliver no data, so they must not make the slave
  // look readable; otherwise a blocking read would mistake it for EOF.
  input("\x13");
  input("\x11");
  expect(notified).toBe(0);
  expect(slave.readable).toBe(false);

  input("a");
  expect(notified).toBe(1);
  expect(slave.read()).toEqual([0x61]);
});

test("slave is notified as readable on VEOF in canonical mode", () => {
  const { master, slave } = openpty();
  const { xterm, input } = fakeTerminal();
  master.activate(xterm);

  let notified = 0;
  slave.onReadable(() => notified++);

  // C-d on an empty line is how EOF is delivered: a notification without data.
  input("\x04");
  expect(notified).toBe(1);
  expect(slave.readable).toBe(false);
});
