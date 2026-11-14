// Run buttons: under each of Claude's replies in a chat, a button per shell command it suggests
// (commands.ts finds them), which runs it in a terminal of its own beside the chat, in Claude's folder.
import { useState } from "react";
import { Play } from "lucide-react";
import { ChatChip, ConfirmDialog, notify, type ConfirmState } from "deck-plugin-sdk/ui";
import { mutateLayout, openTabInWorkspace, paneLabel, paneLines, paneLocation, queueInput, runningIn, sendInput } from "deck-plugin-sdk/terminals";
import { getChat } from "deck-plugin-sdk/chat";
import { extractCommands, isRisky } from "./commands";
import { useSettings } from "./settings";

// Its settings, drawn by Deck on its page of Settings; dispose stops their listener before a reload.
export { dispose, settings } from "./settings";

/** The terminals this plugin opened, by the chat they run for: reused while their shell is idle.
 *  Only its own: a terminal of the user's that looks idle may have started something seconds ago
 *  (what runs in a pane is swept every 10 s), and typing into it would land in that. */
const mine = new Map<string, string>();

/** The chat's own terminal, still there, drawn this run, and running nothing. */
async function ownTerminal(chatPane: string): Promise<string | null> {
  const id = mine.get(chatPane);
  if (!id || !paneLocation(id)) return null;
  // paneLines over the whole screen: a fresh shell's bottom rows are blank, and it drops blank rows.
  if (!paneLines(id, 500).length || (await runningIn([id])).length) return null;
  return id;
}

async function run(chatPane: string, cwd: string, cmd: string) {
  const first = cmd.split("\n")[0];
  const own = await ownTerminal(chatPane);
  if (own) {
    sendInput(own, cmd + "\r");
    notify({ kind: "activity", source: "Run buttons", title: `Running in ${paneLabel(own) || "its terminal"}: ${first}`, transient: true });
    return;
  }
  // A terminal of its own beside the chat, in the folder Claude runs in. It starts once it is
  // shown, so the command waits for it.
  const ws = paneLocation(chatPane)?.wsId;
  const id = ws ? openTabInWorkspace(ws, "Run", { besideActive: true }) : null;
  if (!id) { notify({ kind: "error", source: "Run buttons", title: "No terminal to run it in", body: cmd }); return; }
  if (cwd) mutateLayout((l) => ({ ...l, workspaces: l.workspaces.map((w) => ({ ...w,
    tabs: w.tabs.map((t) => (t.root.kind === "leaf" && t.root.id === id ? { ...t, root: { ...t.root, cwd } } : t)) })) }));
  mine.set(chatPane, id);
  queueInput(id, cmd + "\r");
}

export function ChatReply({ pane, message }: { pane: string; message: { text: string } }) {
  const [confirm, setConfirm] = useState<ConfirmState | null>(null);
  const cfg = useSettings();
  const cmds = extractCommands(message.text, { max: Number(cfg.max), inline: cfg.inline });
  if (!cmds.length) return null;
  const press = (cmd: string) => {
    const go = () => void run(pane, getChat(pane).cwd, cmd).catch((e) => console.warn("[run-buttons] running failed", e));
    if (cfg.ask === "never" || (cfg.ask === "risky" && !isRisky(cmd))) return go();
    setConfirm({ title: "Run this command?", body: <code className="whitespace-pre-wrap break-all text-[12px]">{cmd}</code>, confirmLabel: "Run", onConfirm: go });
  };
  return (
    <>
      {cmds.map((cmd) => {
        const first = cmd.split("\n")[0];
        return (
          <ChatChip key={cmd} onClick={() => press(cmd)} title={`Run in a terminal beside the chat:\n${cmd}`} className="max-w-[360px] font-mono">
            <Play size={11} className="shrink-0" />
            <span className="truncate">{first}{cmd.includes("\n") ? " …" : ""}</span>
          </ChatChip>
        );
      })}
      <ConfirmDialog state={confirm} onClose={() => setConfirm(null)} />
    </>
  );
}
