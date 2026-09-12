// 横浜キヤノンイーグルス(リーグワン)の試合日程をリーグ公式のチームページから取得する。
// チームページのURLはシーズンごとにIDが変わるため、環境変数 LEAGUEONE_TEAM_URL で上書きできる。
// 日付は 12.14 のように年が無いため、見出しのシーズン表記(例: 2025-26)から年を判定する。

import { fetchHtml, textOf, first, makeEvent, isoDate, runFetcher } from "../lib/common.mjs";

const TEAM_LIST_URL = "https://league-one.jp/team/";
const FALLBACK_TEAM_URL = "https://league-one.jp/team/107";
const TEAM = "横浜キヤノンイーグルス";

// リーグワンのチームページIDはシーズンごとに変わるため、チーム一覧から最新のIDを探す。
// 見つからない場合は前シーズンのURLにフォールバックする。
async function resolveTeamUrl() {
  if (process.env.LEAGUEONE_TEAM_URL) return process.env.LEAGUEONE_TEAM_URL;
  try {
    const list = await fetchHtml(TEAM_LIST_URL);
    const ids = [...list.matchAll(/href="\/team\/(\d+)"[^>]*>([\s\S]{0,300}?)<\/a>/g)]
      .filter(([, , inner]) => inner.includes(TEAM))
      .map(([, id]) => Number(id));
    if (ids.length > 0) return `https://league-one.jp/team/${Math.max(...ids)}`;
  } catch (err) {
    console.error(`チーム一覧の取得に失敗: ${err}`);
  }
  return FALLBACK_TEAM_URL;
}

// シーズンが 2025-26 なら、8月以降は2025年、7月以前は2026年とみなす
function resolveYear(month, seasonStartYear) {
  return month >= 8 ? seasonStartYear : seasonStartYear + 1;
}

export function parse(html, fetchedAt, sourceUrl = FALLBACK_TEAM_URL) {
  const events = [];
  const blocks = html.split('<div class="c-schedule">').slice(1);
  for (const block of blocks) {
    const dm = block.match(/<p class="date">\s*(\d{1,2})\.(\d{1,2})/);
    if (!dm) continue;
    const month = Number(dm[1]);
    const day = Number(dm[2]);

    const title = textOf(first(block, /<h3 class="ttl">([\s\S]*?)<\/h3>/)) ?? "";
    const seasonStartYear = Number(first(title, /(\d{4})-\d{2}/) ?? new Date().getFullYear());

    const teamNames = [...block.matchAll(/<p class="name only-pc">([^<]+)<\/p>/g)].map((m) =>
      m[1].trim()
    );
    const opponent = teamNames.find((n) => n !== TEAM) ?? null;
    const homeIsUs = /<li class="home"[\s\S]*?<p class="name only-pc">横浜キヤノンイーグルス</.test(block);

    events.push(
      makeEvent({
        team: TEAM,
        sport: "rugby",
        league: "リーグワン",
        competition: title || null,
        date: isoDate(resolveYear(month, seasonStartYear), month, day),
        weekday: first(block, /<span class="youbi">([月火水木金土日])<\/span>/),
        time: first(block, /<p class="time">\s*(\d{1,2}:\d{2})/),
        homeAway: teamNames.length >= 2 ? (homeIsUs ? "home" : "away") : null,
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
  const url = await resolveTeamUrl();
  console.error(`チームページ: ${url}`);
  return parse(await fetchHtml(url), fetchedAt, url);
});
