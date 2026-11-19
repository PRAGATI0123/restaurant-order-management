import { idbGet, idbSet } from "@/lib/persistence/idb";
import type { NetworkSimulation, OutboxEntry, SendResult } from "@/types/sync";
import { checkOnServer, type ServerData } from "./server-rules";

/**
 * THE MOCK API: a pretend restaurant server, living inside the browser.
 *
 * It behaves like a real one on a real network, so the till's offline-first
 * code can be tried without a backend:
 *  - LOADING: every request takes time (~0.4 s; ~2.5 s with "slow network").
 *  - ERRORS: no internet → "offline"; a share of requests fail with a server
 *    error (the failure rate in the Sync panel). The till retries those.
 *  - VALIDATION: the server checks each record again (server-rules.ts) and
 *    rejects wrong data. The till does NOT retry those; a person looks.
 *
 * What the server has accepted is kept in IndexedDB too ("mock-server"),
 * as if it were the restaurant's central database.
 */
const SERVER_KEY = "mock-server";
let saved: ServerData | undefined;

async function serverData(): Promise<ServerData> {
  saved ??= new Map(
    Object.entries((await idbGet<Record<string, unknown>>(SERVER_KEY)) ?? {}),
  );
  return saved;
}

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

/** Sends one change to the pretend server and returns its answer. */
export async function sendToServer(
  entry: OutboxEntry,
  network: NetworkSimulation,
  random: () => number = Math.random,
): Promise<SendResult> {
  const online = typeof navigator === "undefined" || navigator.onLine;
  if (!online || network.offline) {
    await sleep(150); // a dropped connection fails fast
    return { ok: false, kind: "offline", message: "No internet connection." };
  }

  // Latency, with a little jitter so it feels like a real network.
  await sleep((network.slow ? 2_500 : 400) + random() * 200);

  if (random() < network.failureRate) {
    return {
      ok: false,
      kind: "server",
      message: "Server error 503 (busy). Will try again.",
    };
  }

  const data = await serverData();
  const problem = checkOnServer(entry, data);
  if (problem) return { ok: false, kind: "rejected", message: problem };

  if (entry.op === "delete") data.delete(entry.key);
  else data.set(entry.key, entry.data);
  await idbSet(SERVER_KEY, Object.fromEntries(data));
  return { ok: true };
}

/** How many records the server holds (shown in the Sync panel). */
export async function serverRecordCount(): Promise<number> {
  return (await serverData()).size;
}
