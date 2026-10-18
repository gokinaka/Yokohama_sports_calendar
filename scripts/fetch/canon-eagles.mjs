// 横浜キヤノンイーグルス(リーグワン)の試合日程をリーグ公式の日程・結果ページから取得する。
//
// 以前はチームページ(/team/<ID>)を見ていたが、2026-27シーズンのチームページは
// チーム一覧へリダイレクトされるだけで日程が載っていない。日程・結果ページ
// (/schedule/)は全ディビジョンの試合が1ページに出るので、そこからイーグルスの
// 試合だけを拾う。日付は 12.13 のように年が無いため、大会名のシーズン表記
// (例: 2026-27)から年を判定する。

import { fetchHtml, textOf, first, makeEvent, isoDate, runFetcher } from "../lib/common.mjs";

const SOURCE_URL = process.env.LEAGUEONE_SCHEDULE_URL ?? "https://league-one.jp/schedule/";
const TEAM = "横浜キヤノンイーグルス";

// シーズンが 2026-27 なら、8月以降は2026年、7月以前は2027年とみなす
function resolveYear(month, seasonStartYear) {
  return month >= 8 ? seasonStartYear : seasonStartYear + 1;
}

// <ul class="game"> の中の <li class="home"> / <li class="away"> それぞれに
// チーム名が入っている。どちら側に自チームがいるかでホーム/アウェイを決める。
function readTeams(block) {
  const items = [...block.matchAll(/<li class="(home|away)"[\s\S]*?<\/li>/g)];
  const teams = items.map(([html, side]) => ({
    side,
    name: textOf(first(html, /<p class="name only-pc">([^<]*)<\/p>/)),
  }));
  const us = teams.find((t) => t.name === TEAM);
  const them = teams.find((t) => t.name !== TEAM);
  return { homeAway: us?.side ?? null, opponent: them?.name ?? null };
}

export function parse(html, fetchedAt, sourceUrl = SOURCE_URL) {
  const events = [];
  const blocks = html.split('<div class="c-schedule">').slice(1);
  for (const block of blocks) {
    if (!block.includes(TEAM)) continue;

    const dm = block.match(/<p class="date">\s*(\d{1,2})\.(\d{1,2})/);
    if (!dm) continue;
    const month = Number(dm[1]);
    const day = Number(dm[2]);

    // 例: "NTTジャパンラグビー リーグワン 2026-27 ディビジョン1 第1節 (2026D10106)"
    // 末尾の試合コードは表示に不要なので落とす。
    const title = (textOf(first(block, /<h3 class="ttl">([\s\S]*?)<\/h3>/)) ?? "").replace(
      /\s*\([0-9A-Z]+\)\s*$/,
      ""
    );
    const seasonStartYear = Number(first(title, /(\d{4})-\d{2}/) ?? new Date().getFullYear());
    const { homeAway, opponent } = readTeams(block);

    events.push(
      makeEvent({
        team: TEAM,
        sport: "rugby",
        league: "リーグワン",
        competition: title || null,
        date: isoDate(resolveYear(month, seasonStartYear), month, day),
        weekday: first(block, /<span class="youbi">([月火水木金土日])<\/span>/),
        time: first(block, /<p class="time">\s*(\d{1,2}:\d{2})/),
        homeAway,
        venue: textOf(first(block, /<p class="place">([\s\S]*?)<\/p>/)),
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
  return parse(await fetchHtml(SOURCE_URL), fetchedAt);
});
