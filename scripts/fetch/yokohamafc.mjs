// 横浜FC公式サイトの試合日程を取得する。
// 公式サイトの日程ページは直近数試合しか掲載しておらず、同じ試合がレスポンシブ用に
// 複数回出力されるため、試合詳細リンク(/g/YYYYMMDD_slug/)の日付で重複を除いている。

import { fetchHtml, textOf, first, makeEvent, runFetcher } from "../lib/common.mjs";

const SOURCE_URL = "https://yokohamafc.com/game/schedule/";
const TEAM = "横浜FC";
const HOME_VENUES = ["ニッパツ三ツ沢球技場", "日産スタジアム"];

export function parse(html, fetchedAt) {
  const byDate = new Map();
  const blocks = html.split(/<h1 class="font-barlow/).slice(1);
  for (const block of blocks) {
    const time = first(block, /[（(][月火水木金土日][）)]\s*(\d{1,2}:\d{2})/);
    const weekday = first(block, /[（(]([月火水木金土日])[）)]/);
    const opponent = textOf(first(block, /<h2 class="text-\[15px\][^"]*"[^>]*>([^<]*)<\/h2>/));
    const venue = textOf(first(block, /<p class="text-sm leading-\[18px\][^"]*"[^>]*>([^<]*)<\/p>/));
    const dateDigits = first(block, /yokohamafc\.com\/g\/(\d{8})_/);
    if (!dateDigits) continue;
    const date = `${dateDigits.slice(0, 4)}-${dateDigits.slice(4, 6)}-${dateDigits.slice(6, 8)}`;
    if (byDate.has(date)) continue;

    byDate.set(
      date,
      makeEvent({
        team: TEAM,
        sport: "soccer",
        league: "J2",
        competition: textOf(first(block, /([^>]*明治安田[^<]*リーグ[^<]*)</)),
        date,
        weekday,
        time,
        homeAway: venue && HOME_VENUES.some((v) => venue.includes(v)) ? "home" : "away",
        venue,
        opponent,
        sourceUrl: SOURCE_URL,
        fetchedAt,
      })
    );
  }
  return [...byDate.values()];
}

runFetcher(import.meta.url, TEAM, async () => {
  const fetchedAt = new Date().toISOString();
  return parse(await fetchHtml(SOURCE_URL), fetchedAt);
});
