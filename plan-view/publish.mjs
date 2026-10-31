import { readFileSync } from "node:fs";
import path from "node:path";
import { openCore } from "./core-socket.mjs";

const MAX_VALUE_BYTES = 1048576;
const MAX_ATTEMPTS = 5;
const STALE_MS = 7 * 24 * 60 * 60 * 1000;
const ID_PATTERN = /^[0-9a-f]{12}$/;

function isConflict(error) {
  return error.kind === "conflict";
}

function titleOf(markdown, source) {
  const heading = markdown.split("\n").find((line) => line.startsWith("# "));
  return heading ? heading.slice(2).trim() : path.basename(source);
}

function isStale(value, now) {
  if (value === null || value === undefined) return true;
  if (value.open !== false) return false;
  const updated = Date.parse(value.updated);
  return Number.isNaN(updated) || now - updated > STALE_MS;
}

async function withRetry(operation) {
  let lastError;
  for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt++) {
    try {
      return await operation();
    } catch (error) {
      if (!isConflict(error)) throw error;
      lastError = error;
    }
  }
  throw lastError;
}

async function writePlanDoc(core, id, value) {
  await withRetry(async () => {
    const current = await core.call("doc.get", { name: `plan-${id}` });
    await core.call("doc.set", {
      name: `plan-${id}`,
      value,
      version: current.version,
    });
  });
}

async function updatePlanList(core, id) {
  let dropped = [];
  const version = await withRetry(async () => {
    const current = await core.call("doc.get", { name: "plans" });
    const stored = Array.isArray(current.value) ? current.value : [];
    const ids = stored.filter(
      (entry) => typeof entry === "string" && ID_PATTERN.test(entry),
    );
    const remaining = [];
    dropped = [];
    for (const other of ids) {
      if (other === id) continue;
      const doc = await core.call("doc.get", { name: `plan-${other}` });
      if (isStale(doc.value, Date.now())) {
        dropped.push(other);
      } else {
        remaining.push(other);
      }
    }
    const result = await core.call("doc.set", {
      name: "plans",
      value: [id, ...remaining],
      version: current.version,
    });
    return result.version;
  });
  return { version, dropped };
}

async function deleteDropped(core, dropped) {
  for (const id of dropped) {
    try {
      const doc = await core.call("doc.get", { name: `plan-${id}` });
      if (doc.value === null) continue;
      await core.call("doc.set", {
        name: `plan-${id}`,
        value: null,
        version: doc.version,
      });
    } catch {}
  }
}

async function publish(core, source, id) {
  const markdown = readFileSync(source, "utf8");
  const value = {
    title: titleOf(markdown, source),
    source,
    markdown,
    updated: new Date().toISOString(),
    open: true,
  };
  if (Buffer.byteLength(JSON.stringify(value)) > MAX_VALUE_BYTES) {
    throw new Error("the plan is over 1 MiB");
  }
  await writePlanDoc(core, id, value);
  const { dropped } = await updatePlanList(core, id);
  await deleteDropped(core, dropped);
}

async function close(core, id) {
  await withRetry(async () => {
    const current = await core.call("doc.get", { name: `plan-${id}` });
    if (current.value === null) return;
    await core.call("doc.set", {
      name: `plan-${id}`,
      value: { ...current.value, open: false, updated: new Date().toISOString() },
      version: current.version,
    });
  });
}

function reasonOf(error) {
  const message = String(error?.message ?? error).replace(/\s+/g, " ").trim();
  return message.slice(0, 200);
}

async function main() {
  const [socketPath, command, ...rest] = process.argv.slice(2);
  const failure =
    command === "close"
      ? "plan-view: not closed in the office"
      : "plan-view: not published to the office";
  let core;
  try {
    core = await openCore(socketPath);
    if (command === "publish") await publish(core, rest[0], rest[1]);
    else if (command === "close") await close(core, rest[0]);
    else throw new Error("unknown command");
  } catch (error) {
    console.error(`${failure}: ${reasonOf(error)}`);
    process.exitCode = 1;
  } finally {
    core?.close();
  }
}

await main();
