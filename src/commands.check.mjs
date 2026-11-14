// node src/commands.check.mjs: which commands a reply offers, and which ask first, compiled from the real source.
import assert from "node:assert/strict";
import { build } from "esbuild";

const entry = new URL("./commands.ts", import.meta.url).pathname.replace(/^\/(\w:)/, "$1");
const out = await build({ entryPoints: [entry], bundle: true, write: false, format: "esm", platform: "node" });
const c = await import("data:text/javascript;base64," + Buffer.from(out.outputFiles[0].text).toString("base64"));

// A short shell block, and inline code that starts with a known tool.
assert.deepEqual(c.extractCommands("Run:\n\n```bash\nnpm test\n```\n\nthen `git status` and `foo bar`."), ["npm test", "git status"]);
// A block in another language, a long block, and a template are not commands.
assert.deepEqual(c.extractCommands("```ts\nconst a = 1\n```\n```sh\na\nb\nc\nd\n```\n`git add <path>`"), []);
// The same command twice is one button; at most four.
assert.deepEqual(c.extractCommands("`git status` `git status`"), ["git status"]);
assert.equal(c.extractCommands("`npm a` `npm b` `npm c` `npm d` `npm e`").length, 4);

// What deletes, discards or deploys asks first; the rest runs.
for (const risky of ["git reset --hard", "rm -rf build", "git checkout -- src", "ssh vps docker ps", "npm run tauri build", "git stash"]) {
  assert.ok(c.isRisky(risky), risky);
}
for (const safe of ["npm test", "git status", "flutter run", "git checkout dev"]) assert.ok(!c.isRisky(safe), safe);

console.log("run-buttons: all checks passed");
