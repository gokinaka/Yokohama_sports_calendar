// 各データソース候補ページの robots.txt を確認し、許可されている場合のみ
// ページ内容の一部(構造把握用のスニペットと JSON-LD / .ics リンク)をログに出力する。
// 本番のスクレイパーではなく、実データの構造を確認するための調査用スクリプト。

import { setTimeout as sleep } from "node:timers/promises";
import { readFile } from "node:fs/promises";

const USER_AGENT =
  "YokohamaSportsCalendarBot/0.1 (+https://github.com/gokinaka/yokohama_sports_calendar)";
const REQUEST_INTERVAL_MS = 2000;

async function fetchRobotsRules(origin) {
  const url = new URL("/robots.txt", origin).toString();
  try {
    const res = await fetch(url, { headers: { "User-Agent": USER_AGENT } });
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

function extractJsonLdBlocks(html) {
  const blocks = [];
  const re = /<script[^>]+type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi;
  let m;
  while ((m = re.exec(html))) {
    blocks.push(m[1].trim());
  }
  return blocks;
}

function extractIcsLinks(html, base) {
  const links = new Set();
  const re = /href=["']([^"']+\.ics[^"']*)["']/gi;
  let m;
  while ((m = re.exec(html))) {
    try {
      links.add(new URL(m[1], base).toString());
    } catch {
      links.add(m[1]);
    }
  }
  return [...links];
}

async function inspectUrl(url) {
  const u = new URL(url);
  const { exists: robotsExists, disallowedForAll, error: robotsError } =
    await fetchRobotsRules(u.origin);

  console.log(`\n### ${url}`);
  if (robotsError) {
    console.log(`robots.txt: 取得失敗 (${robotsError}) — 判断できないため今回はスキップします`);
    return;
  }
  console.log(
    `robots.txt: ${robotsExists ? "あり" : "なし"} / User-agent:* のDisallow件数=${disallowedForAll.length}`
  );

  if (robotsExists && isPathDisallowed(u.pathname, disallowedForAll)) {
    console.log(`→ robots.txt により ${u.pathname} は Disallow 対象のためアクセスしません。`);
    return;
  }

  try {
    const res = await fetch(url, { headers: { "User-Agent": USER_AGENT } });
    console.log(`HTTP ${res.status} / Content-Type: ${res.headers.get("content-type")}`);
    if (!res.ok) return;
    const html = await res.text();
    console.log(`本文サイズ: ${html.length} 文字`);

    const jsonLd = extractJsonLdBlocks(html);
    console.log(`JSON-LD ブロック数: ${jsonLd.length}`);
    jsonLd.slice(0, 2).forEach((block, i) => {
      console.log(`--- JSON-LD[${i}] (先頭800文字) ---\n${block.slice(0, 800)}`);
    });

    const icsLinks = extractIcsLinks(html, url);
    console.log(`.ics リンク: ${icsLinks.length > 0 ? icsLinks.join(", ") : "見つかりませんでした"}`);

    console.log(`--- 本文スニペット(先頭1500文字) ---\n${html.slice(0, 1500)}`);
  } catch (err) {
    console.log(`取得エラー: ${err}`);
  }
}

async function main() {
  const raw = await readFile(new URL("../config/sources.json", import.meta.url), "utf-8");
  const sources = JSON.parse(raw);

  for (const source of sources) {
    console.log(`\n==================== ${source.team} (${source.league}) ====================`);
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
