// This module provides the "openpty" function.
// It returns a master object, which is an addon for xterm.js, and a slave
// object, which serves as stdin/stdout for a process.
//
// Typical usage:
//
//   // Start an xterm.js instance
//   const xterm = new Terminal();
//
//   // Create master/slave objects
//   const { master, slave } = openpty();
//
//   // Connect the master object to xterm.js
//   xterm.loadAddon(ldiscAddon);
//
//   // Use slave.write instead of xterm.write
//   slave.write("Hello, world!\nInput your name:");
//
//   // Use slave.onReadable and slave.read instead of xterm.onData
//   slave.onReadable(() => {
//     xterm.write(`Hi, ${ slave.read().trim() }!\n`);
//   });

import { Terminal, ITerminalAddon, IDisposable } from "@xterm/xterm";
import { EventEmitter } from "./eventEmitter";
import { LineDiscipline } from "./lineDiscipline";
import { Termios, TermiosConfig } from "./termios";
import { stringToUtf8Bytes } from "./utils";

export type Signal = "SIGINT" | "SIGQUIT" | "SIGTSTP" | "SIGWINCH";

const bufferLimit = 4096;

class Master implements ITerminalAddon {
  private disposables: IDisposable[] = [];

  private _onWrite = new EventEmitter<[Uint8Array, () => void]>();
  readonly onWrite = this._onWrite.register;

  private fromLdiscToLowerBuffer: number[] = [];
  private waitingForLower = false; // xterm.js implements buffering

  private notifyWritable;
  private notifyResize;

  constructor(private ldisc: LineDiscipline, private slave: Slave) {
    const flushToLower = () => {
      if (this.fromLdiscToLowerBuffer.length >= 1) {
        this.waitingForLower = true;

        const buf = new Uint8Array(this.fromLdiscToLowerBuffer.splice(0, 4096));

        if (this.fromLdiscToLowerBuffer.length <= bufferLimit)
          this.notifyWritable();

        this._onWrite.fire([buf, flushToLower]);
      } else {
        this.waitingForLower = false;
      }
    };

    this.ldisc.onWriteToLower((buf) => {
      this.fromLdiscToLowerBuffer.push(...buf);
      if (!this.waitingForLower) flushToLower();
    });

    const { notifyWritable, notifyResize } = slave.initFromMaster();
    this.notifyWritable = notifyWritable;
    this.notifyResize = notifyResize;
  }

  activate(xterm: Terminal) {
    this.onWrite(([buf, callback]) => xterm.write(buf, callback));

    const onData = (str: string) => this.ldisc.writeFromLower(str);

    this.disposables.push(
      xterm.onData(onData),
      xterm.onBinary(onData),
      xterm.onResize(({ cols, rows }) => this.notifyResize(rows, cols))
    );
  }

  dispose(): void {
    this.disposables.forEach((d) => d.dispose());
    this.disposables.length = 0;
  }
}

export class Slave {
  private _onReadable = new EventEmitter<void>();
  readonly onReadable = this._onReadable.register;

  private _onWritable = new EventEmitter<void>();
  readonly onWritable = this._onWritable.register;

  private _onSignal = new EventEmitter<Signal>();
  readonly onSignal = this._onSignal.register;

  private fromLdiscToUpperBuffer: number[] = [];
  private fromUpperToLdiscBuffer: number[] = [];

  private winsize: [number, number] = [80, 24];

  constructor(private ldisc: LineDiscipline) {
    this.ldisc.onWriteToUpper((buf) => {
      this.fromLdiscToUpperBuffer.push(...buf);
      this._onReadable.fire();
    });

    this.ldisc.onFlowActivated(() => {
      if (this.fromUpperToLdiscBuffer.length >= 1) {
        this.ldisc.writeFromUpper(this.fromUpperToLdiscBuffer);
        this.fromUpperToLdiscBuffer.length = 0;
      }
    });

    this.ldisc.onSignalToUpper((sig) => {
      this._onSignal.fire(sig);
    });
  }

  initFromMaster() {
    return {
      notifyWritable: () => this._onWritable.fire(),
      notifyResize: (rows: number, cols: number) => {
        this.winsize = [cols, rows];
        this._onSignal.fire("SIGWINCH");
      },
    };
  }

  get readable() {
    return this.fromLdiscToUpperBuffer.length >= 1;
  }

  read(length?: number) {
    const len =
      typeof length !== "undefined"
        ? Math.min(this.fromLdiscToUpperBuffer.length, length)
        : this.fromLdiscToUpperBuffer.length;
    return this.fromLdiscToUpperBuffer.splice(0, len);
  }

  get writable() {
    return this.fromUpperToLdiscBuffer.length <= bufferLimit;
  }

  write(arg: string | number[]) {
    const buf = typeof arg == "string" ? stringToUtf8Bytes(arg) : arg;
    this.fromUpperToLdiscBuffer = this.fromUpperToLdiscBuffer.concat(buf);

    if (this.ldisc.flow) {
      this.ldisc.writeFromUpper(this.fromUpperToLdiscBuffer);
      this.fromUpperToLdiscBuffer.length = 0;
    }
  }

  ioctl(req: "TCGETS"): Termios;
  ioctl(req: "TCSETS", arg: TermiosConfig): void;
  ioctl(req: "TIOCGWINSZ"): [number, number];
  ioctl(req: "TCGETS" | "TCSETS" | "TIOCGWINSZ", arg?: any) {
    switch (req) {
      case "TCGETS":
        return this.ldisc.termios.clone();
      case "TCSETS":
        this.ldisc.termios = Termios.fromConfig(arg);
        return;
      case "TIOCGWINSZ":
        return this.winsize.slice();
    }
  }
}

export const openpty = () => {
  const ldisc = new LineDiscipline();
  const slave = new Slave(ldisc);
  const master = new Master(ldisc, slave);
  return { master, slave };
};
