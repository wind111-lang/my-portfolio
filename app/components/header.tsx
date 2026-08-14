import React from "react";

type HeaderProps = {
  mode: "command" | "gui";
  onModeChange: (mode: "command" | "gui") => void;
  disabled?: boolean;
};

export default function Header({ mode, onModeChange, disabled = false }: HeaderProps): React.ReactNode {
  const handleNavClick = (
    e: React.MouseEvent<HTMLAnchorElement>,
    sectionId: string
  ) => {
    e.preventDefault();
    const element = document.getElementById(sectionId);
    if (element) {
      element.scrollIntoView({ behavior: "smooth" });
    }
  };

  if (mode === "command") {
    const functionLabels = ["C1", "CU", "CA", "S1", "SU", "VOID", "NWL", "INS", "N&CU", "EOF"];

    return (
      <header className="human68k-command-bars">
        <div className="human68k-function-strip" aria-hidden="true">
          {functionLabels.map((label) => (
            <span key={label}><>{label}</></span>
          ))}
        </div>
        <div className="human68k-status-strip">
          <span>Ready</span>
          <span>A: PORTFOLIO</span>
          <button
            type="button"
            disabled={disabled}
            aria-pressed="true"
            onClick={() => onModeChange("command")}
          >
            F1 COMMAND
          </button>
          <button
            type="button"
            disabled={disabled}
            aria-pressed="false"
            onClick={() => onModeChange("gui")}
          >
            F2 SX-WINDOW
          </button>
          <span>POWER</span>
        </div>
      </header>
    );
  }

  return (
    <header className="system-header">
      <div className="system-brand">
        <strong>SX-WINDOW</strong>
        <small>version 3.1</small>
      </div>
      <nav className="desktop-menu" aria-label="メインナビゲーション">
        <ul className="system-nav">
          {[
            ["profile", "PROFILE"],
            ["career", "CAREER"],
            ["tech", "TECH"],
            ["blog", "BLOG"],
            ["speak", "SPEAK"],
          ].map(([id, label]) => (
            <li key={id}>
              <a href={`#${id}`} onClick={(e) => handleNavClick(e, id)}>
                {label}
              </a>
            </li>
          ))}
        </ul>
      </nav>
      <div className="mode-switcher" aria-label="表示モード">
        <button
          type="button"
          disabled={disabled}
          aria-pressed="false"
          onClick={() => onModeChange("command")}
          title="F1キーでも切り替えられます"
        >
          <kbd>F1</kbd> COMMAND
        </button>
        <button
          type="button"
          disabled={disabled}
          aria-pressed="true"
          onClick={() => onModeChange("gui")}
          title="F2キーでも切り替えられます"
        >
          <kbd>F2</kbd> GUI
        </button>
      </div>
    </header>
  );
}
