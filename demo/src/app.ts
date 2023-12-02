import { Terminal } from "xterm";
import { openpty } from "xterm-pty";
import "xterm/css/xterm.css";

// vim
(async() => {
  const vimXterm = new Terminal();
  const vimDiv = document.getElementById("vim-xterm");
  if (vimDiv) vimXterm.open(vimDiv);

  const { master, slave } = openpty();
  vimXterm.loadAddon(master);

  const { default: initEmscripten } = await import("../static/vim-core.js");
  const module = await initEmscripten({
    pty: slave,
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
  const { master, slave } = openpty();
  xterm.loadAddon(master);
  const button = document.getElementById(id + "-run") as HTMLButtonElement;
  let module: any;
  const invoke = async () => {
    xterm.clear();
    button.disabled = true;
    const { default: initEmscripten } = await loadJS();
    module = await initEmscripten({
      pty: slave,
      onExit: () => {
        module = undefined;
        button.disabled = false;
        xterm.clear();
        xterm.write("\r[Terminated. Push the 'Run' button to restart it.]\r\n");
      },
    });
  };
  button.onclick = invoke;
};

// As "new Worker(...)" is an idiom to allow parcel to track dependency,
// we need to write them literally
entry("example", () => import("../static/example-core.js"));

entry("sl", () => import("../static/sl-core.js"));

entry("sloane", () => import("../static/sloane-core.js"));
