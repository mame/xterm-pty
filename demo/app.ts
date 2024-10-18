import { Terminal } from "@xterm/xterm";
import { FitAddon } from "xterm-addon-fit";
import { openpty } from "xterm-pty";
import "xterm/css/xterm.css";

// vim
(async() => {
  const vimXterm = new Terminal();

  const vimDiv = document.getElementById("vim-xterm");
  if (vimDiv) vimXterm.open(vimDiv);

  const { master, slave } = openpty();
  vimXterm.loadAddon(master);

  const fitAddon = new FitAddon();
  vimXterm.loadAddon(fitAddon);
  new ResizeObserver(() => fitAddon.fit()).observe(vimDiv);
  fitAddon.fit();

  const vimStatus = document.getElementById("vim-status");

  const { default: initEmscripten } = await import("./static/vim-core.js");
  const module = await initEmscripten({
    pty: slave,
    setStatus: (s) => { vimStatus.innerText = s ? s : "Ready"; },
    onExit: () => { status.innerText = "Terminated"; },
  });

  const links = new Map();
  const files = document.getElementById("files")!;

  module.FS.trackingDelegate["onWriteToFile"] = (path: string) => {
    if (!path.startsWith("/home/web_user/") || path.endsWith(".swp")) {
      return;
    }
    const data = module.FS.readFile(path);
    const blob = new Blob([data], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    let a = links.get(path);
    if (a) {
      URL.revokeObjectURL(a.href);
      a.href = url;
    } else {
      a = Object.assign(document.createElement("a"), {
        href: url,
        download: path.split("/").pop() || "dummy.txt",
        textContent: path,
      });
      links.set(path, a);
      files.appendChild(a);
    }
  };
})();

const entry = (id: string, loadJS: () => Promise<any>) => {
  const xterm = new Terminal();

  const div = document.getElementById(id + "-xterm");
  if (div) xterm.open(div);


  const fitAddon = new FitAddon();
  xterm.loadAddon(fitAddon);
  new ResizeObserver(() => fitAddon.fit()).observe(div);
  fitAddon.fit();

  const status = document.getElementById(id + "-status");

  const button = document.getElementById(id + "-run") as HTMLButtonElement;
  let module: any;
  const invoke = async () => {
    xterm.clear();
    const { master, slave } = openpty();
    xterm.loadAddon(master);
    button.disabled = true;
    const { default: initEmscripten } = await loadJS();
    module = await initEmscripten({
      pty: slave,
      setStatus: (s) => { status.innerText = s ? s : "Ready"; },
      onExit: () => {
        module = undefined;
        button.disabled = false;
        status.innerText = "Terminated";
        master.dispose();
        xterm.clear();
        xterm.write("\r[Terminated. Push the 'Run' button to restart it.]\r\n");
      },
    });
  };
  button.onclick = invoke;
};

entry("example", () => import("./static/example-core.js"));

entry("sl", () => import("./static/sl-core.js"));

entry("sloane", () => import("./static/sloane-core.js"));
