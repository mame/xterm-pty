// emscriptenHack intercepts some syscalls from Emscripten runtime by
// rewriting some internal functions in Emscripten runtime.
// Unfortunately, it is very fragile. We tested it with Emscripten 2.0.13.

import { Termios, dataToTermios, termiosToData } from "./termios";

declare const self: {
  Module: any;
  FS: any;
  TTY: any;
  ENV: any;
  asmLibraryArg: any;
  SYSCALLS: any;
  HEAP32: Int32Array;
} & typeof globalThis;

interface Client {
  onRead: (length?: number) => number[];
  onWrite: (buf: number[]) => void;
  onWaitForReadable: (timeout: number) => boolean;
  onIoctlTcgets: () => Termios;
  onIoctlTcsets: (termios: Termios) => void;
  onIoctlTiocgwinsz: () => [number, number];
}

export const emscriptenHack = (client: Client) => {
  if (self.ENV) self.ENV["TERM"] = "xterm-256color";

  const buf: number[] = [];

  const myGetchar = () => {
    if (buf.length == 0) {
      buf.push(...client.onRead());
    }
    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    const c = buf.shift()!;
    return c >= 0 ? (c < 128 ? c : c - 256) : null;
  };

  const myPutchar = (_tty: any, val: number | null) => {
    if (typeof val == "number") client.onWrite([(val + 256) % 256]);
  };

  const myPoll = (_stream: any, timeval: number) => {
    const readable = client.onWaitForReadable(timeval);
    return readable ? 5 /* readable & writable */ : 4 /* only writable */;
  };

  const myIoctlTcgets = () => {
    const termios = client.onIoctlTcgets();
    const addr = self.SYSCALLS.get();
    self.HEAP32.set(termiosToData(termios), addr >> 2);
  };

  const myIoctlTcsets = () => {
    const addr = self.SYSCALLS.get();
    const data = Array.from(self.HEAP32.slice(addr >> 2, (addr >> 2) + 13));
    client.onIoctlTcsets(dataToTermios(data));
  };

  const myIoctlTiocgwinsz = () => {
    const [rows, cols] = client.onIoctlTiocgwinsz();
    const argp = self.SYSCALLS.get();
    const addr = argp >> 2;
    self.HEAP32[addr] = cols + (rows << 16);
  };

  const myIoctl = (fd: number, op: number, varargs: any) => {
    self.SYSCALLS.varargs = varargs;
    switch (op) {
      case 0x5401: // TCGETS
        myIoctlTcgets();
        return 0;
      case 0x5402: // TCSETS
      case 0x5403: // TCSETSW
      case 0x5404: // TCSETSF
        myIoctlTcsets();
        return 0;
      case 0x540b: // TCFLSH
        return 0;
      case 0x5413: // TIOCGWINSZ
        myIoctlTiocgwinsz();
        return 0;
      default:
        return originalIoctl(fd, op, varargs);
    }
  };

  const myNewselect = (
    nfds: number,
    readfds: number,
    writefds: number,
    exceptfds: number,
    timeout: number
  ) => {
    try {
      const readHeap = (addr: number): number[] => {
        return addr
          ? Array.from(self.HEAP32.slice(addr >> 2, (addr >> 2) + 2))
          : [0, 0];
      };
      const writeHeap = (addr: number, val: number[]) => {
        if (addr) self.HEAP32.set(val, addr >> 2);
      };

      const srcRead = readHeap(readfds);
      const srcWrite = readHeap(writefds);
      const srcExcept = readHeap(exceptfds);
      const [timevalLow, timevalHigh] = readHeap(timeout);
      const timeval = timeout ? timevalLow + timevalHigh / 1000000 : -1;

      let total = 0;

      const check = (src: number[], fd: number) => {
        return src[Math.floor(fd / 32)] & (1 << fd % 32);
      };
      const update = (dst: number[], fd: number) => {
        dst[Math.floor(fd / 32)] |= 1 << fd % 32;
        total++;
      };

      const dstRead = [0, 0];
      const dstWrite = [0, 0];
      const dstExcept = [0, 0];

      for (let fd = 0; fd < nfds; fd++) {
        const stream = self.FS.getStream(fd);
        if (!stream) throw new self.FS.ErrnoError(8);

        const flags = stream.stream_ops.poll
          ? stream.stream_ops.poll(stream, timeval)
          : self.SYSCALLS.DEFAULT_POLLMASK;

        if (flags & 1 && check(srcRead, fd)) update(dstRead, fd);
        if (flags & 4 && check(srcWrite, fd)) update(dstWrite, fd);
        if (flags & 2 && check(srcExcept, fd)) update(dstExcept, fd);
      }

      writeHeap(readfds, dstRead);
      writeHeap(writefds, dstWrite);
      writeHeap(exceptfds, dstExcept);

      return total;
    } catch (e: any) {
      if (typeof self.FS === "undefined" || !(e instanceof self.FS.ErrnoError))
        throw e;
      return -e.errno;
    }
  };

  self.TTY.default_tty_ops.get_char = myGetchar;
  self.TTY.default_tty_ops.put_char = myPutchar;
  self.TTY.default_tty1_ops.put_char = myPutchar;

  self.TTY.stream_ops.poll = myPoll;

  let ioctlKey = "dummy";
  let newselectKey = "dummy";
  for (const key in self.asmLibraryArg) {
    if (
      key == "__syscall_ioctl" ||
      key == "__sys_ioctl" ||
      self.asmLibraryArg[key].name == "___syscall_ioctl" ||
      self.asmLibraryArg[key].name == "___sys_ioctl"
    ) {
      ioctlKey = key;
    }
    if (
      key == "__syscall_newselect" ||
      key == "__sys__newselect" ||
      self.asmLibraryArg[key].name == "___syscall__newselect" ||
      self.asmLibraryArg[key].name == "___sys__newselect"
    ) {
      newselectKey = key;
    }
  }

  if (ioctlKey == "dummy") {
    console.warn("failed to overwrite __syscall_ioctl of emscripten");
  }

  if (newselectKey == "dummy") {
    console.warn("failed to overwrite __syscall_newselect of emscripten");
  }

  const originalIoctl = self.asmLibraryArg[ioctlKey];
  self.asmLibraryArg[ioctlKey] = myIoctl;
  self.asmLibraryArg[newselectKey] = myNewselect;
};
