import {
  Links,
  Meta,
  Outlet,
  Scripts,
  ScrollRestoration,
} from "react-router";
import "./tailwind.css";

export function meta() {
  return [
    { title: "Tsutsui Shota | Software Engineer" },
    {
      name: "description",
      content:
        "Software Engineer Tsutsui Shota のポートフォリオ。プロフィール、経歴、技術スタック、執筆・登壇情報を掲載しています。",
    },
    { property: "og:title", content: "Tsutsui Shota | Software Engineer" },
    {
      property: "og:description",
      content: "Human68k v3.02 / SX-WINDOW inspired portfolio.",
    },
    { property: "og:type", content: "website" },
    {
      property: "og:image",
      content: "https://wind111-lang.github.io/my-portfolio/og-v2.png",
    },
    { name: "twitter:card", content: "summary_large_image" },
    {
      name: "twitter:image",
      content: "https://wind111-lang.github.io/my-portfolio/og-v2.png",
    },
  ];
}

export function Layout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ja">
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <Meta />
        <Links />
      </head>
      <body>
        {children}
        <ScrollRestoration />
        <Scripts />
      </body>
    </html>
  );
}

export default function App() {
  return <Outlet />;
}
