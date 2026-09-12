// 横浜DeNAベイスターズの試合日程を球団公式サイトの月別ページから取得する。
// 月別ページ(/game/schedule/<年>/<月>)を順に取得するため、対象月を引数で調整できる。

import { fetchHtml, textOf, first, makeEvent, runFetcher } from "../lib/common.mjs";

const TEAM = "横浜DeNAベイスターズ";
const BASE = "https://sp.baystars.co.jp/game/schedule";
const LAST_MONTH_OF_SEASON = 11;
const WEEKDAY_JA = { SUN: "日", MON: "月", TUE: "火", WED: "水", THU: "木", FRI: "金", SAT: "土" };

function monthUrl(year, month) {
  return `${BASE}/${year}/${month}`;
}

export function parseMonth(html, year, url, fetchedAt) {
  const events = [];
  const blocks = html.split(/<div class="schedule--box item__rectangle--(home|visitor)/).slice(1);
  for (let i = 0; i < blocks.length; i += 2) {
    const homeAway = blocks[i] === "home" ? "home" : "away";
    const block = blocks[i + 1] ?? "";
    const dateStr = first(block, /text__size--20[^"]*">\s*(\d{1,2}\/\d{1,2})\s*</);
    if (!dateStr) continue;
    const [month, day] = dateStr.split("/").map(Number);

    const time = first(block, /class="date[^"]*">\s*(\d{1,2}:\d{2})\s*</);
    const weekdayEn = first(block, /\[([A-Z]{3})\]/);
    const venue = textOf(first(block, /class="date[^"]*">[\s\S]*?<p class="[^"]*">([^<]*)<\/p>/));
    const teams = [...block.matchAll(/<span>([^<]+)<\/span>/g)].map((m) => m[1].trim());
    const opponent = teams.find((t) => !t.includes("横浜DeNA")) ?? null;

    events.push(
      makeEvent({
        team: TEAM,
        sport: "baseball",
        league: "NPB",
        competition: null,
        date: `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`,
        weekday: weekdayEn ? WEEKDAY_JA[weekdayEn] ?? null : null,
        time,
        homeAway,
        venue,
        opponent,
        sourceUrl: url,
        fetchedAt,
      })
    );
  }
  return events;
}

runFetcher(import.meta.url, TEAM, async () => {
  const fetchedAt = new Date().toISOString();
  const now = new Date();
  const year = now.getFullYear();
  const events = [];
  for (let month = now.getMonth() + 1; month <= LAST_MONTH_OF_SEASON; month++) {
    const url = monthUrl(year, month);
    try {
      events.push(...parseMonth(await fetchHtml(url), year, url, fetchedAt));
    } catch (err) {
      console.error(`${year}年${month}月をスキップ: ${err}`);
    }
    await new Promise((r) => setTimeout(r, 2000));
  }
  return events;
});
