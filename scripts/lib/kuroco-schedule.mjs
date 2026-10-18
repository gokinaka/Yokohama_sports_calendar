// 横浜ビー・コルセアーズ・川崎ブレイブサンダース・横浜エクセレンスは同じCMSの同じテンプレートを使っており、
// /schedule/list/?year=<年>&month=all でシーズン全体の日程が1ページに出る。
// 各試合は <li class="p-schedule__item"> で、HOME/AWAY・大会名・日付・会場・両チーム名を持つ。
// 日付は月日のみでシーズンが年をまたぐため、月が戻ったところで年を繰り上げる。

import { fetchHtml, textOf, first, makeEvent, createYearTracker, isoDate } from "./common.mjs";

export function scheduleUrl(origin, year) {
  return `${origin}/schedule/list/?year=${year}&month=all`;
}

// 日付の表記はカード種別で2通りある。通常の一覧は p-schedule__date に <small> で曜日、
// 直近の試合だけ出る大きなカードは p-schedule__round に「10/18 (日) 15:05」とまとめて入る。
const DATE_PATTERNS = [
  /p-schedule__date[^>]*>\s*(\d{1,2})\/(\d{1,2})\s*<small>[（(]([月火水木金土日])[）)]<\/small>\s*(\d{1,2}:\d{2})?/,
  /p-schedule__round[^>]*>\s*(\d{1,2})\/(\d{1,2})\s*[（(]([月火水木金土日])[）)]\s*(\d{1,2}:\d{2})?/,
];

function matchDate(block) {
  for (const re of DATE_PATTERNS) {
    const m = block.match(re);
    if (m) return m;
  }
  return null;
}

export function parseSchedule(html, { team, league, shortName, sourceUrl, fetchedAt, startYear }) {
  const events = [];
  const yearFor = createYearTracker(startYear);
  const blocks = html.split(/<li class="p-schedule__item/).slice(1);

  for (const block of blocks) {
    const dm = matchDate(block);
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
        // 直近の試合のカードだけ class に event_name が付くので、後続のclassも許す
        competition: textOf(first(block, /c-tag c-tag--small[^"]*">([^<]*)<\/span>/)),
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
