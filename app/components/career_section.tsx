import React from "react";

export default function CareerSection(): React.ReactNode {
  return (
    <section id="career" className="x-window career-window">
      <h2 className="x-titlebar"><span>CAREER.LOG</span><span>□</span></h2>
      <div className="timeline">
        <article>
          <time>2016.04 — 2020.03</time>
          <a href="https://www.daido-h.ed.jp/" target="_blank" rel="noopener noreferrer">
            Daido University Daido Senior High School
          </a>
        </article>
        <article>
          <time>2020.04 — 2024.03</time>
          <a href="https://www.ait.ac.jp/" target="_blank" rel="noopener noreferrer">
            Aichi Institute of Technology
          </a>
        </article>
        <article className="current-job">
          <time>2024.04 — NOW</time>
          <a href="https://prtimes.co.jp/" target="_blank" rel="noopener noreferrer">
            PR TIMES Inc.
          </a>
        </article>
      </div>
    </section>
  );
}
