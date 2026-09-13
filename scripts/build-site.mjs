// GitHub Pages に公開する静的サイトを _site/ に組み立てる。
// site/index.html をルートに置き、カレンダーが読み込むJSONを data/ に配置する。

import { mkdir, copyFile, readdir, rm } from "node:fs/promises";

const OUT_DIR = "_site";
const DATA_FILES = ["events.json", "status.json"];

async function main() {
  await rm(OUT_DIR, { recursive: true, force: true });
  await mkdir(`${OUT_DIR}/data`, { recursive: true });

  await copyFile("site/index.html", `${OUT_DIR}/index.html`);
  for (const file of DATA_FILES) {
    await copyFile(`data/${file}`, `${OUT_DIR}/data/${file}`);
  }

  const files = await readdir(OUT_DIR, { recursive: true });
  console.log(`${OUT_DIR}/ を作成しました:`);
  for (const f of files.sort()) console.log(`  ${f}`);
}

main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});
