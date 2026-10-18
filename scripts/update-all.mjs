// config/teams.json のフェッチャーを順番に実行する。
//
// 1チームの失敗で他が止まらないよう、失敗しても次に進み、最後にまとめて報告する。
// 失敗が1件でもあれば非ゼロで終了するので、GitHub Actions上で赤くなる。
// (以前は各チームをstepに分けて continue-on-error にしていたため、
//  取得できていないチームがあってもジョブが成功扱いになり気付けなかった)

import { readFile } from "node:fs/promises";
import { spawn } from "node:child_process";

const ROSTER_FILE = "config/teams.json";
const DATA_DIR = "data";

function run(fetcher, outPath) {
  return new Promise((resolve) => {
    const child = spawn(process.execPath, [fetcher, outPath], { stdio: "inherit" });
    child.on("close", (code) => resolve(code ?? 1));
    child.on("error", (err) => {
      console.error(`${fetcher} を起動できませんでした: ${err}`);
      resolve(1);
    });
  });
}

const roster = JSON.parse(await readFile(ROSTER_FILE, "utf-8")).teams;
const failed = [];
for (const entry of roster) {
  console.log(`\n--- ${entry.team} (${entry.fetcher})`);
  const code = await run(entry.fetcher, `${DATA_DIR}/${entry.file}`);
  if (code !== 0) failed.push(entry.team);
}

console.log(`\n===== 取得結果: 成功${roster.length - failed.length} / 全${roster.length}チーム`);
if (failed.length > 0) {
  console.error(`失敗: ${failed.join(", ")}`);
  console.error("取得元の構造変更かもしれません。失敗したチームのデータは前回の内容を残しています。");
  process.exitCode = 1;
}
