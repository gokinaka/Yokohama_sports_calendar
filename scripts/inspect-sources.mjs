// 各データソース候補ページの robots.txt を確認し、許可されている場合のみ取得して
// 「スクレイピングで試合日程が取れそうか」を判定する。
//
// 判定の考え方:
//   - サーバーサイドでHTMLに日付が描画されていれば、fetchだけで取得できる可能性が高い
//   - Next.js/Nuxtなどのクライアントサイド描画だと、初期HTMLに試合データが無く取得できない
//
// 実際のパーサーではなく、実装対象を絞り込むための調査用スクリプト。

import { setTimeout as sleep } from "node:timers/promises";
import { readFile } from "node:fs/promises";

const USER_AGENT =
  "YokohamaSportsCalendarBot/0.1 (+https://github.com/gokinaka/Yokohama_sports_calendar)";
const REQUEST_INTERVAL_MS = 2000;
const REQUEST_TIMEOUT_MS = 15000;

async function fetchRobotsRules(origin) {
  const url = new URL("/robots.txt", origin).toString();
  try {
    const res = await fetch(url, {
      headers: { "User-Agent": USER_AGENT },
      signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
    });
    if (!res.ok) return { exists: false, disallowedForAll: [] };
    const text = await res.text();
    return { exists: true, disallowedForAll: parseDisallowForStar(text) };
  } catch (err) {
    return { exists: false, error: String(err), disallowedForAll: [] };
  }
}

// User-agent: * ブロックの Disallow のみを簡易的に抽出する(厳密な robots.txt パーサーではない)
function parseDisallowForStar(text) {
  const lines = text.split(/\r?\n/);
  const disallowed = [];
  let inStarBlock = false;
  for (const rawLine of lines) {
    const line = rawLine.split("#")[0].trim();
    if (!line) continue;
    const [rawKey, ...rest] = line.split(":");
    const key = rawKey.trim().toLowerCase();
    const value = rest.join(":").trim();
    if (key === "user-agent") {
      inStarBlock = value === "*";
    } else if (key === "disallow" && inStarBlock && value) {
      disallowed.push(value);
    }
  }
  return disallowed;
}

function isPathDisallowed(pathname, disallowedPrefixes) {
  return disallowedPrefixes.some((prefix) => pathname.startsWith(prefix));
}

function detectFramework(html) {
  if (/<script[^>]+id=["']__NEXT_DATA__["']/.test(html) || /\/_next\/static\//.test(html)) {
    return "Next.js";
  }
  if (/window\.__NUXT__/.test(html) || /\/_nuxt\//.test(html)) return "Nuxt";
  return "通常のHTML";
}

// 本文(scriptとstyleを除いたHTML)に現れる日付らしきパターンの数を数える。
// 試合一覧がサーバー側で描画されていれば、ある程度まとまった数になる。
function countDatePatterns(html) {
  const body = html
    .replace(/<script[\s\S]*?<\/script>/gi, "")
    .replace(/<style[\s\S]*?<\/style>/gi, "");
  const patterns = {
    "M月D日": /\d{1,2}月\d{1,2}日/g,
    "M/D": /\b\d{1,2}\/\d{1,2}\b/g,
    "M.D": />\s*\d{1,2}\.\d{1,2}\s*</g,
    "YYYY-MM-DD": /\d{4}-\d{2}-\d{2}/g,
    "曜日カッコ": /[（(][月火水木金土日][）)]/g,
    "時刻": /\b\d{1,2}:\d{2}\b/g,
  };
  const counts = {};
  for (const [name, re] of Object.entries(patterns)) {
    counts[name] = (body.match(re) || []).length;
  }
  return counts;
}

function verdict({ framework, counts }) {
  const dateish =
    counts["M月D日"] + counts["M/D"] + counts["M.D"] + counts["YYYY-MM-DD"] + counts["曜日カッコ"];
  if (framework !== "通常のHTML" && dateish < 5) {
    return { mark: "×", reason: `${framework}のクライアント描画で初期HTMLに日程が無い` };
  }
  if (dateish >= 15) return { mark: "◎", reason: `日付${dateish}件を初期HTMLから検出` };
  if (dateish >= 5) return { mark: "○", reason: `日付${dateish}件を検出(要精査)` };
  return { mark: "△", reason: `日付${dateish}件のみ。別ページの可能性` };
}

async function inspectUrl(url) {
  const u = new URL(url);
  const { exists: robotsExists, disallowedForAll, error: robotsError } =
    await fetchRobotsRules(u.origin);

  if (robotsError) {
    console.log(`  ${url}\n    robots.txt取得失敗のためスキップ (${robotsError})`);
    return;
  }
  if (robotsExists && isPathDisallowed(u.pathname, disallowedForAll)) {
    console.log(`  ${url}\n    × robots.txtで ${u.pathname} がDisallow。アクセスしません`);
    return;
  }

  try {
    const res = await fetch(url, {
      headers: { "User-Agent": USER_AGENT },
      signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
    });
    if (!res.ok) {
      console.log(`  ${url}\n    × HTTP ${res.status}`);
      return;
    }
    const html = await res.text();
    const framework = detectFramework(html);
    const counts = countDatePatterns(html);
    const { mark, reason } = verdict({ framework, counts });
    const countSummary = Object.entries(counts)
      .filter(([, n]) => n > 0)
      .map(([name, n]) => `${name}:${n}`)
      .join(" ");
    console.log(`  ${url}`);
    console.log(`    ${mark} ${reason}`);
    console.log(
      `    framework=${framework} robots=${robotsExists ? "あり(対象パスは許可)" : "なし"} size=${html.length}`
    );
    console.log(`    検出パターン: ${countSummary || "なし"}`);
  } catch (err) {
    console.log(`  ${url}\n    × 取得エラー: ${err}`);
  }
}

async function main() {
  const raw = await readFile(new URL("../config/sources.json", import.meta.url), "utf-8");
  const sources = JSON.parse(raw);

  for (const source of sources) {
    console.log(`\n■ ${source.team} [${source.sport}] ${source.league} (${source.city ?? "-"})`);
    for (const url of source.candidateUrls) {
      await inspectUrl(url);
      await sleep(REQUEST_INTERVAL_MS);
    }
  }
}

main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});
