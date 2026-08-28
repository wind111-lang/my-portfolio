import React, { useEffect, useState } from "react";
import Header, { X68000Mark } from "~/components/header";
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
import PowerOnScreen from "~/components/power_on_screen";
import ShutdownScreen from "~/components/shutdown_screen";
import {
  BUBBLE_SYSTEM_MORNING_MUSIC_DURATION_SECONDS,
  playMorningMusic,
} from "~/lib/morning_music_player";
import { playThunderVFanfare } from "~/lib/fanfare";

export default function Index(): React.ReactNode {
  const [mode, setMode] = useState<"command" | "gui">("command");
  const [startupPhase, setStartupPhase] = useState<"power" | "system" | "command" | "ready">("power");
  const [systemExitAction, setSystemExitAction] = useState<"shutdown" | "reboot" | null>(null);
  const isPoweringOnRef = React.useRef(false);
  const bootAudioContextRef = React.useRef<AudioContext | null>(null);
  const stopBootMusicRef = React.useRef<(() => void) | null>(null);
  const closeBootAudioTimerRef = React.useRef<number | null>(null);
  const guiAudioContextRef = React.useRef<AudioContext | null>(null);
  const stopGuiFanfareRef = React.useRef<(() => void) | null>(null);

  const stopBootAudio = React.useCallback(() => {
    if (closeBootAudioTimerRef.current !== null) {
      window.clearTimeout(closeBootAudioTimerRef.current);
      closeBootAudioTimerRef.current = null;
    }
    stopBootMusicRef.current?.();
    stopBootMusicRef.current = null;
    const context = bootAudioContextRef.current;
    bootAudioContextRef.current = null;
    if (context && context.state !== "closed") {
      void context.close();
    }
  }, []);

  const stopGuiAudio = React.useCallback(() => {
    stopGuiFanfareRef.current?.();
    stopGuiFanfareRef.current = null;
    const context = guiAudioContextRef.current;
    guiAudioContextRef.current = null;
    if (context && context.state !== "closed") {
      void context.close();
    }
  }, []);

  const playGuiFanfare = React.useCallback(() => {
    try {
      const existingContext = guiAudioContextRef.current;
      const context = existingContext?.state === "closed"
        ? new AudioContext({ latencyHint: "interactive" })
        : existingContext ?? new AudioContext({ latencyHint: "interactive" });
      guiAudioContextRef.current = context;

      const startPlayback = () => {
        stopGuiFanfareRef.current?.();
        stopGuiFanfareRef.current = playThunderVFanfare(context);
      };

      if (context.state === "suspended") {
        void context.resume().then(startPlayback).catch(stopGuiAudio);
      } else {
        startPlayback();
      }
    } catch {
      // Web Audio非対応環境でも緑のXは通常のボタンとして操作できる。
    }
  }, [stopGuiAudio]);

  const powerOn = React.useCallback(() => {
    if (isPoweringOnRef.current) return;
    isPoweringOnRef.current = true;

    const showSplash = () => setStartupPhase("system");
    try {
      const context = new AudioContext({ latencyHint: "playback" });
      bootAudioContextRef.current = context;

      const startBootMusic = () => {
        if (bootAudioContextRef.current !== context || context.state === "closed") return;
        stopBootMusicRef.current = playMorningMusic(context);
        closeBootAudioTimerRef.current = window.setTimeout(
          stopBootAudio,
          (BUBBLE_SYSTEM_MORNING_MUSIC_DURATION_SECONDS + 0.8) * 1000,
        );
      };

      if (context.state === "suspended") {
        // Mobile browsers only unlock Web Audio from a completed user gesture.
        // Resume inside the tap/click handler, then schedule the track once active.
        void context.resume().then(startBootMusic).catch(stopBootAudio);
      } else {
        startBootMusic();
      }
      showSplash();
    } catch {
      showSplash();
    }
  }, [stopBootAudio]);

  const beginCommandStartup = React.useCallback(() => {
    setStartupPhase("command");
  }, []);

  const completeStartup = React.useCallback(() => {
    setStartupPhase("ready");
  }, []);

  const beginSystemExit = React.useCallback((action: "shutdown" | "reboot") => {
    stopBootAudio();
    setSystemExitAction(action);
  }, [stopBootAudio]);

  const completeSystemExit = React.useCallback(() => {
    if (systemExitAction === "reboot") {
      isPoweringOnRef.current = false;
      setMode("command");
      setStartupPhase("power");
      setSystemExitAction(null);
      return;
    }

    const isMobileDevice = window.matchMedia("(pointer: coarse)").matches
      || /Android|iPhone|iPad|iPod/i.test(navigator.userAgent);
    if (isMobileDevice) {
      window.location.replace("https://www.google.com/");
      return;
    }
    window.location.assign("https://www.google.com/");
  }, [systemExitAction]);

  const handleGuiShortcut = React.useCallback((
    event: React.MouseEvent<HTMLAnchorElement>,
    sectionId: string,
  ) => {
    event.preventDefault();
    document.getElementById(sectionId)?.scrollIntoView({ behavior: "smooth", block: "start" });
  }, []);

  useEffect(() => {
    const resetShutdownAfterHistoryRestore = () => {
      stopBootAudio();
      isPoweringOnRef.current = false;
      setMode("command");
      setStartupPhase("power");
      setSystemExitAction(null);
    };

    window.addEventListener("pageshow", resetShutdownAfterHistoryRestore);
    return () => window.removeEventListener("pageshow", resetShutdownAfterHistoryRestore);
  }, [stopBootAudio]);

  useEffect(() => () => {
    stopBootAudio();
    stopGuiAudio();
  }, [stopBootAudio, stopGuiAudio]);

  useEffect(() => {
    if (mode === "gui") {
      window.scrollTo({ top: 0, left: 0, behavior: "auto" });
    }
  }, [mode]);

  useEffect(() => {
    if (startupPhase !== "ready" || systemExitAction !== null) return;

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
  }, [startupPhase, systemExitAction]);

  if (startupPhase === "power") {
    return <PowerOnScreen onPowerOn={powerOn} />;
  }

  if (startupPhase === "system") {
    return <BootScreen onComplete={beginCommandStartup} />;
  }

  if (systemExitAction !== null) {
    return (
      <ShutdownScreen
        command={systemExitAction === "reboot" ? "REBOOT" : "SHUTDOWN"}
        onComplete={completeSystemExit}
      />
    );
  }

  return (
    <div className="site-shell" data-mode={mode}>
      <Header mode={mode} onModeChange={setMode} disabled={startupPhase !== "ready"} />
      <CommandView
        onModeChange={setMode}
        isInitializing={startupPhase === "command"}
        onInitializationComplete={completeStartup}
        isActive={mode === "command"}
        onMusicPlaybackStart={stopBootAudio}
        onSystemExit={beginSystemExit}
      />
      {mode === "gui" && (
        <div className="sx-workspace">
          <aside className="sx-icon-rail" aria-label="SX-WINDOW デスクトップ">
            <button
              type="button"
              className="sx-rail-logo"
              onClick={playGuiFanfare}
              aria-label="サンダーVのVファンファーレとボーナスBGMを鳴らす"
              title="V FANFARE / VBB"
            >
              <X68000Mark />
            </button>
            <a href="#profile" onClick={(event) => handleGuiShortcut(event, "profile")}><span className="sx-drive-icon"><small>2HD</small>A:</span><span>PROFILE</span></a>
            <a href="#tech" onClick={(event) => handleGuiShortcut(event, "tech")}><span className="sx-drive-icon sx-drive-b"><small>2HD</small>B:</span><span>TECH</span></a>
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
      {mode === "gui" && (
        <>
          <Footer />
          <ScrollToTop />
        </>
      )}
    </div>
  );
}
