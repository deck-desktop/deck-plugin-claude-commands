// Finds the shell commands a reply offers to run. Pure, so commands.check.mjs calls it directly.

const MAX = 4;
const SHELL_LANGS = new Set(["", "bash", "sh", "shell", "console", "powershell", "ps1", "pwsh", "cmd", "bat"]);
// Inline `code` counts as a command only when it starts with one of these.
const INLINE_START = /^(flutter|dart|npm|npx|pnpm|yarn|git|adb|cargo|claude|node|python|pip|docker|ssh|cd|ls|cat)\s/;

export function extractCommands(markdown: string): string[] {
  const found: string[] = [];
  const add = (cmd: string) => {
    const c = cmd.trim();
    // Placeholders like <path> or ... mean it is a template, not something to run.
    if (!c || /<[^>]+>|\.\.\.|…/.test(c) || found.includes(c)) return;
    found.push(c);
  };

  // Fenced blocks in a shell language (or none) of at most three lines.
  const fence = /```([\w-]*)[^\n]*\n([\s\S]*?)```/g;
  let m: RegExpExecArray | null;
  while ((m = fence.exec(markdown))) {
    const lang = (m[1] ?? "").toLowerCase();
    const body = (m[2] ?? "").trim();
    if (SHELL_LANGS.has(lang) && body && body.split("\n").length <= 3) add(body);
  }

  // Inline code that starts with a known command, outside the fenced blocks.
  const prose = markdown.replace(fence, "");
  for (const inline of prose.matchAll(/`([^`\n]+)`/g)) {
    const code = inline[1] ?? "";
    if (INLINE_START.test(code)) add(code);
  }
  return found.slice(0, MAX);
}

// Commands that discard work, delete, deploy or build a release ask before running.
export const isRisky = (cmd: string) =>
  /\bgit\b.*\b(stash|reset\s+--hard|clean|restore)\b|\bgit\b.*\bcheckout\b.*\s--(\s|$)|\brm\s+-\w*r|Remove-Item|\bssh\s+vps\b|\btauri\b.*\bbuild\b|\bdel\s|\bformat\s/i.test(cmd);
