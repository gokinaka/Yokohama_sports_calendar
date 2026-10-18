// 横浜エクセレンス(B.LEAGUE ONE)の試合日程を公式サイトから取得する。
// ビー・コルセアーズ/ブレイブサンダースと同じCMSテンプレートなので共通処理を使う。

import { runFetcher } from "../lib/common.mjs";
import { fetchSchedule } from "../lib/kuroco-schedule.mjs";

const TEAM = "横浜エクセレンス";

runFetcher(import.meta.url, TEAM, () =>
  fetchSchedule({
    origin: "https://yokohama-ex.jp",
    team: TEAM,
    league: "B.LEAGUE ONE",
    shortName: "横浜EX",
  })
);
