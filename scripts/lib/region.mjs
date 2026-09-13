// 会場名から神奈川県内(kanagawa)か県外(outside)かを判定する。
// 判定できない場合は unknown を返し、推測はしない。

import { readFile } from "node:fs/promises";

let config;

export async function loadVenueConfig() {
  if (!config) {
    const raw = await readFile(new URL("../../config/venues.json", import.meta.url), "utf-8");
    config = JSON.parse(raw);
  }
  return config;
}

export function classifyVenue(venue, cfg) {
  if (!venue) return "unknown";
  if (cfg.unknownVenues.some((w) => venue.includes(w))) return "unknown";
  // 「大和町総合体育館」のように県内キーワードと紛らわしい県外会場を先に除外する
  if (cfg.outsideVenues.some((w) => venue.includes(w))) return "outside";
  if (cfg.kanagawaVenues.some((w) => venue.includes(w))) return "kanagawa";
  if (cfg.kanagawaKeywords.some((w) => venue.includes(w))) return "kanagawa";
  return "outside";
}
