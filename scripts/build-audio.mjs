import { spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import fs from "node:fs";
function run(command, args) {
  const r = spawnSync(command, args, { stdio: "inherit" });
  if (r.status !== 0) process.exit(r.status ?? 1);
}
run(process.execPath, ["scripts/compose-audio.mjs"]);
const names = [
  "brass-and-belts",
  "place",
  "rotate",
  "remove",
  "start",
  "wash",
  "paint",
  "label",
  "pack",
  "delivery",
  "mistake",
  "success",
];
for (const name of names) {
  const args = [
    "-hide_banner",
    "-loglevel",
    "error",
    "-y",
    "-i",
    `work/audio/${name}.wav`,
  ];
  if (name === "brass-and-belts")
    args.push("-af", "loudnorm=I=-18:TP=-2:LRA=7", "-ar", "44100");
  args.push("-c:a", "libmp3lame", "-q:a", "4", `public/audio/${name}.mp3`);
  run("ffmpeg", args);
}
const report = names.map((name) => {
  const path = `public/audio/${name}.mp3`,
    b = fs.readFileSync(path);
  return {
    path,
    bytes: b.length,
    sha256: createHash("sha256").update(b).digest("hex"),
  };
});
fs.writeFileSync("docs/audio-files.json", JSON.stringify(report, null, 2));
