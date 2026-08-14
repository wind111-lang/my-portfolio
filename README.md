# Tsutsui Shota Portfolio

X68000のHuman68kとSX-WINDOWをモチーフにしたポートフォリオサイトです。COMMANDモードとGUIモードを切り替えて、プロフィール、経歴、技術スタック、執筆・登壇情報を閲覧できます。

## Tech stack

- React Router v8（Framework Mode / SPA Mode）
- React 19
- TypeScript 7
- Vite 8
- Tailwind CSS 3
- Web Audio API

## Requirements

- Node.js 22.22.0以上
- pnpm 10.33.0

## Development

依存関係をインストールし、開発サーバーを起動します。

```sh
pnpm install
pnpm dev
```

型チェックとLintは次のコマンドで実行できます。

```sh
pnpm typecheck
pnpm lint
```

## Production build

```sh
pnpm build
pnpm start
```

`pnpm build` はGitHub Pagesへ配置する静的ファイルを `build/client` に生成します。`pnpm start` はその成果物をローカルでプレビューします。

## Deployment

`main` ブランチへのpushを契機に、GitHub Actionsがproduction buildを実行し、`build/client` をGitHub Pagesへデプロイします。

React Routerは `/my-portfolio/` をbasenameとするSPAとして構成しています。GitHub Pagesで直接URLを開いた場合にもSPAへフォールバックできるよう、ビルド時に `404.html` も生成します。
