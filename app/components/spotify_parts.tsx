import React from "react";

export default function SpotifyFloatingEmbed(): React.ReactNode {
  return (
    <>
      <style>
        {`
          .spotify-float-iframe {
            width: 50vw;
            min-width: 180px;
            max-width: 600px;
          }
          @media (max-width: 600px) {
            .spotify-float-iframe {
              width: 25vw !important;
              min-width: 80px !important;
              left: 0 !important;
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
        }}
      >
        <iframe
          className="spotify-float-iframe"
          style={{ borderRadius: "16px" }}
          src="https://open.spotify.com/embed/playlist/7LMXraj2azy5FpVVrGdCGw?utm_source=generator&theme=0"
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
