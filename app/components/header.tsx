import React from "react";

type HeaderProps = {
  mode: "command" | "gui";
  onModeChange: (mode: "command" | "gui") => void;
  disabled?: boolean;
};

export function X68000Mark(): React.ReactNode {
  const markPath = "M7 35 19 20l6 15H7ZM17 7h14l19 28H33L17 7ZM35 7h17L41 20 35 7Z";

  return (
    <svg className="x68000-mark" viewBox="0 0 58 44" aria-hidden="true">
      <path className="x68000-mark-edge" d={markPath} />
      <path className="x68000-mark-face" d={markPath} />
    </svg>
  );
}

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
        <span className="system-brand-mark"><X68000Mark /></span>
        <span className="system-brand-copy">
          <strong>SX-WINDOW</strong>
          <small>Version 3.1</small>
        </span>
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
      <div className="sx-header-tools">
        <span className="sx-header-status" aria-hidden="true">A: PORTFOLIO</span>
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
      </div>
    </header>
  );
}
