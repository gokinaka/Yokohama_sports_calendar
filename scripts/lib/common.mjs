// 各チームの試合日程フェッチャーで共通して使うユーティリティ。

import { writeFile, mkdir } from "node:fs/promises";
import { dirname } from "node:path";
import { pathToFileURL } from "node:url";

export const USER_AGENT =
  "YokohamaSportsCalendarBot/0.1 (+https://github.com/gokinaka/Yokohama_sports_calendar)";
const REQUEST_TIMEOUT_MS = 20000;

export async function fetchHtml(url) {
  const res = await fetch(url, {
    headers: { "User-Agent": USER_AGENT },
    signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
  });
  if (!res.ok) throw new Error(`取得失敗 ${url}: HTTP ${res.status}`);
  return res.text();
}

const ENTITIES = {
  "&amp;": "&",
  "&lt;": "<",
  "&gt;": ">",
  "&quot;": '"',
  "&#39;": "'",
  "&nbsp;": " ",
  "&#8211;": "-",
};

export function decodeEntities(text) {
  return text
    .replace(/&#(\d+);/g, (_, n) => String.fromCharCode(Number(n)))
    .replace(/&[a-z]+;|&#\d+;/gi, (m) => ENTITIES[m] ?? m);
}

// タグを除去して本文テキストだけにする
export function textOf(html) {
  if (html == null) return null;
  const text = decodeEntities(html.replace(/<[^>]*>/g, " "))
    .replace(/\s+/g, " ")
    .trim();
  return text || null;
}

export function first(html, re) {
  const m = html.match(re);
  return m ? m[1] : null;
}

export function isoDate(year, month, day) {
  return `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

// 月日しか分からない一覧で、月が前の試合より小さくなったら年が繰り上がったとみなす
export function createYearTracker(startYear) {
  let year = startYear;
  let prevMonth = null;
  return (month) => {
    if (prevMonth !== null && month < prevMonth) year += 1;
    prevMonth = month;
    return year;
  };
}

export function makeEvent({
  team,
  sport,
  league,
  competition = null,
  date,
  weekday = null,
  time = null,
  homeAway = null,
  venue = null,
  opponent = null,
  sourceUrl,
  fetchedAt,
}) {
  return {
    team,
    sport,
    league,
    competition,
    date,
    weekday,
    time,
    homeAway,
    venue,
    opponent,
    sourceUrl,
    fetchedAt,
  };
}

export async function outputEvents(events, label) {
  const sorted = [...events].sort((a, b) =>
    a.date === b.date ? (a.time ?? "").localeCompare(b.time ?? "") : a.date.localeCompare(b.date)
  );
  const json = JSON.stringify(sorted, null, 2);
  const outPath = process.argv[2];
  if (outPath) {
    await mkdir(dirname(outPath), { recursive: true });
    await writeFile(outPath, json + "\n", "utf-8");
    console.log(`${label}: ${sorted.length}件を ${outPath} に書き出しました`);
  } else {
    console.log(json);
  }
}

export function runFetcher(moduleUrl, label, fn) {
  const entry = process.argv[1] ? pathToFileURL(process.argv[1]).href : null;
  if (moduleUrl !== entry) return; // テストから import されたときは実行しない
  fn()
    .then((events) => outputEvents(events, label))
    .catch((err) => {
      console.error(`${label}: ${err}`);
      process.exitCode = 1;
    });
}
