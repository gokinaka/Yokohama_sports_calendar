// 横浜ビー・コルセアーズ(B.LEAGUE)の試合日程を公式サイトから取得する。

import { runFetcher } from "../lib/common.mjs";
import { fetchSchedule } from "../lib/kuroco-schedule.mjs";

const TEAM = "横浜ビー・コルセアーズ";

runFetcher(import.meta.url, TEAM, () =>
  fetchSchedule({
    origin: "https://b-corsairs.com",
    team: TEAM,
    league: "B.LEAGUE",
    shortName: "横浜BC",
  })
);
