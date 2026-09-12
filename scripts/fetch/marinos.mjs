// 横浜F・マリノス公式サイトの試合日程ページから試合情報を取得し、
// 統一スキーマのJSONを出力する。
//
// 対象ページのHTML構造は scripts/inspect-sources.mjs / scripts/probe.mjs による
// 実データ調査で確認済み(2026-09-12時点)。ページ構造が変わった場合は
// このパーサーの修正が必要。
//
// 使い方: node scripts/fetch/marinos.mjs [出力先パス(省略時は標準出力)]

import { writeFile, mkdir } from "node:fs/promises";
import { dirname } from "node:path";

const SOURCE_URL = "https://www.f-marinos.com/matches/schedule";
const TEAM = "横浜F・マリノス";
const SPORT = "soccer";
const LEAGUE = "J1";
const USER_AGENT =
  "YokohamaSportsCalendarBot/0.1 (+https://github.com/gokinaka/yokohama_sports_calendar)";

function extractFirst(block, re) {
  const m = block.match(re);
  return m ? m[1].trim() : null;
}

function parseMatchBlocks(html) {
  // 各試合は "match-header" というclassを持つdivから始まる塊になっている
  const parts = html.split('<div class="match-header">').slice(1);
  return parts;
}

function toIsoDate(month, day, year) {
  const mm = String(month).padStart(2, "0");
  const dd = String(day).padStart(2, "0");
  return `${year}-${mm}-${dd}`;
}

function parseEvents(html, { now = new Date() } = {}) {
  const blocks = parseMatchBlocks(html);
  const events = [];
  let year = now.getFullYear();
  let prevMonth = null;

  for (const block of blocks) {
    const homeAwayRaw = extractFirst(block, /match-header-tag is-(home|away)"/);
    const venue = extractFirst(block, /match-header-place">([^<]*)</);
    const dateStr = extractFirst(block, /matchdate-date">([^<]*)</);
    const weekday = extractFirst(block, /matchdate-week-en">([^<]*)</);
    const time = extractFirst(block, /matchdate-time">([^<]*)</);
    const competition = extractFirst(block, /font-size-md font-size-md-md">([^<]*)</);
    const opponent = extractFirst(
      block,
      /col-12 col-sm-6 col-md-12 col-lg-6 font-size-lg font-size-md-xl font-weight-bold">([^<]*)</
    );

    if (!dateStr) continue; // 試合情報として不完全な塊はスキップ
    const [monthStr, dayStr] = dateStr.split(".");
    const month = Number(monthStr);
    const day = Number(dayStr);
    if (!month || !day) continue;

    // シーズンが年をまたぐため、月が前の試合より小さくなったら年が変わったとみなす
    if (prevMonth !== null && month < prevMonth) {
      year += 1;
    }
    prevMonth = month;

    events.push({
      team: TEAM,
      sport: SPORT,
      league: LEAGUE,
      competition: competition || null,
      date: toIsoDate(month, day, year),
      weekday: weekday || null,
      time: time || null,
      homeAway: homeAwayRaw || null,
      venue: venue || null,
      opponent: opponent || null,
      sourceUrl: SOURCE_URL,
      fetchedAt: now.toISOString(),
    });
  }
  return events;
}

async function main() {
  const res = await fetch(SOURCE_URL, { headers: { "User-Agent": USER_AGENT } });
  if (!res.ok) {
    throw new Error(`取得失敗: HTTP ${res.status}`);
  }
  const html = await res.text();
  const events = parseEvents(html);

  const json = JSON.stringify(events, null, 2);
  const outPath = process.argv[2];
  if (outPath) {
    await mkdir(dirname(outPath), { recursive: true });
    await writeFile(outPath, json + "\n", "utf-8");
    console.log(`${events.length}件の試合情報を ${outPath} に書き出しました。`);
  } else {
    console.log(json);
  }
}

main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});
