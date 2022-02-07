importScripts(location.origin + "/workerTools.js");

onmessage = (msg) => {
  importScripts(location.origin + "/fs.js");
  importScripts(location.origin + "/vim-core.js");

  const module = (self as any).Module;
  const fs = (self as any).FS;

  module.setStatus = (message: string) => {
    self.postMessage({ type: "status", message });
  };
  module.noExitRuntime = false;
  module.onExit = (status: number) => {
    self.postMessage({ type: "exit", status });
  };

  fs.trackingDelegate["onWriteToFile"] = (path: string) => {
    if (path.startsWith("/home/web_user/") && !path.endsWith(".swp")) {
      const data = (self as any).FS.readFile(path);
      (self as unknown as Worker).postMessage({ type: "file", path, data });
    }
  };

  const { emscriptenHack, TtyClient } = self as any;
  emscriptenHack(new TtyClient(msg.data));
};
