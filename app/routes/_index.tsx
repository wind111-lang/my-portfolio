import React, { useState } from "react";

export default function SpotifyFloatingEmbed(): React.ReactNode {
  const [visible, setVisible] = useState(true);
  if (!visible) return null;

  return (
    <div
      className="
      fixed left-6 bottom-6 z-[1000] bg-white rounded-xl shadow-2xl p-2 min-w-max
    "
    >
      {/* スマホだけ表示するボタン */}
      <button
        className="
          hidden
          absolute top-2 right-2
          bg-white border-none rounded-xl shadow
          text-lg px-2 z-10 cursor-pointer
          sm:block
        "
        // Tailwindはbreakpointはmin-widthなので、独自CSSで下で調整
        onClick={() => setVisible(false)}
        aria-label="閉じる"
      >
        ×
      </button>
      <iframe
        className="rounded-xl border-0 w-full min-w-[180px] max-w-[600px] block"
        src="https://open.spotify.com/embed/playlist/7LMXraj2azy5FpVVrGdCGw?utm_source=generator"
        width="100%"
        height="152"
        allow="clipboard-write; encrypted-media; fullscreen; picture-in-picture"
        loading="lazy"
        allowFullScreen
        title="Spotify playlist embed"
      />
      {/* メディアクエリで600px以下だけボタン表示 */}
      <style>{`
        @media (max-width: 600px) {
          .absolute.top-2.right-2.sm\\:block {
            display: block !important;
          }
          .rounded-xl.border-0.w-full {
            min-width: 80px !important;
            max-width: 100vw !important;
          }
        }
      `}</style>
    </div>
  );
}
