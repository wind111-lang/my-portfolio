import React, { useEffect, useState } from "react";

type ShutdownScreenProps = {
  onComplete: () => void;
};

type ShutdownStage = "unloading" | "halted" | "poweroff";

const shutdownMessages = [
  "A:\\>EXIT",
  "",
  "Stopping YM2151 (OPM) + MSM6258 SOUND SYSTEM...",
  "Closing SX-WINDOW...",
  "Writing command history...",
  "PORTFOLIO DEVICE DRIVER version 1.01 unloaded",
  "History DRIVER version 1.10 unloaded",
  "All device drivers have been stopped.",
] as const;

const blockedEvents = [
  "keydown",
  "keyup",
  "keypress",
  "pointerdown",
  "pointerup",
  "click",
  "dblclick",
  "contextmenu",
  "wheel",
  "touchstart",
  "touchmove",
] as const;

export default function ShutdownScreen({ onComplete }: ShutdownScreenProps): React.ReactNode {
  const [stage, setStage] = useState<ShutdownStage>("unloading");
  const [visibleMessageCount, setVisibleMessageCount] = useState(1);

  useEffect(() => {
    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const scale = reducedMotion ? 0.35 : 1;
    const timers: number[] = [];
    const schedule = (callback: () => void, delay: number) => {
      timers.push(window.setTimeout(callback, delay * scale));
    };
    const blockInput = (event: Event) => {
      event.preventDefault();
      event.stopImmediatePropagation();
    };
    const eventOptions: AddEventListenerOptions = { capture: true, passive: false };

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    window.scrollTo({ top: 0, left: 0 });
    blockedEvents.forEach((eventName) => {
      window.addEventListener(eventName, blockInput, eventOptions);
    });

    shutdownMessages.slice(1).forEach((_, index) => {
      schedule(() => setVisibleMessageCount(index + 2), 240 + index * 235);
    });
    schedule(() => setStage("halted"), 2350);
    schedule(() => setStage("poweroff"), 3050);
    schedule(onComplete, 4050);

    return () => {
      timers.forEach((timer) => window.clearTimeout(timer));
      blockedEvents.forEach((eventName) => {
        window.removeEventListener(eventName, blockInput, eventOptions);
      });
      document.body.style.overflow = previousOverflow;
    };
  }, [onComplete]);

  return (
    <main
      className="x68k-shutdown-screen"
      data-stage={stage}
      aria-label="システム終了中"
      aria-busy="true"
    >
      {stage === "unloading" && (
        <section className="x68k-shutdown-console" aria-live="assertive" aria-atomic="false">
          {shutdownMessages.slice(0, visibleMessageCount).map((message, index) => (
            message
              ? <p key={`${index}-${message}`}>{message}</p>
              : <br key={`space-${index}`} />
          ))}
          <span className="x68k-boot-cursor" aria-hidden="true" />
        </section>
      )}

      {stage === "halted" && (
        <section className="x68k-system-halted" role="status">
          <strong>SYSTEM HALTED</strong>
          <span>All drives stopped.</span>
        </section>
      )}

      {stage === "poweroff" && (
        <section className="x68k-poweroff" role="status">
          <span className="x68k-poweroff-beam" aria-hidden="true" />
          <strong>POWER OFF</strong>
        </section>
      )}

      {stage === "unloading" && (
        <>
          <div className="x68k-drive-status" aria-hidden="true">
            <span className="is-active" />
            <small>FDD 0</small>
          </div>
          <p
            className="x68k-boot-status"
            role="status"
            aria-label="システム終了中。入力は無効です。"
          >
            SYSTEM SHUTTING DOWN...
          </p>
        </>
      )}
    </main>
  );
}
