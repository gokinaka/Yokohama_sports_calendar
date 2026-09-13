# 横浜近郊スポーツ観戦カレンダー

横浜近郊(神奈川県)のプロスポーツチームの試合日程を1つのカレンダーにまとめて、
観戦の予定を立てやすくするためのWebアプリ。

**公開URL: https://gokinaka.github.io/Yokohama_sports_calendar/**

## 対応状況

7競技12チームの日程を各公式サイト/リーグ公式サイトから週1回自動取得している。

| 競技 | チーム | リーグ | 取得元 |
|---|---|---|---|
| サッカー | 横浜F・マリノス | J1 | 球団公式 |
| サッカー | 川崎フロンターレ | J1 | 球団公式(全試合一覧) |
| サッカー | 横浜FC | J2 | 球団公式(直近数試合のみ) |
| サッカー | 湘南ベルマーレ | J2 | 球団公式 |
| 野球 | 横浜DeNAベイスターズ | NPB | 球団公式(月別ページを巡回) |
| バレーボール | NECレッドロケッツ川崎 | SVリーグ | 球団公式 |
| 卓球 | 木下アビエル神奈川 | ノジマTリーグ | Tリーグ公式 |
| ハンドボール | アースフレンズBM東京・神奈川 | リーグH | リーグH公式 |
| バスケ | 横浜ビー・コルセアーズ | B.LEAGUE | 球団公式(シーズン一覧) |
| バスケ | 川崎ブレイブサンダース | B.LEAGUE | 球団公式(シーズン一覧) |
| バスケ | 富士通レッドウェーブ | Wリーグ | 球団公式(ページ送り) |
| ラグビー | 横浜キヤノンイーグルス | リーグワン | リーグワン公式 |

ラグビーは2026-27シーズンの日程がまだ公開されていないため、現時点では表示される試合がない。
日程が公開されれば自動で反映される。

富士通レッドウェーブはページにホーム/アウェイの表記が無いため、推測せず未設定にしている。
ドッジボールはプロリーグが存在しないため対象外。詳細は [docs/DATA_SOURCES.md](docs/DATA_SOURCES.md)。

## 会場の所在地フィルタ

カレンダーは「神奈川県内 / 県外 / すべて」で絞り込める(初期表示は県内のみ)。

判定はホーム/アウェイではなく**会場名**で行っている。公式サイト上はホーム扱いでも
会場が県外というケースがあるため。

- 横浜F・マリノス対東京ヴェルディがMUFGスタジアム(東京)開催で「HOME」表記
- 木下アビエル神奈川のホーム戦が駒沢(世田谷区)や船橋アリーナで開催

判定ルールは [config/venues.json](config/venues.json) に置いてある。
`大和町総合体育館`(宮城県黒川郡大和町)のように県内の地名と紛らわしい会場は
`outsideVenues` で明示的に除外している。県内に新しい会場ができた場合は
`kanagawaVenues` に追記する。開催地が「未定」「調整中」の試合は `unknown` として
県内・県外のどちらにも含めない。

## 競技フィルタ

競技チップで表示する競技を絞り込める(複数選択可)。対応している競技は
今後の試合が0件でもグレーアウトしたチップとして表示する。未対応なのか
日程が未発表なだけなのかを区別できるようにするため(現状はラグビーが該当)。

## 仕組み

```
GitHub Actions (毎週月曜 JST 3:00)
  └─ scripts/fetch/*.mjs    各チームの日程を取得 → data/<チーム>.json
  └─ scripts/build-events.mjs  統合して今後の試合だけを data/events.json に出力
                               あわせて取得状況を data/status.json に出力
  └─ 変更があれば自動コミット

site/index.html  data/events.json を読み込んでカレンダー表示(GitHub Pages想定)
```

## ディレクトリ構成

```
config/sources.json          対象チームとデータソース候補
scripts/lib/common.mjs       フェッチャー共通処理
scripts/fetch/*.mjs          チームごとの取得スクリプト
scripts/build-events.mjs     データ統合
scripts/inspect-sources.mjs  データソースの取得可否を調べる調査用
scripts/probe.mjs            ページ構造を調べる調査用
scripts/dump-html.mjs        パーサー実装用にHTMLを保存する調査用
data/                        取得した試合日程(自動更新)
site/index.html              カレンダー表示
docs/DATA_SOURCES.md         データソース調査結果
```

## ローカルでの実行

```bash
node scripts/fetch/marinos.mjs data/marinos.json   # 単一チームを取得
node scripts/build-events.mjs                      # data/events.json を再生成
```

## GitHub Pagesでの公開

`.github/workflows/deploy-pages.yml` が `site/index.html` と `data/` を `_site/` に
まとめて公開する。データ更新ワークフローの完了後にも自動で再デプロイされる。

設定済み(Settings → Pages → Source = GitHub Actions)。以降は `site/` や `data/` の
変更をpushすると自動でデプロイされる。

なお、GitHub ActionsのGITHUB_TOKENではPagesサイトを新規作成できないため
(`Resource not accessible by integration`)、初回の有効化だけは設定画面での操作が必要だった。
また、GitHub FreeプランではprivateリポジトリでPagesが使えないため、
このリポジトリはpublicにしている。

## 未対応・今後の課題

1. 各サイトの利用規約の確認。robots.txtは機械的に確認済みだが、規約本文は未確認
2. 横浜FCは公式サイトが直近数試合しか掲載しないため、取得できる試合数が少ない
