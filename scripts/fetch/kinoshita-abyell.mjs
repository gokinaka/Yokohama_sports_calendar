// 木下アビエル神奈川(ノジマTリーグ女子)の試合日程をTリーグ公式サイトから取得する。
// リーグ全体の日程ページを取得し、自チームが含まれる行だけを抽出する。

import { fetchHtml, textOf, first, makeEvent, runFetcher } from "../lib/common.mjs";

const SOURCE_URL = "https://tleague.jp/schedule/";
const TEAM = "木下アビエル神奈川";
const TEAM_PATH = "/team/ka-kanagawa/";

export function parse(html, fetchedAt) {
  const events = [];
  const rows = html.match(/<tr>[\s\S]*?<\/tr>/g) ?? [];
  for (const row of rows) {
    if (!row.includes(TEAM_PATH)) continue;
    const cells = row.match(/<td[\s\S]*?<\/td>/g) ?? [];
    if (cells.length < 6) continue;

    const dateText = textOf(cells[0]) ?? "";
    const dm = dateText.match(/(\d{4})年\s*(\d{1,2})月(\d{1,2})日[（(]([月火水木金土日])[）)]\s*(\d{1,2}:\d{2})?/);
    if (!dm) continue;
    const [, year, month, day, weekday, time] = dm;

    const homeTeam = first(cells[2], /alt="([^"]+)"/);
    const awayTeam = first(cells[4], /alt="([^"]+)"/);
    const isHome = cells[2].includes(TEAM_PATH);

    events.push(
      makeEvent({
        team: TEAM,
        sport: "tabletennis",
        league: "ノジマTリーグ",
        competition: textOf(cells[1]),
        date: `${year}-${month.padStart(2, "0")}-${day.padStart(2, "0")}`,
        weekday,
        time: time ?? null,
        homeAway: isHome ? "home" : "away",
        venue: textOf(cells[5]),
        opponent: isHome ? awayTeam : homeTeam,
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
