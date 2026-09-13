// 富士通レッドウェーブ(Wリーグ)の試合日程を公式サイトの「試合予定」から取得する。
// 1ページ12件のページ送りなので、新しい試合が出てこなくなるまで順にたどる。
// ホーム/アウェイの表記がページに無いため homeAway は設定しない。

import { fetchHtml, textOf, first, makeEvent, runFetcher } from "../lib/common.mjs";

const BASE = "https://sports.jp.fujitsu.com/redwave/pages/nextgames";
const TEAM = "富士通レッドウェーブ";
const MAX_PAGES = 8;

export function parse(html, fetchedAt, sourceUrl) {
  const events = [];
  const blocks = html.split(/<article /).slice(1);
  for (const block of blocks) {
    const dm = block.match(
      /(\d{4})年(\d{1,2})月(\d{1,2})日[（(]([月火水木金土日])曜日[）)]\s*(\d{1,2}:\d{2})?/
    );
    if (!dm) continue;
    const [, year, month, day, weekday, time] = dm;

    const teams = [...block.matchAll(/<img[^>]+alt="([^"]+)"[^>]*class="icon"/g)].map((m) =>
      m[1].trim()
    );
    const opponent = teams.find((t) => !t.includes("富士通")) ?? null;

    events.push(
      makeEvent({
        team: TEAM,
        sport: "basketball",
        league: "Wリーグ",
        competition: textOf(first(block, /<h5 class="card-title[^"]*">([^<]*)<\/h5>/)),
        date: `${year}-${month.padStart(2, "0")}-${day.padStart(2, "0")}`,
        weekday,
        time: time ?? null,
        homeAway: null,
        venue: textOf(first(block, /開催地<\/span>([^<]*)</)),
        opponent,
        sourceUrl,
        fetchedAt,
      })
    );
  }
  return events;
}

runFetcher(import.meta.url, TEAM, async () => {
  const fetchedAt = new Date().toISOString();
  const all = [];
  const seen = new Set();
  for (let page = 1; page <= MAX_PAGES; page++) {
    const url = page === 1 ? BASE : `${BASE}/page/${page}`;
    let events;
    try {
      events = parse(await fetchHtml(url), fetchedAt, url);
    } catch (err) {
      console.error(`${page}ページ目で終了: ${err}`);
      break;
    }
    const fresh = events.filter((e) => !seen.has(`${e.date}|${e.opponent}|${e.time}`));
    if (fresh.length === 0) break;
    for (const e of fresh) {
      seen.add(`${e.date}|${e.opponent}|${e.time}`);
      all.push(e);
    }
    await new Promise((r) => setTimeout(r, 2000));
  }
  return all;
});
