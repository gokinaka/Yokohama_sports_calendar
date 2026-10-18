// data/ 配下の各チームのJSONを統合し、カレンダー表示用の data/events.json を作る。
// 過去の試合は観戦予定には不要なので、当日以降のものだけを残す。
//
// 対応チームの定義は config/teams.json を正とする。取得に失敗してデータが空の
// チームも status.json には残し、「未対応」と「取得できていない/日程未発表」を
// 画面で区別できるようにする。

import { readdir, readFile, writeFile } from "node:fs/promises";
import { loadVenueConfig, classifyVenue } from "./lib/region.mjs";

const DATA_DIR = "data";
const ROSTER_FILE = "config/teams.json";
const OUT_FILE = "data/events.json";
const STATUS_FILE = "data/status.json";

function today() {
  const now = new Date();
  const jst = new Date(now.getTime() + 9 * 60 * 60 * 1000);
  return jst.toISOString().slice(0, 10);
}

async function readEvents(file) {
  try {
    const parsed = JSON.parse(await readFile(`${DATA_DIR}/${file}`, "utf-8"));
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return []; // 未取得のチームはファイルがまだ無い
  }
}

async function main() {
  const venueConfig = await loadVenueConfig();
  const roster = JSON.parse(await readFile(ROSTER_FILE, "utf-8")).teams;

  const all = [];
  const teams = [];
  for (const entry of roster) {
    const events = await readEvents(entry.file);
    const upcoming = events
      .filter((e) => e.date >= today())
      .map((e) => ({ ...e, region: classifyVenue(e.venue, venueConfig) }));
    all.push(...upcoming);
    teams.push({
      team: entry.team,
      sport: entry.sport,
      league: entry.league,
      total: events.length,
      upcoming: upcoming.length,
      latestDate: events.length > 0 ? events[events.length - 1].date : null,
      fetchedAt: events.length > 0 ? events[0].fetchedAt : null,
    });
  }

  // config/teams.json に無いデータファイルは統合されない。フェッチャーを足して
  // 一覧への追記を忘れた場合に気付けるよう警告する。
  const known = new Set(roster.map((t) => t.file));
  const generated = new Set([OUT_FILE, STATUS_FILE].map((p) => p.split("/").pop()));
  const orphans = (await readdir(DATA_DIR)).filter(
    (f) => f.endsWith(".json") && !generated.has(f) && !known.has(f)
  );
  for (const file of orphans) {
    console.warn(`警告: data/${file} は ${ROSTER_FILE} に無いため無視しました`);
  }

  all.sort((a, b) =>
    a.date === b.date ? (a.time ?? "").localeCompare(b.time ?? "") : a.date.localeCompare(b.date)
  );
  await writeFile(OUT_FILE, JSON.stringify(all, null, 2) + "\n", "utf-8");
  await writeFile(
    STATUS_FILE,
    JSON.stringify({ builtAt: new Date().toISOString(), teams }, null, 2) + "\n",
    "utf-8"
  );
  for (const t of teams) {
    const note = t.total === 0 ? " (データなし)" : "";
    console.log(`${t.team}: 全${t.total}件中 今後${t.upcoming}件${note}`);
  }
  const byRegion = all.reduce((acc, e) => ({ ...acc, [e.region]: (acc[e.region] ?? 0) + 1 }), {});
  console.log(`\n会場の所在: 県内${byRegion.kanagawa ?? 0}件 / 県外${byRegion.outside ?? 0}件 / 不明${byRegion.unknown ?? 0}件`);
  console.log(`\n合計 ${all.length}件を ${OUT_FILE} に書き出しました`);
}

main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});
