// Run buttons: under each of Claude's replies in a chat, a button per shell command it suggests
// (commands.ts finds them), which runs it in a terminal of the project.
import { useState } from "react";
import { Play } from "lucide-react";
import { ChatChip, ConfirmDialog, notify, type ConfirmState } from "deck-plugin-sdk/ui";
import { findLeaf, getLayout, leafIds, openTabInWorkspace, paneHasAgent, paneLabel, paneLines, paneLocation, queueInput, runningIn, sendInput } from "deck-plugin-sdk/terminals";
import { extractCommands, isRisky } from "./commands";

/** A terminal of the pane's project that is open and running nothing: never a Claude pane, a
 *  plugin's pane, or a shell busy with a build or `flutter run`. */
async function idleTerminal(chatPane: string): Promise<string | null> {
  const loc = paneLocation(chatPane);
  const ws = getLayout()?.workspaces.find((w) => w.id === loc?.wsId);
  if (!ws) return null;
  const ids = ws.tabs.flatMap((t) => leafIds(t.root).filter((id) => {
    const leaf = findLeaf(t.root, id);
    // A shell drawn this run (paneLines makes none), so what is typed shows. Its whole screen: a
    // fresh shell's bottom rows are blank, and paneLines drops blank rows at either end.
    return id !== chatPane && leaf?.kind === "leaf" && !leaf.view && !paneHasAgent(id) && paneLines(id, 500).length > 0;
  }));
  for (const id of ids) if (!(await runningIn([id])).length) return id;
  return null;
}

async function run(chatPane: string, cmd: string) {
  const first = cmd.split("\n")[0];
  const idle = await idleTerminal(chatPane);
  if (idle) {
    sendInput(idle, cmd + "\r");
    notify({ kind: "activity", source: "Run buttons", title: `Running in ${paneLabel(idle) || "a terminal"}: ${first}`, transient: true });
    return;
  }
  // None free: a terminal of its own beside the chat. It starts once it is shown, so the command waits.
  const ws = paneLocation(chatPane)?.wsId;
  const id = ws ? openTabInWorkspace(ws, first.slice(0, 24), { besideActive: true }) : null;
  if (id) queueInput(id, cmd + "\r");
  else notify({ kind: "error", source: "Run buttons", title: "No terminal to run it in", body: cmd });
}

export function ChatReply({ pane, message }: { pane: string; message: { text: string } }) {
  const [confirm, setConfirm] = useState<ConfirmState | null>(null);
  const cmds = extractCommands(message.text);
  if (!cmds.length) return null;
  const press = (cmd: string) => {
    const go = () => void run(pane, cmd).catch((e) => console.warn("[run-buttons] running failed", e));
    if (!isRisky(cmd)) return go();
    setConfirm({ title: "Run this command?", body: <code className="whitespace-pre-wrap break-all text-[12px]">{cmd}</code>, confirmLabel: "Run", onConfirm: go });
  };
  return (
    <>
      {cmds.map((cmd) => {
        const first = cmd.split("\n")[0];
        return (
          <ChatChip key={cmd} onClick={() => press(cmd)} title={`Run in a terminal of this project:\n${cmd}`} className="max-w-[360px] font-mono">
            <Play size={11} className="shrink-0" />
            <span className="truncate">{first}{cmd.includes("\n") ? " …" : ""}</span>
          </ChatChip>
        );
      })}
      <ConfirmDialog state={confirm} onClose={() => setConfirm(null)} />
    </>
  );
}
