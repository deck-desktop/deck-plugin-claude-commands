// What a user can change: which commands get a button, how many, and which ask before running.
// Deck draws these rows on the plugin's page of Settings and keeps the values in its `settings`
// config; this reads them, and again whenever it changes.
import { useSyncExternalStore } from "react";
import { configRead } from "deck-plugin-sdk/bridge";
import { listen } from "deck-plugin-sdk/event";

/** On the plugin's own page of Settings (no Deck group is named "chat"). */
const IN = "chat";
export const settings = [
  { in: IN, key: "inline", title: "Commands in a sentence", desc: "A button for inline code that starts with a known tool, such as npm test, not only for shell blocks.", default: true },
  { in: IN, key: "max", title: "Buttons under a reply", choices: [["2", "Up to 2"], ["4", "Up to 4"], ["8", "Up to 8"]], default: "4" },
  { in: IN, key: "ask", title: "Ask before running",
    desc: "Risky commands are ones that delete files, discard work, deploy or build a release.",
    choices: [["risky", "Risky commands"], ["all", "Every command"], ["never", "Never"]], default: "risky" },
] as const;

type Row = (typeof settings)[number];
export type Settings = { [R in Row as R["key"]]: R extends { choices: readonly (readonly [infer V, string])[] } ? V : boolean };

const defaults = Object.fromEntries(settings.map((r) => [r.key, r.default])) as Settings;
let values: Settings = defaults;
const subs = new Set<() => void>();

const read = () => configRead("settings")
  .then((t) => { values = { ...defaults, ...(t.trim() ? JSON.parse(t) : {}) }; subs.forEach((f) => f()); })
  .catch((e) => console.warn("[run-buttons] settings load failed", e));
void read();
// config-changed names a plugin's own config "settings" (the shim drops its data/<id>/ folder).
const unlisten = listen<string[]>("config-changed", (e) => { if (e.payload.includes("settings")) void read(); });

/** Stops listening, before a reload imports the plugin again. */
export const dispose = () => void unlisten.then((f) => f());

export function useSettings(): Settings {
  return useSyncExternalStore((f) => { subs.add(f); return () => { subs.delete(f); }; }, () => values);
}
