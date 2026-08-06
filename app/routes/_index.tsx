import React, { useEffect, useState } from "react";
import Header from "~/components/header";
import AboutSection from "~/components/about_section";
import ProfileSection from "~/components/profile_section";
import CareerSection from "~/components/career_section";
import TechStackSection from "~/components/tech_stack_section";
import BlogSection from "~/components/blog_section";
import Footer from "~/components/footer";
import ScrollToTop from "~/components/scroll_to_top";
import SpeakSection from "~/components/speak_section";
import CommandView from "~/components/command_view";
import BootScreen from "~/components/boot_screen";
import ShutdownScreen from "~/components/shutdown_screen";
import type { MetaFunction } from "@remix-run/node";

export const meta: MetaFunction = () => [
  { title: "Tsutsui Shota | Software Engineer" },
  {
    name: "description",
    content:
      "Software Engineer Tsutsui Shota のポートフォリオ。プロフィール、経歴、技術スタック、執筆・登壇情報を掲載しています。",
  },
  { property: "og:title", content: "Tsutsui Shota | Software Engineer" },
  {
    property: "og:description",
    content: "Human68k v3.02 / SX-WINDOW inspired portfolio.",
  },
  { property: "og:type", content: "website" },
  {
    property: "og:image",
    content: "https://wind111-lang.github.io/my-portfolio/og-v2.png",
  },
  { name: "twitter:card", content: "summary_large_image" },
  {
    name: "twitter:image",
    content: "https://wind111-lang.github.io/my-portfolio/og-v2.png",
  },
];

export default function Index(): React.ReactNode {
  const [mode, setMode] = useState<"command" | "gui">("command");
  const [startupPhase, setStartupPhase] = useState<"system" | "command" | "ready">("system");
  const [isShuttingDown, setIsShuttingDown] = useState(false);

  const beginCommandStartup = React.useCallback(() => {
    setStartupPhase("command");
  }, []);

  const completeStartup = React.useCallback(() => {
    setStartupPhase("ready");
  }, []);

  const beginShutdown = React.useCallback(() => {
    setIsShuttingDown(true);
  }, []);

  const completeShutdown = React.useCallback(() => {
    const isMobileDevice = window.matchMedia("(pointer: coarse)").matches
      || /Android|iPhone|iPad|iPod/i.test(navigator.userAgent);
    if (isMobileDevice) {
      window.location.assign(
        new URL(`${import.meta.env.BASE_URL}poweroff.html`, window.location.origin).href,
      );
      return;
    }
    window.location.assign("https://www.google.com/");
  }, []);

  const handleGuiShortcut = React.useCallback((
    event: React.MouseEvent<HTMLAnchorElement>,
    sectionId: string,
  ) => {
    event.preventDefault();
    document.getElementById(sectionId)?.scrollIntoView({ behavior: "smooth", block: "start" });
  }, []);

  useEffect(() => {
    const resetShutdownAfterHistoryRestore = () => {
      setIsShuttingDown(false);
    };

    window.addEventListener("pageshow", resetShutdownAfterHistoryRestore);
    return () => window.removeEventListener("pageshow", resetShutdownAfterHistoryRestore);
  }, []);

  useEffect(() => {
    if (startupPhase !== "ready" || isShuttingDown) return;

    const handleFunctionKey = (event: KeyboardEvent) => {
      if (event.key === "F1") {
        event.preventDefault();
        setMode("command");
      }
      if (event.key === "F2") {
        event.preventDefault();
        setMode("gui");
      }
    };

    window.addEventListener("keydown", handleFunctionKey);
    return () => window.removeEventListener("keydown", handleFunctionKey);
  }, [isShuttingDown, startupPhase]);

  if (startupPhase === "system") {
    return <BootScreen onComplete={beginCommandStartup} />;
  }

  if (isShuttingDown) {
    return <ShutdownScreen onComplete={completeShutdown} />;
  }

  return (
    <div className="site-shell" data-mode={mode}>
      <Header mode={mode} onModeChange={setMode} disabled={startupPhase !== "ready"} />
      <CommandView
        onModeChange={setMode}
        isInitializing={startupPhase === "command"}
        onInitializationComplete={completeStartup}
        isActive={mode === "command"}
        onShutdown={beginShutdown}
      />
      {mode === "gui" && (
        <div className="sx-workspace">
          <aside className="sx-icon-rail" aria-label="SX-WINDOW デスクトップ">
            <a href="#profile" onClick={(event) => handleGuiShortcut(event, "profile")}><span className="sx-drive-icon">A:</span><span>PROFILE</span></a>
            <a href="#tech" onClick={(event) => handleGuiShortcut(event, "tech")}><span className="sx-folder-icon" aria-hidden="true" /><span>TECH</span></a>
            <a href="#blog" onClick={(event) => handleGuiShortcut(event, "blog")}><span className="sx-file-icon" aria-hidden="true">T</span><span>ARTICLES</span></a>
            <button type="button" onClick={() => setMode("command")}>
              <span className="sx-terminal-icon" aria-hidden="true">A&gt;</span><span>COMMAND.X</span>
            </button>
          </aside>
          <main className="desktop-grid" id="top">
            <AboutSection />
            <ProfileSection />
            <CareerSection />
            <TechStackSection />
            <BlogSection />
            <SpeakSection />
          </main>
        </div>
      )}
      <Footer />
      <ScrollToTop />
    </div>
  );
}
