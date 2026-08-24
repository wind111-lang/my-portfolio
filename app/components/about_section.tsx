import React from "react";
import { FaTwitter, FaGithub } from "react-icons/fa";

export default function AboutSection(): React.ReactNode {
  return (
    <section id="about" className="hero-panel">
      <h2 className="x-titlebar"><span>A:\PORTFOLIO\ABOUT.X</span><span>□</span></h2>
      <div className="hero-window-body">
        <div className="hero-screen">
          <div className="boot-line">HUMAN.SYS READY</div>
          <p className="hero-kicker">SOFTWARE ENGINEER</p>
          <h1>
            <span>TSUTSUI</span>
            <span>SHOTA</span>
          </h1>
          <p className="hero-copy">
            Building reliable software,
            <br /> one command at a time.
          </p>
          <p className="destiny-hint">
            YOUR CHOICES DECIDE YOUR <strong>DESTINY</strong>.
          </p>
          <div className="command-line" aria-hidden="true">
            A:\&gt; show portfolio<span className="cursor">_</span>
          </div>
        </div>
        <div className="identity-card">
          <div className="portrait-frame">
            <img
              src={`${import.meta.env.BASE_URL}images/74229075.jpeg`}
              alt="筒井 翔太のプロフィール写真"
            />
            <span>USER_ID: WIND111</span>
          </div>
          <div className="social-links" aria-label="ソーシャルリンク">
            <a
              href="https://twitter.com/tsuttsun_wind"
              target="_blank"
              rel="noopener noreferrer"
            >
              <FaTwitter aria-hidden="true" /> X / TWITTER
            </a>
            <a
              href="https://github.com/wind111-lang"
              target="_blank"
              rel="noopener noreferrer"
            >
              <FaGithub aria-hidden="true" /> GITHUB
            </a>
          </div>
        </div>
      </div>
    </section>
  );
}
