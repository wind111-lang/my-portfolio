import React from "react";

export default function SpeakSection(): React.ReactNode {
  return (
    <section id="speak" className="x-window speak-window">
      <h2 className="x-titlebar"><span>SPEAK.LOG</span><span>□</span></h2>
      <article className="talk-list">
        <a
          href="https://speakerdeck.com/wind111/how-to-manage-link-domain-reputation-for-email-deliverability"
          target="_blank" rel="noopener noreferrer"
        >
          <span className="talk-label">PHP CONFERENCE NIIGATA 2026（レギュラートーク）</span>
          <h3>
            メール到達性を支える、リンク先URLのドメイン評価の扱い方
          </h3>
          <p>
            プレスリリースに含まれるリンク先URLのドメイン評価を、メール到達性の観点でどう扱ったかについて話しました
          </p>
        </a>
      </article>
      <article className="talk-list">
        <a
          href="https://speakerdeck.com/wind111/php-game-controller-midi-device"
          target="_blank" rel="noopener noreferrer"
        >
          <span className="talk-label">PHP CONFERENCE NIIGATA 2026（LT）</span>
          <h3>
            PHPで家庭用ゲーム機の専用コントローラーをMIDIデバイスとして扱ってみる
          </h3>
          <p>
            家庭用ゲーム機の専用コントローラーをPHPでMIDIデバイスとして扱う試みについて話しました
          </p>
        </a>
      </article>
      <article className="talk-list">
        <a
          href="https://fortee.jp/phpcon-fukuoka-2025/proposal/739e5ee1-e3a0-4dfa-a33f-cc84613006e5"
          target="_blank" rel="noopener noreferrer"
        >
          <span className="talk-label">PHP CONFERENCE FUKUOKA 2025</span>
          <h3>
            ゼロダウンタイムでミドルウェアのバージョンアップを実現した手法と課題
          </h3>
          <p>
            ゼロダウンタイムでOpenSearchのバージョンアップを実現した方法や今後の課題について話しました
          </p>
        </a>
      </article>
    </section>
  );
}
