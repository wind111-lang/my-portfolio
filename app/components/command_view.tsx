import React, { useEffect, useRef, useState } from "react";
import { playDestinyTrack } from "~/lib/destiny_player";
import { playForeverX68000Track } from "~/lib/forever_x68000_player";
import { playOpmTrack } from "~/lib/opm_player";
import { playStrollingPlayerTrack } from "~/lib/opm2_player";
import {
  playKarinkaTrack,
  playKatyushaTrack,
  playKorobushkaTrack,
  playTechnotrisTrack,
} from "~/lib/tetris_track_player";

const articles = [
  ["GoオンリーでGUI上からQRコード読み取りをしてみた", "https://qiita.com/wind111-lang/items/af7e3fadeb1c71673cda"],
  ["Pythonで簡単に経路探索をする", "https://zenn.dev/wind111/articles/4cc15edad10508"],
  ["BigQuery Data Transfersをエンジニア全員に対して実行可能にした話", "https://developers.prtimes.com/2024/09/02/execute-bg-data-transfers/"],
  ["PHPUnitでよく使うassertion", "https://qiita.com/wind111-lang/items/a93e243ed2e359ec30cc"],
  ["PHPでAWS SDKのテストをMockする", "https://developers.prtimes.com/2025/02/18/mock-aws-sdk-in-php/"],
  ["Amazon FSx for NetApp ONTAPで手動バックアップおよびリストアを行うTips", "https://developers.prtimes.com/2025/06/24/backup-and-restore-in-amazon-fsx-for-netapp-ontap/"],
  ["PR TIMESのOpenSearchをバージョンアップしました", "https://developers.prtimes.com/2025/10/01/version-up-prtimes-opensearch/"],
  ["メール到達性を支える、プレスリリース内URLのドメイン評価の仕組み", "https://developers.prtimes.com/2026/05/13/press-release-url-evaluation-domain/"],
] as const;

type OutputName =
  | "dir"
  | "help"
  | "profile"
  | "career"
  | "tech"
  | "articles"
  | "speak"
  | "destiny"
  | "forever"
  | "troika"
  | "strolling"
  | "korobushka"
  | "karinka"
  | "katyusha"
  | "technotris"
  | "version"
  | "error";

type HistoryEntry = {
  id: number;
  command: string;
  output: OutputName;
};

type CommandViewProps = {
  onModeChange: (mode: "command" | "gui") => void;
  isInitializing: boolean;
  onInitializationComplete: () => void;
  isActive: boolean;
  onMusicPlaybackStart: () => void;
  onSystemExit: (action: "shutdown" | "reboot") => void;
};

const startupMessageGroups = [
  [
    "Human68k for X680x0 version 3.02",
    "Copyright 1987-93 SHARP/Hudson",
  ],
  [
    "PRINTER DRIVER for X68000 version 1.00",
    "PRN/LPT のファイル名でプリンターに印字可能です",
  ],
  [
    "RS-232C DRIVER for X68000 version 2.02",
    "AUX0 から AUX5 のファイル名で通信が可能です",
  ],
  [
    "浮動小数点演算パッケージ for X680x0 version 2.03",
    "（IEEEフォーマット）",
  ],
  [
    "日本語フロントプロセッサ ASK68K for X68000 version 3.02",
    "Copyright 1987-94 SHARP Corp./ACCESS CO.,LTD.",
  ],
  [
    "Music Device Driver for X68000 version 1.00",
    "Copyright 1992 by SHARP/SAN/Luvex",
    "OPM のデバイス名でミュージックデータの演奏が可能です",
    "PCM のデバイス名で録音・再生が可能です",
    "トラックバッファに 180Kバイトを確保しました",
    "PCMのバッファに 64Kバイトを確保しました",
  ],
  [
    "X68k FD driver extention version 1.00 Copyright 1993 SHARP/Hudson",
    "拡張ドライブで 2DD(640KB/720KB)・2HD(1.44MB) の読み書きが可能です",
  ],
  [
    "Console/Graphic IOCS Version 1.50",
    "Copyright 1990,91,92,93 SHARP",
  ],
  [
    "ヒストリ DRIVER for X68000 version 1.10",
    "ヒストリが使用できます",
  ],
  [
    "PORTFOLIO DEVICE DRIVER version 1.01",
    "プロフィール情報を表示できます",
  ],
  [
    "Command version 3.00",
    "F1: COMMAND / F2: GUI (SX-WINDOW) でポートフォリオ画面を切り替えられます",
  ],
] as const;

const STARTUP_MESSAGE_START_MS = 100;
const STARTUP_MESSAGE_INTERVAL_MS = 340;
const STARTUP_MESSAGES_COMPLETE_MS = STARTUP_MESSAGE_START_MS
  + (startupMessageGroups.length - 1) * STARTUP_MESSAGE_INTERVAL_MS;
const INITIAL_DIRECTORY_DELAY_MS = STARTUP_MESSAGES_COMPLETE_MS + 180;
const INITIALIZATION_COMPLETE_MS = INITIAL_DIRECTORY_DELAY_MS + 650;

const commandAliases: Record<string, OutputName> = {
  "?": "help",
  HELP: "help",
  DIR: "dir",
  "DIR A:\\": "dir",
  WHOAMI: "profile",
  PROFILE: "profile",
  "TYPE PROFILE.DAT": "profile",
  CAREER: "career",
  "TYPE CAREER.LOG": "career",
  TECH: "tech",
  "DIR TECH": "tech",
  "DIR A:\\TECH": "tech",
  BLOG: "articles",
  ARTICLES: "articles",
  "DIR ARTICLES": "articles",
  "DIR A:\\ARTICLES": "articles",
  SPEAK: "speak",
  "TYPE SPEAK.LOG": "speak",
  DESTINY: "destiny",
  FOREVERX68000: "forever",
  FOREVERX68K: "forever",
  OPM: "korobushka",
  OPM2: "strolling",
  OPM3: "technotris",
  OPM4: "karinka",
  OPM5: "troika",
  OPM6: "katyusha",
  TROIKA: "troika",
  "STROLLING PLAYER": "strolling",
  STROLLINGPLAYER: "strolling",
  KOROBUSHKA: "korobushka",
  PEDDLER: "korobushka",
  KARINKA: "karinka",
  KALINKA: "karinka",
  KATYUSHA: "katyusha",
  KATHUSHA: "katyusha",
  CELEBRATION2: "katyusha",
  "CELEBRATION 2": "katyusha",
  TECHNOTRIS: "technotris",
  TECHNOTORIS: "technotris",
  VER: "version",
};

const opmTrackPlayers: Record<string, typeof playOpmTrack> = {
  OPM: playKorobushkaTrack,
  KOROBUSHKA: playKorobushkaTrack,
  PEDDLER: playKorobushkaTrack,
  OPM2: playStrollingPlayerTrack,
  "STROLLING PLAYER": playStrollingPlayerTrack,
  STROLLINGPLAYER: playStrollingPlayerTrack,
  OPM3: playTechnotrisTrack,
  TECHNOTRIS: playTechnotrisTrack,
  TECHNOTORIS: playTechnotrisTrack,
  OPM4: playKarinkaTrack,
  KARINKA: playKarinkaTrack,
  KALINKA: playKarinkaTrack,
  OPM5: playOpmTrack,
  TROIKA: playOpmTrack,
  OPM6: playKatyushaTrack,
  KATYUSHA: playKatyushaTrack,
  KATHUSHA: playKatyushaTrack,
  CELEBRATION2: playKatyushaTrack,
  "CELEBRATION 2": playKatyushaTrack,
};

const opmTrackFiles = {
  korobushka: "MUSIC1.DAT",
  strolling: "MUSIC2.DAT",
  technotris: "MUSIC3.DAT",
  karinka: "MUSIC4.DAT",
  troika: "MUSIC5.DAT",
  katyusha: "MUSIC6.DAT",
} as const;

function CommandOutput({
  output,
  command,
  runCommand,
}: {
  output: OutputName;
  command: string;
  runCommand: (command: string) => void;
}): React.ReactNode {
  if (output === "dir") {
    return (
      <div className="terminal-output root-directory">
        <p>A:\ のディレクトリ</p>
        <div className="directory-list" aria-label="ポートフォリオのファイル一覧">
          <button type="button" onClick={() => runCommand("TYPE PROFILE.DAT")}><span>PROFILE</span><span>DAT</span><span>507</span><time>26-08-07</time><time>0:00:00</time></button>
          <button type="button" onClick={() => runCommand("TYPE CAREER.LOG")}><span>CAREER</span><span>LOG</span><span>1,024</span><time>26-08-07</time><time>0:00:02</time></button>
          <button type="button" onClick={() => runCommand("DIR TECH")}><span>TECH</span><span>&lt;DIR&gt;</span><span>6</span><time>26-08-07</time><time>0:00:04</time></button>
          <button type="button" onClick={() => runCommand("DIR ARTICLES")}><span>ARTICLES</span><span>&lt;DIR&gt;</span><span>8</span><time>26-08-07</time><time>0:00:06</time></button>
          <button type="button" onClick={() => runCommand("TYPE SPEAK.LOG")}><span>SPEAK</span><span>LOG</span><span>1,337</span><time>26-08-07</time><time>0:00:08</time></button>
        </div>
        <p className="file-count">3 file(s)&nbsp;&nbsp; 2 dir(s)</p>
        <p className="dir-hint">ファイル名を選択するか、HELPでコマンド一覧を表示できます。</p>
      </div>
    );
  }

  if (output === "help") {
    return (
      <div className="terminal-output help-output">
        <p>使用できるコマンド:</p>
        <dl>
          <div><dt><span>DIR</span><span>A:\</span></dt><dd>ルートのファイル一覧を表示</dd></div>
          <div><dt><span>DIR</span><span>TECH</span></dt><dd>技術スタックを表示</dd></div>
          <div><dt><span>DIR</span><span>ARTICLES</span></dt><dd>執筆記事を表示</dd></div>
          <div><dt><span>TYPE</span><span>PROFILE.DAT</span></dt><dd>プロフィールを表示</dd></div>
          <div><dt><span>TYPE</span><span>CAREER.LOG</span></dt><dd>経歴を表示</dd></div>
          <div><dt><span>TYPE</span><span>SPEAK.LOG</span></dt><dd>登壇情報を表示</dd></div>
          <div><dt><span>GUI</span><span /></dt><dd>SX-WINDOWへ切り替え</dd></div>
          <div><dt><span>VER</span><span /></dt><dd>システムのバージョンを表示</dd></div>
          <div><dt><span>OPM</span><span /></dt><dd>？？？？？？</dd></div>
          <div><dt><span>OPM2</span><span /></dt><dd>？？？？？？</dd></div>
          <div><dt><span>OPM3</span><span /></dt><dd>？？？？？？</dd></div>
          <div><dt><span>OPM4</span><span /></dt><dd>？？？？？？</dd></div>
          <div><dt><span>OPM5</span><span /></dt><dd>？？？？？？</dd></div>
          <div><dt><span>OPM6</span><span /></dt><dd>？？？？？？</dd></div>
          <div><dt><span>CLS</span><span /></dt><dd>画面をクリア</dd></div>
          <div><dt><span>SHUTDOWN</span><span /></dt><dd>システムを終了</dd></div>
          <div><dt><span>REBOOT</span><span /></dt><dd>システムを再起動</dd></div>
          <div><dt><span>HELP</span><span>/ ?</span></dt><dd>この一覧を表示</dd></div>
        </dl>
      </div>
    );
  }

  if (output === "profile") {
    return (
      <div className="terminal-output identity-output">
        <p><strong>TSUTSUI SHOTA</strong> / SOFTWARE ENGINEER</p>
        <p>BIRTHDAY&nbsp; 2001.06.28</p>
        <p>ORIGIN&nbsp;&nbsp;&nbsp; AICHI, JP</p>
        <p>LOCATION&nbsp; TOKYO, JP</p>
        <p>
          LINK&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;
          <a href="https://github.com/wind111-lang" target="_blank" rel="noopener noreferrer">GITHUB</a>
          &nbsp;/&nbsp;
          <a href="https://twitter.com/tsuttsun_wind" target="_blank" rel="noopener noreferrer">X</a>
        </p>
      </div>
    );
  }

  if (output === "career") {
    return (
      <div className="terminal-output terminal-table">
        <p><time>2016.04-2020.03</time><a href="https://www.daido-h.ed.jp/" target="_blank" rel="noopener noreferrer">Daido University Daido Senior High School</a></p>
        <p><time>2020.04-2024.03</time><a href="https://www.ait.ac.jp/" target="_blank" rel="noopener noreferrer">Aichi Institute of Technology</a></p>
        <p><time>2024.04-NOW&nbsp;&nbsp;&nbsp;</time><a href="https://prtimes.co.jp/" target="_blank" rel="noopener noreferrer">PR TIMES Inc.</a></p>
      </div>
    );
  }

  if (output === "tech") {
    return (
      <div className="terminal-output dir-grid">
        {[
          ["PHP.X", "https://www.php.net/"],
          ["GO.X", "https://go.dev/"],
          ["PYTHON.X", "https://python.org/"],
          ["REACT.X", "https://react.dev/"],
          ["DOCKER.X", "https://docker.com/"],
          ["AWS.X", "https://aws.amazon.com/"],
        ].map(([label, href]) => (
          <a key={label} href={href} target="_blank" rel="noopener noreferrer">{label}</a>
        ))}
      </div>
    );
  }

  if (output === "articles") {
    return (
      <div className="terminal-output command-articles">
        {articles.map(([title, href], index) => (
          <a key={href} href={href} target="_blank" rel="noopener noreferrer">
            <span>{String(index + 1).padStart(2, "0")}.TXT</span>
            <span>{title}</span>
          </a>
        ))}
        <p className="file-count">8 file(s)</p>
      </div>
    );
  }

  if (output === "speak") {
    return (
      <div className="terminal-output">
        <a
          className="talk-command"
          href="https://fortee.jp/phpcon-fukuoka-2025/proposal/739e5ee1-e3a0-4dfa-a33f-cc84613006e5"
          target="_blank"
          rel="noopener noreferrer"
        >
          [PHP Conference Fukuoka 2025]<br />
          ゼロタウンタイムでミドルウェアのバージョンアップを実現した手法と課題
        </a>
      </div>
    );
  }

  if (output in opmTrackFiles) {
    const fileName = opmTrackFiles[output as keyof typeof opmTrackFiles];
    return (
      <div className="terminal-output">
        <p>YM2151 (OPM) SOUND SYSTEM</p>
        <p>NOW PLAYING... {fileName}</p>
      </div>
    );
  }

  if (output === "forever") {
    return (
      <div className="terminal-output">
        <p>YM2151 (OPM) + MSM6258 SOUND SYSTEM</p>
        <p>NOW PLAYING... FOREVER.DAT</p>
      </div>
    );
  }

  if (output === "destiny") {
    return (
      <div className="terminal-output">
        <p>YM2151 (OPM) + MSM6258 SOUND SYSTEM</p>
        <p>NOW PLAYING... DESTINY.DAT</p>
      </div>
    );
  }

  if (output === "version") {
    return <div className="terminal-output"><p>Human68k version 3.02 / PORTFOLIO.SYS version 1.01</p></div>;
  }

  return (
    <div className="terminal-output command-error">
      <p>コマンドまたはファイル名が違います: {command}</p>
      <p>HELP と入力すると、使用できるコマンドを確認できます。</p>
    </div>
  );
}

export default function CommandView({
  onModeChange,
  isInitializing,
  onInitializationComplete,
  isActive,
  onMusicPlaybackStart,
  onSystemExit,
}: CommandViewProps): React.ReactNode {
  const [input, setInput] = useState("");
  const [inputHistory, setInputHistory] = useState<string[]>([]);
  const [inputHistoryIndex, setInputHistoryIndex] = useState<number | null>(null);
  const [visibleStartupGroupCount, setVisibleStartupGroupCount] = useState(0);
  const [showInitialDirectory, setShowInitialDirectory] = useState(!isInitializing);
  const [history, setHistory] = useState<HistoryEntry[]>([
    { id: 0, command: "DIR", output: "dir" },
  ]);
  const nextId = useRef(1);
  const inputRef = useRef<HTMLInputElement>(null);
  const startupEndRef = useRef<HTMLDivElement>(null);
  const inputDraftRef = useRef("");
  const audioContextRef = useRef<AudioContext | null>(null);
  const stopMusicRef = useRef<(() => void) | null>(null);

  const scrollInputIntoView = React.useCallback(() => {
    window.requestAnimationFrame(() => {
      const inputElement = inputRef.current;
      if (!inputElement) return;

      const viewport = window.visualViewport;
      const visibleTop = viewport?.offsetTop ?? 0;
      const visibleBottom = visibleTop + (viewport?.height ?? window.innerHeight);
      const commandBarsTop = document
        .querySelector<HTMLElement>(".human68k-command-bars")
        ?.getBoundingClientRect().top ?? visibleBottom;
      const safeTop = visibleTop + 12;
      const safeBottom = Math.min(visibleBottom, commandBarsTop) - 12;
      const inputBounds = inputElement.getBoundingClientRect();

      if (inputBounds.bottom > safeBottom) {
        window.scrollBy({ top: inputBounds.bottom - safeBottom, behavior: "auto" });
      } else if (inputBounds.top < safeTop) {
        window.scrollBy({ top: inputBounds.top - safeTop, behavior: "auto" });
      }
    });
  }, []);

  useEffect(() => {
    if (
      isActive
      && !isInitializing
      && window.matchMedia("(hover: hover) and (pointer: fine)").matches
    ) {
      inputRef.current?.focus({ preventScroll: true });
    }
  }, [isActive, isInitializing]);

  useEffect(() => {
    if (!isActive || isInitializing) return;
    scrollInputIntoView();
  }, [history, input, isActive, isInitializing, scrollInputIntoView]);

  useEffect(() => {
    if (!isActive || !isInitializing) return;
    const frame = window.requestAnimationFrame(() => {
      startupEndRef.current?.scrollIntoView({ block: "end", behavior: "auto" });
    });
    return () => window.cancelAnimationFrame(frame);
  }, [visibleStartupGroupCount, showInitialDirectory, isActive, isInitializing]);

  useEffect(() => {
    if (!isActive || isInitializing || !window.visualViewport) return;
    const viewport = window.visualViewport;
    const handleViewportResize = () => {
      if (document.activeElement === inputRef.current) scrollInputIntoView();
    };
    viewport.addEventListener("resize", handleViewportResize);
    return () => viewport.removeEventListener("resize", handleViewportResize);
  }, [isActive, isInitializing, scrollInputIntoView]);

  useEffect(() => {
    if (!isInitializing) return;

    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const scale = reducedMotion ? 0.3 : 1;
    const timers: number[] = [];
    const schedule = (callback: () => void, delay: number) => {
      timers.push(window.setTimeout(callback, delay * scale));
    };

    startupMessageGroups.forEach((_, index) => {
      schedule(
        () => setVisibleStartupGroupCount(index + 1),
        STARTUP_MESSAGE_START_MS + index * STARTUP_MESSAGE_INTERVAL_MS,
      );
    });
    schedule(() => setShowInitialDirectory(true), INITIAL_DIRECTORY_DELAY_MS);
    schedule(onInitializationComplete, INITIALIZATION_COMPLETE_MS);

    return () => timers.forEach((timer) => window.clearTimeout(timer));
  }, [isInitializing, onInitializationComplete]);

  useEffect(() => {
    return () => {
      stopMusicRef.current?.();
      if (audioContextRef.current?.state !== "closed") {
        void audioContextRef.current?.close();
      }
    };
  }, []);

  const runMusicCommand = (playTrack: typeof playOpmTrack) => {
    try {
      const context = audioContextRef.current?.state === "closed"
        ? null
        : audioContextRef.current;
      const audioContext = context ?? new AudioContext({ latencyHint: "playback" });

      audioContextRef.current = audioContext;

      const startPlayback = () => {
        onMusicPlaybackStart();
        stopMusicRef.current?.();
        stopMusicRef.current = playTrack(audioContext);
      };

      if (audioContext.state === "suspended") {
        void audioContext.resume().then(startPlayback);
        return;
      }

      startPlayback();
    } catch {
      // Web Audio非対応環境でもコマンド履歴とDAT名は表示する。
      stopMusicRef.current?.();
      stopMusicRef.current = null;
    }
  };

  const runCommand = (rawCommand: string) => {
    const command = rawCommand.trim().replace(/\s+/g, " ").toUpperCase();
    const resolvedCommand = command === "FOREVER X68000" ? "FOREVERX68000" : command;
    setInput("");
    setInputHistoryIndex(null);
    inputDraftRef.current = "";

    if (!command) return;
    setInputHistory((entries) => [...entries, command]);
    if (command === "CLS") {
      setHistory([]);
      inputRef.current?.focus();
      return;
    }
    if (command === "GUI" || command === "SX") {
      onModeChange("gui");
      return;
    }
    if (command === "SHUTDOWN" || command === "REBOOT") {
      stopMusicRef.current?.();
      stopMusicRef.current = null;
      onSystemExit(command === "REBOOT" ? "reboot" : "shutdown");
      return;
    }
    const opmTrackPlayer = opmTrackPlayers[command];
    if (opmTrackPlayer) {
      runMusicCommand(opmTrackPlayer);
    }
    if (command === "DESTINY") {
      runMusicCommand(playDestinyTrack);
    }
    if (resolvedCommand === "FOREVERX68000" || resolvedCommand === "FOREVERX68K") {
      runMusicCommand(playForeverX68000Track);
    }

    setHistory((entries) => [
      ...entries,
      {
        id: nextId.current++,
        command,
        output: commandAliases[resolvedCommand] ?? "error",
      },
    ]);
    inputRef.current?.focus();
  };

  const handleInputKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key !== "ArrowUp" && event.key !== "ArrowDown") return;
    if (inputHistory.length === 0) return;
    event.preventDefault();

    if (event.key === "ArrowUp") {
      if (inputHistoryIndex === null) inputDraftRef.current = input;
      const nextIndex = inputHistoryIndex === null
        ? inputHistory.length - 1
        : Math.max(0, inputHistoryIndex - 1);
      setInputHistoryIndex(nextIndex);
      setInput(inputHistory[nextIndex]);
      return;
    }

    if (inputHistoryIndex === null) return;
    const nextIndex = inputHistoryIndex + 1;
    if (nextIndex >= inputHistory.length) {
      setInputHistoryIndex(null);
      setInput(inputDraftRef.current);
      return;
    }
    setInputHistoryIndex(nextIndex);
    setInput(inputHistory[nextIndex]);
  };

  const displayedStartupGroupCount = isInitializing
    ? visibleStartupGroupCount
    : startupMessageGroups.length;
  const shouldShowInitialDirectory = !isInitializing || showInitialDirectory;

  return (
    <main className="terminal-screen" id="top" hidden={!isActive}>
      <div className="boot-message" aria-live="polite" aria-atomic="false">
        {startupMessageGroups.slice(0, displayedStartupGroupCount).map((group) => (
          <div className="boot-message-group" key={group[0]}>
            {group.map((message) => <p key={message}>{message}</p>)}
          </div>
        ))}
      </div>

      <div className="command-history" aria-live="polite">
        {shouldShowInitialDirectory && history.map((entry) => (
          <section className="command-entry" key={entry.id}>
            <p className="entered-command"><span>A&gt;</span>{entry.command}</p>
            <CommandOutput output={entry.output} command={entry.command} runCommand={runCommand} />
          </section>
        ))}
      </div>

      <div ref={startupEndRef} aria-hidden="true" />

      {!isInitializing && (
        <>
          <form
            className="terminal-input-row"
            onSubmit={(event) => {
              event.preventDefault();
              runCommand(input);
            }}
          >
            <label htmlFor="human68k-command">A&gt;</label>
            <input
              ref={inputRef}
              id="human68k-command"
              value={input}
              onChange={(event) => {
                const nextInput = event.target.value;
                setInput(nextInput);
                setInputHistoryIndex(null);
                inputDraftRef.current = nextInput;
              }}
              onKeyDown={handleInputKeyDown}
              onFocus={scrollInputIntoView}
              autoComplete="off"
              autoCapitalize="characters"
              enterKeyHint="go"
              spellCheck={false}
              aria-label="Human68k コマンド"
            />
            <button className="terminal-return-key" type="submit">RETURN</button>
          </form>
        </>
      )}
    </main>
  );
}
