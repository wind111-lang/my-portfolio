import React from "react";

export default function SpotifyFloatingEmbed(): React.ReactNode {
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
          @media (max-width: 600px) {
            .spotify-float-iframe {
              width: 25% !important;
              min-width: 80px !important;
            }
          }
        `}
      </style>
      <div
        style={{
          position: "fixed",
          top: "24px",
          right: "24px",
          zIndex: 1000,
          borderRadius: "16px",
          boxShadow: "0 8px 24px rgba(0,0,0,0.2)",
          background: "white",
          padding: "8px",
        }}
      >
        <iframe
          className="spotify-float-iframe"
          src="https://open.spotify.com/embed/playlist/7LMXraj2azy5FpVVrGdCGw?utm_source=generator"
          height="152"
          frameBorder="0"
          allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture"
          loading="lazy"
          allowFullScreen
          title="Spotify playlist embed"
        />
      </div>
    </>
  );
}
