import React from "react";

type HeaderProps = {
  mode: "command" | "gui";
  onModeChange: (mode: "command" | "gui") => void;
};

export default function Header({ mode, onModeChange }: HeaderProps): React.ReactNode {
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

  return (
    <header className="system-header">
      <div className="system-brand">
        <strong>{mode === "command" ? "Human68k" : "SX-WINDOW"}</strong>
        <small>{mode === "command" ? "version 3.02" : "version 3.1"}</small>
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
          aria-pressed={mode === "command"}
          onClick={() => onModeChange("command")}
          title="F1キーでも切り替えられます"
        >
          <kbd>F1</kbd> COMMAND
        </button>
        <button
          type="button"
          aria-pressed={mode === "gui"}
          onClick={() => onModeChange("gui")}
          title="F2キーでも切り替えられます"
        >
          <kbd>F2</kbd> GUI
        </button>
      </div>
    </header>
  );
}
