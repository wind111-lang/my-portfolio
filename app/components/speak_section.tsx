import React from "react";

export default function SpeakSection(): React.ReactNode {
  return (
    <section id="speak" className="py-8">
      <h2 className="text-3xl font-semibold mb-4 text-gray-800 dark:text-gray-200">
        Speak
      </h2>
      <article className="flex flex-col gap-4">
        <a
          href="https://fortee.jp/phpcon-fukuoka-2025/proposal/739e5ee1-e3a0-4dfa-a33f-cc84613006e5"
          className="hover:text-blue-500 dark:hover:text-blue-500  text-gray-800 dark:text-gray-200"
        >
          <h3 className="text-2xl font-bold">
            ゼロタウンタイムでミドルウェアのバージョンアップを実現した手法と課題
          </h3>
          <p className="text-lg">
            （発表前）ゼロタウンタイムでOpenSearchのバージョンアップを実現した方法や今後の課題について話します
          </p>
        </a>
      </article>
    </section>
  );
}
