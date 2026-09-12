// パーサー実装のために、対象ページのHTMLを取得して整形し tmp-html/ に保存する。
// script/style/svg/コメントを除去し空白を圧縮することで、構造を読み取りやすくする。
// 開発時のみ使う調査用スクリプト。

import { writeFile, mkdir } from "node:fs/promises";

const USER_AGENT =
  "YokohamaSportsCalendarBot/0.1 (+https://github.com/gokinaka/yokohama_sports_calendar)";
const REQUEST_TIMEOUT_MS = 20000;
const OUT_DIR = "tmp-html";

const TARGETS = [
  { name: "yokohamafc", url: "https://yokohamafc.com/game/schedule/" },
  { name: "bellmare", url: "https://www.bellmare.co.jp/fixtures_2026_27" },
  { name: "baystars", url: "https://sp.baystars.co.jp/game/schedule/2026/9" },
  { name: "necrockets", url: "https://red.necrockets.net/match/schedule/" },
  { name: "tleague", url: "https://tleague.jp/schedule/?team=8" },
  { name: "leagueh", url: "https://leagueh.jp/team/earthfriends/" },
  { name: "leagueone", url: "https://league-one.jp/team/107" },
];

function strip(html) {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, "")
    .replace(/<style[\s\S]*?<\/style>/gi, "")
    .replace(/<svg[\s\S]*?<\/svg>/gi, "<svg/>")
    .replace(/<!--[\s\S]*?-->/g, "")
    .replace(/\s*\n\s*/g, "\n")
    .replace(/\n{2,}/g, "\n");
}

async function main() {
  await mkdir(OUT_DIR, { recursive: true });
  for (const { name, url } of TARGETS) {
    try {
      const res = await fetch(url, {
        headers: { "User-Agent": USER_AGENT },
        signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
      });
      if (!res.ok) {
        console.log(`${name}: HTTP ${res.status}`);
        continue;
      }
      const html = await res.text();
      const stripped = strip(html);
      await writeFile(`${OUT_DIR}/${name}.html`, stripped, "utf-8");
      console.log(`${name}: ${html.length} -> ${stripped.length} 文字`);
    } catch (err) {
      console.log(`${name}: エラー ${err}`);
    }
    await new Promise((r) => setTimeout(r, 2000));
  }
}

main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});
