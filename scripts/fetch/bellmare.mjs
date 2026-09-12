// 湘南ベルマーレ公式サイトの試合日程を取得する。
// 各試合は <tr class="home|away"> の行で、日付は 26/10/11(日) 18:00 形式。

import { fetchHtml, textOf, first, makeEvent, runFetcher } from "../lib/common.mjs";

const SOURCE_URL = "https://www.bellmare.co.jp/fixtures_2026_27";
const TEAM = "湘南ベルマーレ";

export function parse(html, fetchedAt) {
  const events = [];
  const blocks = html.split(/<tr class="(home|away)/).slice(1);
  for (let i = 0; i < blocks.length; i += 2) {
    const homeAway = blocks[i];
    const block = blocks[i + 1] ?? "";
    const datetime = first(block, /<div class="datetime">([\s\S]*?)<\/div>/);
    if (!datetime) continue;
    const dm = datetime.match(/(\d{2})\/(\d{1,2})\/(\d{1,2})/);
    if (!dm) continue;
    const [, yy, mm, dd] = dm;
    const weekday = first(datetime, /[（(]([月火水木金土日])[）)]/);
    const time = first(datetime, /(\d{1,2}:\d{2})/);

    const homeTeam = textOf(first(block, /<div class="hometeam_name">([\s\S]*?)<\/div>/));
    const awayTeam = textOf(first(block, /<div class="awayteam_name">([\s\S]*?)<\/div>/));
    const opponent = homeTeam === TEAM ? awayTeam : homeTeam;

    events.push(
      makeEvent({
        team: TEAM,
        sport: "soccer",
        league: "J2",
        competition: textOf(first(block, /<p class="jleague">([\s\S]*?)<\/p>/)),
        date: `20${yy}-${mm.padStart(2, "0")}-${dd.padStart(2, "0")}`,
        weekday,
        time,
        homeAway,
        venue: textOf(first(block, /<div class="venue">([\s\S]*?)<\/div>/)),
        opponent,
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
