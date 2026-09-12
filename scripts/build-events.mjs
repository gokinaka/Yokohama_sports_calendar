// data/ 配下の各チームのJSONを統合し、カレンダー表示用の data/events.json を作る。
// 過去の試合は観戦予定には不要なので、当日以降のものだけを残す。

import { readdir, readFile, writeFile } from "node:fs/promises";

const DATA_DIR = "data";
const OUT_FILE = "data/events.json";

function today() {
  const now = new Date();
  const jst = new Date(now.getTime() + 9 * 60 * 60 * 1000);
  return jst.toISOString().slice(0, 10);
}

async function main() {
  const files = (await readdir(DATA_DIR)).filter(
    (f) => f.endsWith(".json") && f !== "events.json"
  );
  const all = [];
  const summary = [];
  for (const file of files) {
    const events = JSON.parse(await readFile(`${DATA_DIR}/${file}`, "utf-8"));
    const upcoming = events.filter((e) => e.date >= today());
    all.push(...upcoming);
    summary.push(`${file}: 全${events.length}件中 今後${upcoming.length}件`);
  }
  all.sort((a, b) =>
    a.date === b.date ? (a.time ?? "").localeCompare(b.time ?? "") : a.date.localeCompare(b.date)
  );
  await writeFile(OUT_FILE, JSON.stringify(all, null, 2) + "\n", "utf-8");
  console.log(summary.join("\n"));
  console.log(`\n合計 ${all.length}件を ${OUT_FILE} に書き出しました`);
}

main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});
