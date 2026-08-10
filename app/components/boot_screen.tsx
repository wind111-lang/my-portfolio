import React, { useEffect, useState } from "react";

type BootScreenProps = {
  onComplete: () => void;
};

const SPLASH_DURATION_MS = 5000;
const BLACKOUT_DURATION_MS = 2000;

export default function BootScreen({ onComplete }: BootScreenProps): React.ReactNode {
  const [stage, setStage] = useState<"splash" | "blackout">("splash");

  useEffect(() => {
    const timers: number[] = [];
    const schedule = (callback: () => void, delay: number) => {
      timers.push(window.setTimeout(callback, delay));
    };

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    window.scrollTo({ top: 0, left: 0 });

    const blockInput = (event: KeyboardEvent) => {
      event.preventDefault();
      event.stopPropagation();
    };
    window.addEventListener("keydown", blockInput, true);

    schedule(() => setStage("blackout"), SPLASH_DURATION_MS);
    schedule(onComplete, SPLASH_DURATION_MS + BLACKOUT_DURATION_MS);

    return () => {
      timers.forEach((timer) => window.clearTimeout(timer));
      window.removeEventListener("keydown", blockInput, true);
      document.body.style.overflow = previousOverflow;
    };
  }, [onComplete]);

  return (
    <main className="x68k-boot-screen" aria-label="システム起動中" aria-busy="true">
      {stage === "splash" ? (
        <section className="x68k-custom-splash" aria-live="polite">
          <div className="x68k-splash-card">
            <div className="x68k-paw-mark" aria-hidden="true">
              <span className="toe toe-1" />
              <span className="toe toe-2" />
              <span className="toe toe-3" />
              <span className="toe toe-4" />
              <span className="pad" />
            </div>
            <div className="x68k-splash-copy">
              <div className="x68k-splash-brand">
                <span>PERSONAL WORKSTATION</span>
                <span className="x68k-splash-logo">
                  <span className="x68k-splash-logo-crop">
                    <img
                      src={`${import.meta.env.BASE_URL}images/x68000-logo.jpg`}
                      alt="SHARP X68000"
                      width={285}
                      height={100}
                    />
                  </span>
                  <small>PORTFOLIO</small>
                  <span className="x68k-splash-clock">- HIGH CLOCK -</span>
                </span>
              </div>
              <dl className="x68k-splash-specs">
                <div><dt>HOSTNAME:</dt><dd>PORTFOLIO</dd></div>
                <div><dt>OWNER:</dt><dd>SHOTA TSUTSUI</dd></div>
                <div><dt>OS:</dt><dd>Human68k Version 3.02</dd></div>
              </dl>
              <p className="x68k-splash-motto">POWER TO MAKE YOUR DREAM COME TRUE.</p>
              <p className="x68k-splash-secret">FOREVER X68000 (FOREVERX68K) !</p>
            </div>
          </div>
        </section>
      ) : (
        <section className="x68k-boot-blackout" aria-label="画面暗転中" />
      )}
    </main>
  );
}
