import React from "react";

export default function SpotifyFloatingEmbed(): React.ReactNode {
  return (
    <>
      <style>
        {`
            @media (max-width: 600px) {
              .spotify-float-iframe {
                width: 100vw !important;
                min-width: 0 !important;
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
          style={{ borderRadius: "16px", width: "50%" }}
          src="https://open.spotify.com/embed/playlist/7LMXraj2azy5FpVVrGdCGw?utm_source=generator&theme=0"
          width="50%"
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
