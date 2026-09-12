// アースフレンズBM東京・神奈川(リーグH男子)の試合日程をリーグ公式サイトから取得する。
// 各試合は <li> 内に <em>10/12</em>(月)<b>18:30</b> と会場・対戦相手を持つ。年は表記されないため
// 一覧が時系列である前提で、月が戻ったタイミングで年を繰り上げる。

import { fetchHtml, textOf, first, makeEvent, createYearTracker, isoDate, runFetcher } from "../lib/common.mjs";

const SOURCE_URL = "https://leagueh.jp/team/earthfriends/";
const TEAM = "アースフレンズBM東京・神奈川";

export function parse(html, fetchedAt, startYear) {
  const events = [];
  const yearFor = createYearTracker(startYear);
  const blocks = html.match(/<li>\s*<a href="\/schedule\/[^"]*">[\s\S]*?<\/li>/g) ?? [];
  for (const block of blocks) {
    const dateStr = first(block, /<em>(\d{1,2}\/\d{1,2})<\/em>/);
    if (!dateStr) continue;
    const [month, day] = dateStr.split("/").map(Number);

    events.push(
      makeEvent({
        team: TEAM,
        sport: "handball",
        league: "リーグH",
        competition: null,
        date: isoDate(yearFor(month), month, day),
        weekday: first(block, /<\/em>[（(]([月火水木金土日])[）)]/),
        time: first(block, /<b>(\d{1,2}:\d{2})<\/b>/),
        homeAway: null,
        venue: textOf(first(block, /<p class="reset">([^<]*)<\/p>/)),
        opponent: textOf(first(block, /<strong><img[^>]*>([^<]*)<\/strong>/)),
        sourceUrl: SOURCE_URL,
        fetchedAt,
      })
    );
  }
  return events;
}

runFetcher(import.meta.url, TEAM, async () => {
  const fetchedAt = new Date().toISOString();
  const html = await fetchHtml(SOURCE_URL);
  return parse(html, fetchedAt, new Date().getFullYear());
});
