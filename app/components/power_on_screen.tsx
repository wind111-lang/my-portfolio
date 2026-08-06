import React, { useCallback, useEffect, useRef } from "react";

type PowerOnScreenProps = {
  onPowerOn: () => void;
};

export default function PowerOnScreen({ onPowerOn }: PowerOnScreenProps): React.ReactNode {
  const activatedRef = useRef(false);
  const activate = useCallback(() => {
    if (activatedRef.current) return;
    activatedRef.current = true;
    onPowerOn();
  }, [onPowerOn]);

  useEffect(() => {
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    window.scrollTo({ top: 0, left: 0 });

    const handleKeyDown = (event: KeyboardEvent) => {
      event.preventDefault();
      event.stopPropagation();
      activate();
    };
    window.addEventListener("keydown", handleKeyDown, true);

    return () => {
      window.removeEventListener("keydown", handleKeyDown, true);
      document.body.style.overflow = previousOverflow;
    };
  }, [activate]);

  return (
    <main
      className="x68k-power-on-screen"
      aria-label="X68000 PORTFOLIO 電源待機中"
      onPointerDown={(event) => {
        event.preventDefault();
        activate();
      }}
    >
      <button type="button" className="x68k-power-switch" onClick={activate}>
        <span aria-hidden="true" />
        <strong>POWER ON</strong>
        <small>CLICK / TAP / PRESS ANY KEY</small>
      </button>
    </main>
  );
}
