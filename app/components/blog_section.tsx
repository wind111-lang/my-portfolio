import React from "react";

export default function BlogSection(): React.ReactNode {
  return (
    <section id="blog" className="py-8">
      <h2 className="text-3xl font-semibold mb-4 text-gray-800 dark:text-gray-200">
        Blog
      </h2>
      <article className="mb-6">
        <a
          href="https://yahoo.co.jp"
          className="hover:text-blue-500  text-gray-800 dark:text-gray-200"
        >
          <h3 className="text-2xl font-bold">記事タイトル例</h3>
          <p className="text-lg">この記事の概要をここに記述します…</p>
        </a>
        <a
          href="https://yahoo.co.jp"
          className="hover:text-blue-500  text-gray-800 dark:text-gray-200"
        >
          <h3 className="text-2xl font-bold">記事タイトル例</h3>
          <p className="text-lg">この記事の概要をここに記述します…</p>
        </a>
        <a
          href="https://yahoo.co.jp"
          className="hover:text-blue-500  text-gray-800 dark:text-gray-200"
        >
          <h3 className="text-2xl font-bold">記事タイトル例</h3>
          <p className="text-lg">この記事の概要をここに記述します…</p>
        </a>
      </article>
    </section>
  );
}
