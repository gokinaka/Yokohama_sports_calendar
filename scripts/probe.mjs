// 指定したURLのHTML構造を詳しく調べ、試合日程らしき繰り返し要素や
// 埋め込みJSON(Next.js/Nuxtの初期データなど)、日付らしきパターンの
// 出現箇所を出力する。実際のスクレイパーを設計する前の構造調査用。
//
// 使い方: node scripts/probe.mjs <URL> [追加で確認したい文字列(class名など)...]

const USER_AGENT =
  "YokohamaSportsCalendarBot/0.1 (+https://github.com/gokinaka/Yokohama_sports_calendar)";

const url = process.argv[2];
const extraAnchors = process.argv.slice(3);
if (!url) {
  console.error("使い方: node scripts/probe.mjs <URL> [追加で確認したい文字列...]");
  process.exit(1);
}

function findAnchorContexts(html, anchor, maxMatches = 2, before = 300, after = 2200) {
  const contexts = [];
  let fromIndex = 0;
  while (contexts.length < maxMatches) {
    const idx = html.indexOf(anchor, fromIndex);
    if (idx === -1) break;
    const start = Math.max(0, idx - before);
    const end = Math.min(html.length, idx + after);
    contexts.push(html.slice(start, end));
    fromIndex = idx + anchor.length;
  }
  return contexts;
}

function findEmbeddedJsonScripts(html) {
  const patterns = [
    { name: "__NEXT_DATA__", re: /<script[^>]+id=["']__NEXT_DATA__["'][^>]*>([\s\S]*?)<\/script>/i },
    { name: "__NUXT__", re: /window\.__NUXT__\s*=\s*([\s\S]*?);?\s*<\/script>/i },
    { name: "__INITIAL_STATE__", re: /window\.__INITIAL_STATE__\s*=\s*([\s\S]*?);?\s*<\/script>/i },
  ];
  const found = [];
  for (const p of patterns) {
    const m = html.match(p.re);
    if (m) found.push({ name: p.name, length: m[1].length, sample: m[1].slice(0, 500) });
  }
  return found;
}

function findRepeatingClassNames(html, minCount = 5) {
  const classRe = /class=["']([^"']+)["']/g;
  const counts = new Map();
  let m;
  while ((m = classRe.exec(html))) {
    for (const cls of m[1].split(/\s+/)) {
      if (!cls) continue;
      counts.set(cls, (counts.get(cls) || 0) + 1);
    }
  }
  return [...counts.entries()]
    .filter(([cls, count]) => count >= minCount && /schedule|match|game|fixture|event|list|card|item/i.test(cls))
    .sort((a, b) => b[1] - a[1])
    .slice(0, 30);
}

function findDateLikeContexts(html, maxMatches = 6) {
  // 例: 2026.09.13 / 2026-09-13 / 9/13(日) / 9月13日 のようなパターン
  const re = /(\d{4}[./-]\d{1,2}[./-]\d{1,2}|\d{1,2}\/\d{1,2}\s*\([月火水木金土日]\)|\d{1,2}月\d{1,2}日)/g;
  const contexts = [];
  let m;
  while ((m = re.exec(html)) && contexts.length < maxMatches) {
    const start = Math.max(0, m.index - 200);
    const end = Math.min(html.length, m.index + 300);
    contexts.push(html.slice(start, end).replace(/\s+/g, " "));
  }
  return contexts;
}

async function main() {
  const res = await fetch(url, { headers: { "User-Agent": USER_AGENT } });
  console.log(`HTTP ${res.status} / Content-Type: ${res.headers.get("content-type")}`);
  if (!res.ok) return;
  const html = await res.text();
  console.log(`本文サイズ: ${html.length} 文字`);

  const embedded = findEmbeddedJsonScripts(html);
  console.log(`\n=== 埋め込みJSON候補: ${embedded.length}件 ===`);
  for (const e of embedded) {
    console.log(`- ${e.name} (長さ${e.length}) 先頭500文字: ${e.sample}`);
  }

  const classes = findRepeatingClassNames(html);
  console.log(`\n=== 試合一覧っぽい繰り返しclass候補: ${classes.length}件 ===`);
  for (const [cls, count] of classes) {
    console.log(`- "${cls}" ×${count}`);
  }

  if (extraAnchors.length === 0) {
    const dateContexts = findDateLikeContexts(html);
    console.log(`\n=== 日付らしきパターンの出現箇所(前後200-300文字): ${dateContexts.length}件 ===`);
    dateContexts.forEach((ctx, i) => console.log(`--- [${i}] ---\n${ctx}\n`));
  } else {
    for (const anchor of extraAnchors) {
      const contexts = findAnchorContexts(html, anchor);
      console.log(`\n=== "${anchor}" の出現箇所(前後を広めに): ${contexts.length}件 ===`);
      contexts.forEach((ctx, i) => console.log(`--- [${i}] ---\n${ctx}\n`));
    }
  }
}

main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});
