// This module provides a "TtyServer" class.
//
// This code runs in the main thread.
// It accepts TTY requests from TtyClient that works in a Web Worker.
// The communication is based on Worker.postmessage and SharedArrayBuffer.

import { Slave } from "../pty";
import { TtyRequest, dataToTermios, termiosToData } from "./termiosData";

type State = "idle" | "input" | "poll";

// UI thread side
export class TtyServer {
  private shared = new SharedArrayBuffer(4 + 256);
  private streamCtrl = new Int32Array(this.shared, 0, 1);
  private streamData = new Int32Array(this.shared, 4);

  private state: State = "idle";
  private timeoutHandler: NodeJS.Timeout | null = null;

  ack() {
    Atomics.store(this.streamCtrl, 0, 1);
    Atomics.notify(this.streamCtrl, 0);
    this.state = "idle";
  }

  fromWorkerBuf: number[] = [];
  toWorkerBuf: number[] = [];

  constructor(private slave: Slave) {
    slave.onWritable(() => {
      if (this.fromWorkerBuf.length >= 1) this.feedFromWorker();
    });

    slave.onReadable(() => {
      this.toWorkerBuf.push(...slave.read());

      switch (this.state) {
        case "poll":
          this.waitForReadable(0);
          break;
        case "input":
          this.feedToWorker(this.toWorkerBuf.length);
          break;
      }
    });

    slave.onSignal((sig) => {
      console.info(`A signal ${sig} is currently ignored`);
      // TODO: send a signal to the Emscripten'ed process
    });
  }

  feedToWorker(length: number) {
    if (this.state != "input") throw "worker does not wait for input";
    if (length > this.streamData.length - 1)
      length = this.streamData.length - 1;
    const buf = this.toWorkerBuf.splice(0, length);
    this.streamData[0] = buf.length;
    this.streamData.set(buf, 1);
    this.ack();
  }

  feedFromWorker() {
    if (this.fromWorkerBuf.length == 0) throw "worker does not wait for output";
    if (this.slave.writable) {
      this.ack();
      this.slave.write(this.fromWorkerBuf.splice(0));
    }
  }

  waitForReadable(timeout: number) {
    if (this.state != "poll") throw "worker does not wait for poll";

    if (this.timeoutHandler) {
      clearTimeout(this.timeoutHandler);
      this.timeoutHandler = null;
    }

    if (this.toWorkerBuf.length > 0) {
      this.streamData[0] = 1; // ready for reading
      this.ack();
    } else {
      if (timeout < 0) {
        // block indefinitely
      } else if (timeout > 0) {
        // block with timeout
        this.timeoutHandler = setTimeout(
          () => this.waitForReadable(0),
          timeout * 1000
        );
      } else {
        this.streamData[0] = 2; // timeout
        this.ack();
      }
    }
  }

  private stop_: (() => void) | null = null;

  start(worker: Worker, callback?: (ev: MessageEvent<any>) => void) {
    this.stop();
    let stop = false;
    this.stop_ = () => (stop = true);

    worker.onmessage = (ev: MessageEvent<any>) => {
      const req_ = ev.data;

      if (typeof req_ == "object" && req_.ttyRequestType) {
        if (stop) return;

        const req: TtyRequest = req_;

        //console.debug(req);

        switch (req.ttyRequestType) {
          case "read":
            this.state = "input";
            if (this.toWorkerBuf.length >= 1) this.feedToWorker(req.length);
            break;
          case "write":
            this.fromWorkerBuf.push(...req.buf);
            this.feedFromWorker();
            break;
          case "poll":
            this.state = "poll";
            this.waitForReadable(req.timeout);
            break;
          case "tcgets":
            this.streamData.set(termiosToData(this.slave.ioctl("TCGETS")));
            this.ack();
            break;
          case "tcsets":
            this.slave.ioctl("TCSETS", dataToTermios(req.data));
            this.ack();
            break;
          case "tiocgwinsz": {
            const [rows, cols] = this.slave.ioctl("TIOCGWINSZ");
            this.streamData[0] = rows;
            this.streamData[1] = cols;
            this.ack();
            break;
          }
        }
      } else if (callback) {
        callback(ev);
      }
    };

    // kick the Web Worker
    worker.postMessage(this.shared);
  }

  stop() {
    if (this.stop_) this.stop_();
  }
}
