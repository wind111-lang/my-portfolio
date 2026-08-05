import React from "react";

export default function SpeakSection(): React.ReactNode {
  return (
    <section id="speak" className="x-window speak-window">
      <h2 className="x-titlebar"><span>SPEAK.LOG</span><span>□</span></h2>
      <article className="talk-list">
        <a
          href="https://fortee.jp/phpcon-fukuoka-2025/proposal/739e5ee1-e3a0-4dfa-a33f-cc84613006e5"
          target="_blank" rel="noopener noreferrer"
        >
          <span className="talk-label">PHP CONFERENCE FUKUOKA 2025</span>
          <h3>
            ゼロタウンタイムでミドルウェアのバージョンアップを実現した手法と課題
          </h3>
          <p>
            ゼロタウンタイムでOpenSearchのバージョンアップを実現した方法や今後の課題について話しました
          </p>
        </a>
      </article>
    </section>
  );
}
