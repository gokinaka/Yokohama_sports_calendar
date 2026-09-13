// 横浜ビー・コルセアーズと川崎ブレイブサンダースは同じCMSの同じテンプレートを使っており、
// /schedule/list/?year=<年>&month=all でシーズン全体の日程が1ページに出る。
// 各試合は <li class="p-schedule__item"> で、HOME/AWAY・大会名・日付・会場・両チーム名を持つ。
// 日付は月日のみでシーズンが年をまたぐため、月が戻ったところで年を繰り上げる。

import { fetchHtml, textOf, first, makeEvent, createYearTracker, isoDate } from "./common.mjs";

export function scheduleUrl(origin, year) {
  return `${origin}/schedule/list/?year=${year}&month=all`;
}

export function parseSchedule(html, { team, league, shortName, sourceUrl, fetchedAt, startYear }) {
  const events = [];
  const yearFor = createYearTracker(startYear);
  const blocks = html.split(/<li class="p-schedule__item/).slice(1);

  for (const block of blocks) {
    const dm = block.match(
      /p-schedule__date[^>]*>\s*(\d{1,2})\/(\d{1,2})\s*<small>[（(]([月火水木金土日])[）)]<\/small>\s*(\d{1,2}:\d{2})?/
    );
    if (!dm) continue;
    const [, monthStr, dayStr, weekday, time] = dm;
    const month = Number(monthStr);

    const status = textOf(first(block, /p-schedule__status">\s*<span[^>]*>([^<]+)<\/span>/));
    const clubs = [...block.matchAll(/p-schedule__club">[\s\S]*?<p>([^<]*)<\/p>/g)].map((m) =>
      m[1].trim()
    );
    const opponent = clubs.find((c) => c !== shortName) ?? null;

    events.push(
      makeEvent({
        team,
        sport: "basketball",
        league,
        competition: textOf(first(block, /c-tag c-tag--small\s*">([^<]*)<\/span>/)),
        date: isoDate(yearFor(month), month, Number(dayStr)),
        weekday,
        time: time ?? null,
        homeAway: status === "HOME" ? "home" : status === "AWAY" ? "away" : null,
        venue: textOf(first(block, /p-schedule__venue[\s\S]*?<p>([^<]*)<\/p>/)),
        opponent,
        sourceUrl,
        fetchedAt,
      })
    );
  }
  return events;
}

export async function fetchSchedule({ origin, team, league, shortName }) {
  const fetchedAt = new Date().toISOString();
  const startYear = new Date().getFullYear();
  const sourceUrl = scheduleUrl(origin, startYear);
  return parseSchedule(await fetchHtml(sourceUrl), {
    team,
    league,
    shortName,
    sourceUrl,
    fetchedAt,
    startYear,
  });
}
