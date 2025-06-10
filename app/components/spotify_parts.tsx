import React, { useState } from "react";

// SVG: Spotify公式ロゴ（単色・緑色例）
const SpotifyIcon = () => (
  <svg viewBox="0 0 168 168" width="40" height="40" fill="#1DB954">
    <circle cx="84" cy="84" r="84" fill="#1DB954" />
    <path
      d="M123.9 118.6c-1.4 2.3-4.3 3-6.6 1.6-18-11.1-40.6-13.7-67.4-7.7-2.6 .6-5.2-1-5.8-3.5-.6-2.6 1-5.2 3.5-5.8 28.8-6.3 53.1-3.3 72.7 8.4 2.4 1.4 3.1 4.3 1.6 6.6zm8.8-19.7c-1.7 2.8-5.3 3.7-8.1 2-20.6-12.7-52.2-16.4-76.6-9.3-3.1 .9-6.4-.8-7.3-3.9-.9-3.1 .8-6.4 3.9-7.3 27.2-7.6 61.2-4.1 84.6 10.3 2.8 1.7 3.7 5.3 2 8.2zm10-21c-25-15-66.6-16.4-90.5-9.2-3.7 1.1-7.7-1-8.8-4.7-1.1-3.7 1-7.7 4.7-8.8 26.5-7.8 71.8-6.3 100.1 10 3.4 2 4.5 6.4 2.5 9.8-2 3.4-6.4 4.5-9.8 2.5z"
      fill="#fff"
    />
  </svg>
);

export default function SpotifyFloatingEmbed(): React.ReactNode {
  const [visible, setVisible] = useState(true);

  return (
    <>
      {visible ? (
        <div className="fixed top-6 right-6 z-[1000] bg-white rounded-xl shadow-2xl p-2 min-w-max">
          <button
            className="hidden absolute top-2 right-2 bg-white border-none rounded-xl shadow text-lg px-2 z-10 cursor-pointer
                       max-[600px]:block"
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
        </div>
      ) : (
        // アイコンも同じ位置に固定
        <button
          className="fixed top-6 right-6 z-[1000] bg-white rounded-full shadow-2xl p-2 flex items-center justify-center border border-gray-200"
          style={{ width: 56, height: 56 }}
          onClick={() => setVisible(true)}
          aria-label="Spotifyプレイヤーを再表示"
        >
          <SpotifyIcon />
        </button>
      )}
    </>
  );
}
