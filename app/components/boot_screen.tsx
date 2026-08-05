import React, { useEffect, useState } from "react";

type BootScreenProps = {
  onComplete: () => void;
};

const systemMessages = [
  "Printer driver version 1.00",
  "RS-232C driver version 2.02",
  "Floating Point Package version 2.03 (IEEE format)",
  "Japanese Front-end Processor ASK68k version 3.02",
  "Console/Graphic IOCS version 1.50",
  "History DRIVER version 1.10",
  "Command version 3.00",
  "PORTFOLIO DEVICE DRIVER version 1.01",
] as const;

export default function BootScreen({ onComplete }: BootScreenProps): React.ReactNode {
  const [stage, setStage] = useState<"splash" | "drivers">("splash");
  const [visibleMessageCount, setVisibleMessageCount] = useState(0);

  useEffect(() => {
    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const scale = reducedMotion ? 0.3 : 1;
    const timers: number[] = [];
    const schedule = (callback: () => void, delay: number) => {
      timers.push(window.setTimeout(callback, delay * scale));
    };

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    window.scrollTo({ top: 0, left: 0 });

    const blockInput = (event: KeyboardEvent) => {
      event.preventDefault();
      event.stopPropagation();
    };
    window.addEventListener("keydown", blockInput, true);

    schedule(() => setStage("drivers"), 2500);
    systemMessages.forEach((_, index) => {
      schedule(() => setVisibleMessageCount(index + 1), 2680 + index * 150);
    });
    schedule(onComplete, 4350);

    return () => {
      timers.forEach((timer) => window.clearTimeout(timer));
      window.removeEventListener("keydown", blockInput, true);
      document.body.style.overflow = previousOverflow;
    };
  }, [onComplete]);

  return (
    <main className="x68k-boot-screen" aria-label="システム起動中">
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
                </span>
              </div>
              <p className="x68k-splash-clock">- HIGH CLOCK -</p>
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
        <section className="x68k-boot-console" aria-live="polite" aria-atomic="false">
          {systemMessages.slice(0, visibleMessageCount).map((message, index) => (
            message
              ? <p key={`${index}-${message}`}>{message}</p>
              : <br key={`space-${index}`} />
          ))}
          <span className="x68k-boot-cursor" aria-hidden="true" />
        </section>
      )}

      {stage === "drivers" && (
        <>
          <div className="x68k-drive-status" aria-hidden="true">
            <span className="is-active" />
            <small>FDD 0</small>
          </div>
          <p
            className="x68k-boot-status"
            role="status"
            aria-label="システム起動中。入力は無効です。"
          >
            SYSTEM STARTING...
          </p>
        </>
      )}
    </main>
  );
}
