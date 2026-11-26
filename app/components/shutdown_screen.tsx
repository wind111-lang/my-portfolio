import React, { useEffect, useState } from "react";

type ShutdownScreenProps = {
  command: "SHUTDOWN" | "REBOOT";
  onComplete: () => void;
  soundFinished: Promise<void> | null;
};

const shutdownMessages = [
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

export default function ShutdownScreen({ command, onComplete, soundFinished }: ShutdownScreenProps): React.ReactNode {
  const [isFadingOut, setIsFadingOut] = useState(false);
  const [visibleMessageCount, setVisibleMessageCount] = useState(1);
  const isRebooting = command === "REBOOT";
  const messages = [`A:\\>${command}`, ...shutdownMessages];

  useEffect(() => {
    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const scale = reducedMotion && isRebooting ? 0.35 : 1;
    const timers: number[] = [];
    let finished = false;
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

    shutdownMessages.forEach((_, index) => {
      schedule(() => setVisibleMessageCount(index + 2), 240 + index * 235);
    });
    const completeAfter = 3350;
    schedule(() => setIsFadingOut(true), completeAfter - (reducedMotion ? 120 : 1000));
    schedule(() => {
      if (!soundFinished) {
        onComplete();
        return;
      }

      const finish = () => {
        if (finished) return;
        finished = true;
        onComplete();
      };
      // バックグラウンドで音声が中断されても、暗転したまま待ち続けない。
      schedule(finish, 2500);
      void soundFinished.then(() => {
        if (!finished) schedule(finish, 550);
      });
    }, completeAfter);

    return () => {
      finished = true;
      timers.forEach((timer) => window.clearTimeout(timer));
      blockedEvents.forEach((eventName) => {
        window.removeEventListener(eventName, blockInput, eventOptions);
      });
      document.body.style.overflow = previousOverflow;
    };
  }, [isRebooting, onComplete, soundFinished]);

  return (
    <main
      className="x68k-shutdown-screen"
      data-fading={isFadingOut}
      aria-label={isRebooting ? "システム再起動中" : "システム終了中"}
      aria-busy="true"
    >
      <section className="x68k-shutdown-console" aria-live="assertive" aria-atomic="false">
        {messages.slice(0, visibleMessageCount).map((message, index) => (
          message
            ? <p key={`${index}-${message}`}>{message}</p>
            : <br key={`space-${index}`} />
        ))}
        <span className="x68k-boot-cursor" aria-hidden="true" />
      </section>
      <div className="x68k-drive-status" aria-hidden="true">
        <span className="is-active" />
        <small>FDD 0</small>
      </div>
      <p
        className="x68k-boot-status"
        role="status"
        aria-label={`${isRebooting ? "システム再起動中" : "システム終了中"}。入力は無効です。`}
      >
        {isRebooting ? "SYSTEM REBOOTING..." : "SYSTEM SHUTTING DOWN..."}
      </p>
    </main>
  );
}
