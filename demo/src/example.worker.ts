importScripts(location.origin + "/workerTools.js");

onmessage = (msg) => {
  importScripts(location.origin + "/example-core.js");

  const module = (self as any).Module;

  module.setStatus = (message: string) => {
    self.postMessage({ type: "status", message });
  };
  module.noExitRuntime = false;
  module.onExit = (status: number) => {
    self.postMessage({ type: "exit", status });
  };

  const { emscriptenHack, TtyClient } = self as any;
  emscriptenHack(new TtyClient(msg.data));
};
