import { spawn } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";

/** Load .env then .env.local into process.env (does not override existing vars). */
function loadEnvFiles() {
  for (const name of [".env", ".env.local"]) {
    const file = resolve(process.cwd(), name);
    if (!existsSync(file)) continue;
    for (const line of readFileSync(file, "utf8").split(/\r?\n/)) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith("#")) continue;
      const eq = trimmed.indexOf("=");
      if (eq <= 0) continue;
      const key = trimmed.slice(0, eq).trim();
      let value = trimmed.slice(eq + 1).trim();
      if (
        (value.startsWith('"') && value.endsWith('"')) ||
        (value.startsWith("'") && value.endsWith("'"))
      ) {
        value = value.slice(1, -1);
      }
      if (process.env[key] === undefined) {
        process.env[key] = value;
      }
    }
  }
}

if (process.platform === "win32") {
  if (process.env.YTDLP_PATH?.startsWith("/")) delete process.env.YTDLP_PATH;
  if (process.env.FFMPEG_PATH?.startsWith("/")) delete process.env.FFMPEG_PATH;
}

loadEnvFiles();

const mode = process.argv[2] === "start" ? "start" : "dev";
const port = process.env.PORT?.trim() || "3000";
const hostname = process.env.HOSTNAME?.trim();

const args = [mode, "--port", port];
if (hostname) {
  args.push("--hostname", hostname);
}

const child = spawn("npx", ["next", ...args], {
  stdio: "inherit",
  shell: true,
  env: process.env,
});

child.on("exit", (code, signal) => {
  if (signal) process.kill(process.pid, signal);
  process.exit(code ?? 1);
});
