import React from "react";

export default function BlogSection(): React.ReactNode {
  return (
    <section id="blog" className="py-8">
      <h2 className="text-3xl font-semibold mb-4 dark:text-gray-200">ブログ</h2>
      <article className="mb-6">
        <h3 className="text-2xl font-bold dark:text-gray-200">
          記事タイトル例
        </h3>
        <p className="text-lg text-gray-800 dark:text-gray-200">
          この記事の概要をここに記述します…
        </p>
        <a href="/blog/article-1" className="text-blue-500 hover:underline">
          続きを読む
        </a>
      </article>
      {/* 複数の記事を追加可能 */}
    </section>
  );
}
