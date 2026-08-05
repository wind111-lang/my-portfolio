import React from "react";

export default function BlogSection(): React.ReactNode {
  return (
    <section id="blog" className="x-window blog-window">
      <h2 className="x-titlebar"><span>ARTICLES.DIR</span><span>□</span></h2>
      <div className="file-header" aria-hidden="true">
        <span>FILENAME / DESCRIPTION</span><span>TYPE</span>
      </div>
      <article className="article-list">
        <a
          href="https://qiita.com/wind111-lang/items/af7e3fadeb1c71673cda"
          target="_blank" rel="noopener noreferrer"
        >
          <h3>
            GoオンリーでGUI上からQRコード読み取りをしてみた
          </h3>
          <p>
            GoでOpenCVとQtを利用して、QRコードを読み取る方法について紹介した記事です。初執筆。
          </p>
        </a>
        <a
          href="https://zenn.dev/wind111/articles/4cc15edad10508"
          target="_blank" rel="noopener noreferrer"
        >
          <h3>Pythonで簡単に経路探索をする</h3>
          <p>
            経路探索パッケージ OSMnx
            で経路を探索・可視化を行う方法について紹介した記事です。
          </p>
        </a>
        <a
          href="https://developers.prtimes.com/2024/09/02/execute-bg-data-transfers/"
          target="_blank" rel="noopener noreferrer"
        >
          <h3>
            BigQuery Data Transfersをエンジニア全員に対して実行可能にした話
          </h3>
          <p>
            Data Transfersをエンジニアが利用可能にするためのTipsです。
          </p>
        </a>
        <a
          href="https://qiita.com/wind111-lang/items/a93e243ed2e359ec30cc"
          target="_blank" rel="noopener noreferrer"
        >
          <h3>PHPUnitでよく使うassertion</h3>
          <p>
            PHPのテストライブラリである PHPUnit でよく使用する
            assertionをまとめた記事です。
          </p>
        </a>
        <a
          href="https://developers.prtimes.com/2025/02/18/mock-aws-sdk-in-php/"
          target="_blank" rel="noopener noreferrer"
        >
          <h3>PHPでAWS SDKのテストをMockする</h3>
          <p>
            PHPのモックライブラリである Mockery を利用してAWS
            S3のテストをMockする方法について紹介した記事です。
          </p>
        </a>
        <a
          href="https://developers.prtimes.com/2025/06/24/backup-and-restore-in-amazon-fsx-for-netapp-ontap/"
          target="_blank" rel="noopener noreferrer"
        >
          <h3>
            Amazon FSx for NetApp
            ONTAPで手動バックアップおよびリストアを行うTips
          </h3>
          <p>
            Amazon FSx for NetApp
            ONTAPでのバックアップ作成や復元についてまとめた記事です。
          </p>
        </a>
        <a
          href="https://developers.prtimes.com/2025/10/01/version-up-prtimes-opensearch/"
          target="_blank" rel="noopener noreferrer"
        >
          <h3>
            PR TIMESのOpenSearchをバージョンアップしました
          </h3>
          <p>
            PR
            TIMESの検索で利用しているOpenSearchのバージョンアップについて紹介した記事です。
          </p>
        </a>
        <a
          href="https://developers.prtimes.com/2026/05/13/press-release-url-evaluation-domain/"
          target="_blank" rel="noopener noreferrer"
        >
          <h3>
            メール到達性を支える、プレスリリース内URLのドメイン評価の仕組み
          </h3>
          <p>
            一部ユーザーに対してPR TIMESのメール送信が行われなかったことを受け、PR TIMESのプレスリリースエディターにURLのドメイン評価を行う機能を実装しました。
            ドメイン評価の仕組みについて詳しく紹介した記事です。
          </p>
        </a>
      </article>
    </section>
  );
}
