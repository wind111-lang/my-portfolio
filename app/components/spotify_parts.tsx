import React, { useState } from "react";

export default function SpotifyFloatingEmbed(): React.ReactNode {
  const [visible, setVisible] = useState(true);

  if (!visible) return null;

  return (
    <>
      <style>
        {`
          .spotify-float-iframe {
            width: 50% !important;
            min-width: 180px;
            max-width: 600px;
            border-radius: 16px;
          }
          .spotify-close-btn {
            display: none;
            position: absolute;
            top: 8px;
            right: 8px;
            background: #fff;
            border: none;
            border-radius: 12px;
            box-shadow: 0 2px 6px rgba(0,0,0,0.08);
            font-size: 18px;
            padding: 0 8px;
            z-index: 10;
            cursor: pointer;
          }
          @media (max-width: 600px) {
            .spotify-float-iframe {
              width: 50% !important;
              min-width: 80px !important;
            }
            .spotify-close-btn {
              display: block;
            }
          }
        `}
      </style>
      <div
        style={{
          position: "fixed",
          left: "24px",
          bottom: "24px",
          zIndex: 1000,
          borderRadius: "16px",
          boxShadow: "0 8px 24px rgba(0,0,0,0.2)",
          background: "white",
          padding: "8px",
          minWidth: "max-content",
        }}
      >
        {/* スマホだけ表示される閉じるボタン */}
        <button
          className="spotify-close-btn"
          onClick={() => setVisible(false)}
          aria-label="閉じる"
        >
          ×
        </button>
        <iframe
          className="spotify-float-iframe"
          src="https://open.spotify.com/embed/playlist/7LMXraj2azy5FpVVrGdCGw?utm_source=generator"
          height="152"
          allow="clipboard-write; encrypted-media; fullscreen; picture-in-picture"
          loading="lazy"
          allowFullScreen
          title="Spotify playlist embed"
        />
      </div>
    </>
  );
}
