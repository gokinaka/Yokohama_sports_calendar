// 川崎ブレイブサンダース(B.LEAGUE)の試合日程を公式サイトから取得する。

import { runFetcher } from "../lib/common.mjs";
import { fetchSchedule } from "../lib/kuroco-schedule.mjs";

const TEAM = "川崎ブレイブサンダース";

runFetcher(import.meta.url, TEAM, () =>
  fetchSchedule({
    origin: "https://kawasaki-bravethunders.com",
    team: TEAM,
    league: "B.LEAGUE",
    shortName: "川崎",
  })
);
