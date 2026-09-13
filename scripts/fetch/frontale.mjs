// 川崎フロンターレの試合日程を公式サイトの「試合日程」(全試合一覧)から取得する。
// 月間ページ(monthly.php?m=YYYYMM)は1か月分しか出ないが、all_games.html は
// シーズン全体が1ページにまとまっており、各行が data-date に完全な日付を持つ。

import { fetchHtml, textOf, first, makeEvent, runFetcher } from "../lib/common.mjs";

const SOURCE_URL = "https://www.frontale.co.jp/schedule/all_games.html";
const TEAM = "川崎フロンターレ";

export function parse(html, fetchedAt) {
  const events = [];
  const rows = html.match(/<tr class="[^"]*match[^"]*"[\s\S]*?<\/tr>/g) ?? [];
  for (const row of rows) {
    const date = first(row, /data-date="(\d{4})\/(\d{2})\/(\d{2})"/)
      ? row.match(/data-date="(\d{4})\/(\d{2})\/(\d{2})"/).slice(1, 4).join("-")
      : null;
    if (!date) continue;

    const rowClass = first(row, /<tr class="([^"]*)"/) ?? "";
    const homeAway = rowClass.includes("home") ? "home" : rowClass.includes("away") ? "away" : null;

    events.push(
      makeEvent({
        team: TEAM,
        sport: "soccer",
        league: "J1",
        competition: first(row, /data-title="([^"]*)"/),
        date,
        weekday: first(row, /<small>[（(]([月火水木金土日])[）)]<\/small>/),
        time: first(row, /<p class="ko_time">\s*(\d{1,2}:\d{2})/),
        homeAway,
        venue: textOf(first(row, /<p class="stadium">会場([\s\S]*?)<\/p>/)),
        opponent: textOf(first(row, /<h3><strong>([^<]*)<\/strong><\/h3>/)),
        sourceUrl: SOURCE_URL,
        fetchedAt,
      })
    );
  }
  return events;
}

runFetcher(import.meta.url, TEAM, async () => {
  const fetchedAt = new Date().toISOString();
  return parse(await fetchHtml(SOURCE_URL), fetchedAt);
});
