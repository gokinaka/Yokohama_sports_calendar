// NECレッドロケッツ川崎(SVリーグ女子)の試合日程を公式サイトから取得する。
// 各試合は <li> 内に HOME/AWAY 表記、<time>2026.10.17(土) 18:35</time>、会場、相手チーム名(img alt)を持つ。

import { fetchHtml, textOf, first, makeEvent, runFetcher } from "../lib/common.mjs";

const SOURCE_URL = "https://red.necrockets.net/match/schedule/";
const TEAM = "NECレッドロケッツ川崎";

export function parse(html, fetchedAt) {
  const events = [];
  const blocks = html.split(/<li class="(?:regular|fivb|[a-z]+) xl:h-32/).slice(1);
  for (const block of blocks) {
    const timeTag = first(block, /<time[^>]*>([\s\S]*?)<\/time>/);
    if (!timeTag) continue;
    const dm = textOf(timeTag)?.match(/(\d{4})\.(\d{1,2})\.(\d{1,2})[（(]([月火水木金土日])[）)]\s*(\d{1,2}:\d{2})?/);
    if (!dm) continue;
    const [, year, month, day, weekday, time] = dm;

    const homeAwayRaw = first(block, />\s*(HOME|AWAY)\s*</);
    const venue = textOf(first(block, /<\/time>\s*<p class="text-sm[^"]*">([^<]*)<\/p>/));
    const opponent = first(block, /<img[^>]+alt="([^"]+)"\s*\/>/);

    events.push(
      makeEvent({
        team: TEAM,
        sport: "volleyball",
        league: "SVリーグ",
        competition: textOf(first(block, /<p class="text-xs">([^<]*)<\/p>/)),
        date: `${year}-${month.padStart(2, "0")}-${day.padStart(2, "0")}`,
        weekday,
        time: time ?? null,
        homeAway: homeAwayRaw ? homeAwayRaw.toLowerCase() : null,
        venue,
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
