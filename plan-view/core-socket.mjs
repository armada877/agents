import net from "node:net";

const TIMEOUT_MS = 5000;
const MAX_LINE_BYTES = 2 * 1024 * 1024;

export async function openCore(socketPath) {
  const socket = await connect(socketPath);
  let buffer = "";
  let nextId = 1;
  let pending = null;

  function fail(error) {
    if (!pending) return;
    const { timer, reject } = pending;
    pending = null;
    clearTimeout(timer);
    socket.destroy();
    reject(error);
  }

  function handleLine(line) {
    let reply;
    try {
      reply = JSON.parse(line);
    } catch {
      fail(new Error("malformed reply from the core"));
      return;
    }
    if (!pending) return;
    if (reply.id !== pending.id) {
      fail(new Error("reply id does not match the request"));
      return;
    }
    const { timer, resolve, reject } = pending;
    pending = null;
    clearTimeout(timer);
    if (reply.error) {
      const error = new Error(String(reply.error.message ?? "core error"));
      error.kind = reply.error.data?.kind;
      reject(error);
      return;
    }
    resolve(reply.result);
  }

  socket.setEncoding("utf8");
  socket.on("data", (chunk) => {
    buffer += chunk;
    if (Buffer.byteLength(buffer) > MAX_LINE_BYTES && !buffer.includes("\n")) {
      fail(new Error("reply from the core is too long"));
      return;
    }
    let newline;
    while ((newline = buffer.indexOf("\n")) !== -1) {
      const line = buffer.slice(0, newline);
      buffer = buffer.slice(newline + 1);
      if (Buffer.byteLength(line) > MAX_LINE_BYTES) {
        fail(new Error("reply from the core is too long"));
        return;
      }
      if (line.trim() !== "") handleLine(line);
    }
  });
  socket.on("error", (error) => fail(error));
  socket.on("close", () => fail(new Error("the core closed the socket")));

  function call(method, params) {
    return new Promise((resolve, reject) => {
      if (pending || socket.destroyed) {
        reject(new Error("the core connection is not ready"));
        return;
      }
      const id = nextId++;
      const timer = setTimeout(
        () => fail(new Error(`${method} timed out`)),
        TIMEOUT_MS,
      );
      pending = { id, timer, resolve, reject };
      socket.write(`${JSON.stringify({ jsonrpc: "2.0", id, method, params })}\n`);
    });
  }

  function close() {
    socket.destroy();
  }

  return { call, close };
}

function connect(socketPath) {
  return new Promise((resolve, reject) => {
    const socket = net.createConnection(socketPath);
    const timer = setTimeout(() => {
      socket.destroy();
      reject(new Error("connect timed out"));
    }, TIMEOUT_MS);
    socket.once("connect", () => {
      clearTimeout(timer);
      socket.removeAllListeners("error");
      resolve(socket);
    });
    socket.once("error", (error) => {
      clearTimeout(timer);
      reject(error);
    });
  });
}
