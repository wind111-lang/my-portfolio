import React from "react";
import { FaTwitter, FaGithub, FaEnvelope } from "react-icons/fa";

export default function Footer(): React.ReactNode {
  return (
    <footer className="system-footer">
      <div className="footer-prompt">
        <span>A:\PORTFOLIO&gt;</span>
        <span>© {new Date().getFullYear()} TSUTSUI SHOTA</span>
      </div>
      <div className="footer-links">
        <a
          href="https://twitter.com/tsuttsun_wind"
          target="_blank"
          rel="noopener noreferrer"
          aria-label="X / Twitter"
        >
          <FaTwitter />
        </a>
        <a
          href="https://github.com/wind111-lang"
          target="_blank"
          rel="noopener noreferrer"
          aria-label="GitHub"
        >
          <FaGithub />
        </a>
        <a
          href="mailto:windmill@pluslab.org"
          aria-label="メールを送る"
        >
          <FaEnvelope />
        </a>
      </div>
    </footer>
  );
}
