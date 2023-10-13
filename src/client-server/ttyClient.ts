// This module provides a "TtyClient" class.
//
// This code runs in a Web Worker thread.
// It sends TTY requests to TtyServer that works in the main thread.
// The communication is based on Worker.postmessage and SharedArrayBuffer.

import { Termios } from "../termios";
import { TtyRequest, dataToTermios, termiosToData } from "./termiosData";

export class TtyClient {
  private streamCtrl: Int32Array;
  private streamData: Int32Array;

  constructor(shared: SharedArrayBuffer) {
    this.streamCtrl = new Int32Array(shared, 0, 1);
    this.streamData = new Int32Array(shared, 4);
  }

  private req(r: TtyRequest) {
    this.streamCtrl[0] = 0;
    self.postMessage(r);
    Atomics.wait(this.streamCtrl, 0, 0);
  }

  onRead(length: number | undefined) {
    if (!length) length = this.streamData.length - 1;
    this.req({ ttyRequestType: "read", length });
    const len = this.streamData[0];
    return Array.from(this.streamData.slice(1, len + 1));
  }

  onWrite(buf: number[]) {
    this.req({ ttyRequestType: "write", buf });
  }

  onWaitForReadable(timeout: number) {
    this.req({ ttyRequestType: "poll", timeout });
    return this.streamData[0] == 1;
  }

  onIoctlTcgets() {
    this.req({ ttyRequestType: "tcgets" });
    return dataToTermios(Array.from(this.streamData.slice(0, 13)));
  }

  onIoctlTcsets(termios: Termios) {
    const data = termiosToData(termios);
    this.req({ ttyRequestType: "tcsets", data });
  }

  onIoctlTiocgwinsz() {
    this.req({ ttyRequestType: "tiocgwinsz" });
    return [this.streamData[0], this.streamData[1]];
  }
}
