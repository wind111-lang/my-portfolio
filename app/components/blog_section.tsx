import React from "react";

export default function BlogSection(): React.ReactNode {
  return (
    <section id="blog" className="py-8">
      <h2 className="text-3xl font-semibold mb-4 text-gray-800 dark:text-gray-200">
        Blog
      </h2>
      <article className="flex flex-col gap-4">
        <a
          href="https://qiita.com/wind111-lang/items/af7e3fadeb1c71673cda"
          className="hover:text-blue-500 dark:hover:text-blue-500  text-gray-800 dark:text-gray-200"
        >
          <h3 className="text-2xl font-bold">
            GoオンリーでGUI上からQRコード読み取りをしてみた
          </h3>
          <p className="text-lg">
            GoでOpenCVとQtを利用して、QRコードを読み取る方法について紹介した記事です。初執筆。
          </p>
        </a>
        <a
          href="https://zenn.dev/wind111/articles/4cc15edad10508"
          className="hover:text-blue-500 dark:hover:text-blue-500 text-gray-800 dark:text-gray-200"
        >
          <h3 className="text-2xl font-bold">Pythonで簡単に経路探索をする</h3>
          <p className="text-lg">
            経路探索パッケージ OSMnx
            で経路を探索・可視化を行う方法について紹介した記事です。
          </p>
        </a>
        <a
          href="https://developers.prtimes.jp/2024/09/02/execute-bg-data-transfers/"
          className="hover:text-blue-500 dark:hover:text-blue-500  text-gray-800 dark:text-gray-200"
        >
          <h3 className="text-2xl font-bold">
            BigQuery Data Transfersをエンジニア全員に対して実行可能にした話
          </h3>
          <p className="text-lg">
            Data Transfersをエンジニアが利用可能にするためのTipsです。
          </p>
        </a>
        <a
          href="https://qiita.com/wind111-lang/items/a93e243ed2e359ec30cc"
          className="hover:text-blue-500 dark:hover:text-blue-500 text-gray-800 dark:text-gray-200"
        >
          <h3 className="text-2xl font-bold">PHPUnitでよく使うassertion</h3>
          <p className="text-lg">
            PHPのテストライブラリである PHPUnit でよく使用する
            assertionをまとめた記事です。
          </p>
        </a>
        <a
          href="https://developers.prtimes.jp/2025/02/18/mock-aws-sdk-in-php/"
          className="hover:text-blue-500 dark:hover:text-blue-500 text-gray-800 dark:text-gray-200"
        >
          <h3 className="text-2xl font-bold">PHPでAWS SDKのテストをMockする</h3>
          <p className="text-lg">
            PHPのモックライブラリである Mockery を利用してAWS
            S3のテストをMockする方法について紹介した記事です。
          </p>
        </a>
      </article>
    </section>
  );
}
