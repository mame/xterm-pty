import { Terminal } from "xterm";
import { openpty, TtyServer } from "xterm-pty";
import "xterm/css/xterm.css";

// vim
const vimXterm = new Terminal();
const vimDiv = document.getElementById("vim-xterm");
if (vimDiv) vimXterm.open(vimDiv);

const { master, slave } = openpty();
vimXterm.loadAddon(master);

const links: { [key: string]: HTMLAnchorElement } = {};
const vimWorker = new Worker(new URL("vim.worker.ts", import.meta.url));

new TtyServer(slave).start(vimWorker, (msg) => {
  switch (msg.data.type) {
    case "status":
      vimXterm.write(`\r${msg.data.message}\x1b[0K`);
      break;
    case "file": {
      const path: string = msg.data.path;
      const blob = new Blob([msg.data.data], { type: "text/plain" });
      const url = window.URL.createObjectURL(blob);
      if (path in links) {
        links[path].href = url;
      } else {
        const a = document.createElement("a");
        a.href = url;
        a.download = path.split("/").pop() || "dummy.txt";
        a.innerText = path;
        links[path] = a;
        const files = document.getElementById("files");
        files?.appendChild(a);
      }
      break;
    }
  }
});

const entry = (id: string, invokeWorker: () => Worker) => {
  const xterm = new Terminal();
  const div = document.getElementById(id + "-xterm");
  if (div) xterm.open(div);
  const { master, slave } = openpty();
  xterm.loadAddon(master);
  const button = document.getElementById(id + "-run") as HTMLButtonElement;
  let worker: Worker | null = null;
  const ttyServer = new TtyServer(slave);
  const invoke = () => {
    xterm.clear();
    button.innerText = "Terminate";
    button.onclick = terminate;
    worker = invokeWorker();
    ttyServer.start(worker, (msg: MessageEvent<any>) => {
      switch (msg.data.type) {
        case "status":
          xterm.write(`\r${msg.data.message}\x1b[0K`);
          break;
        case "exit":
          terminate();
          break;
      }
    });
  };
  const terminate = () => {
    button.innerText = "Run";
    button.onclick = invoke;
    if (worker) worker.terminate();
    ttyServer.stop();
    xterm.write("\x1b[2J[Terminated. Push the 'Run' button to restart it.]");
  };
  button.onclick = invoke;
};

// As "new Worker(...)" is an idiom to allow parcel to track dependency,
// we need to write them literally
entry("example", () => {
  return new Worker(new URL("example.worker.ts", import.meta.url));
});

entry("sl", () => {
  return new Worker(new URL("sl.worker.ts", import.meta.url));
});

entry("sloane", () => {
  return new Worker(new URL("sloane.worker.ts", import.meta.url));
});
