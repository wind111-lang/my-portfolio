import React, { useEffect, useRef, useState } from "react";
import { playForeverX68000Track } from "~/lib/forever_x68000_player";
import { playOpmTrack } from "~/lib/opm_player";

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
  | "forever"
  | "opm"
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
  onShutdown: () => void;
};

const startupMessages = [
  "Human68k for X680x0 version 3.02",
  "Copyright 1987-93 SHARP/Hudson",
  "",
  "Command version 3.00",
  "PORTFOLIO DEVICE DRIVER version 1.01",
  "プロフィール情報を表示できます",
] as const;

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
  FOREVERX68000: "forever",
  FOREVERX68K: "forever",
  OPM: "opm",
  VER: "version",
};

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
          <button type="button" onClick={() => runCommand("TYPE PROFILE.DAT")}><span>PROFILE</span><span>DAT</span><span>507</span></button>
          <button type="button" onClick={() => runCommand("TYPE CAREER.LOG")}><span>CAREER</span><span>LOG</span><span>1,024</span></button>
          <button type="button" onClick={() => runCommand("DIR TECH")}><span>TECH</span><span>&lt;DIR&gt;</span><span>6</span></button>
          <button type="button" onClick={() => runCommand("DIR ARTICLES")}><span>ARTICLES</span><span>&lt;DIR&gt;</span><span>8</span></button>
          <button type="button" onClick={() => runCommand("TYPE SPEAK.LOG")}><span>SPEAK</span><span>LOG</span><span>1,337</span></button>
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
          <div><dt><span>CLS</span><span /></dt><dd>画面をクリア</dd></div>
          <div><dt><span>EXIT</span><span /></dt><dd>システムを終了</dd></div>
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

  if (output === "opm") {
    return (
      <div className="terminal-output">
        <p>YM2151 (OPM) + MSM6258 SOUND SYSTEM</p>
        <p>NOW PLAYING... MUSIC.DAT</p>
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
  onShutdown,
}: CommandViewProps): React.ReactNode {
  const [input, setInput] = useState("");
  const [inputHistory, setInputHistory] = useState<string[]>([]);
  const [inputHistoryIndex, setInputHistoryIndex] = useState<number | null>(null);
  const [visibleStartupMessageCount, setVisibleStartupMessageCount] = useState(0);
  const [showInitialDirectory, setShowInitialDirectory] = useState(!isInitializing);
  const [history, setHistory] = useState<HistoryEntry[]>([
    { id: 0, command: "DIR", output: "dir" },
  ]);
  const nextId = useRef(1);
  const inputRef = useRef<HTMLInputElement>(null);
  const inputDraftRef = useRef("");
  const terminalEndRef = useRef<HTMLDivElement>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const stopMusicRef = useRef<(() => void) | null>(null);

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
    terminalEndRef.current?.scrollIntoView({ block: "end", behavior: "auto" });
  }, [history, input, isActive, isInitializing]);

  useEffect(() => {
    if (!isInitializing) return;

    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const scale = reducedMotion ? 0.3 : 1;
    const timers: number[] = [];
    const schedule = (callback: () => void, delay: number) => {
      timers.push(window.setTimeout(callback, delay * scale));
    };

    startupMessages.forEach((_, index) => {
      schedule(() => setVisibleStartupMessageCount(index + 1), 120 + index * 155);
    });
    schedule(() => setShowInitialDirectory(true), 1250);
    schedule(onInitializationComplete, 1800);

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
    const context = audioContextRef.current?.state === "closed"
      ? null
      : audioContextRef.current;
    const audioContext = context ?? new AudioContext({ latencyHint: "playback" });

    audioContextRef.current = audioContext;

    const startPlayback = () => {
      stopMusicRef.current?.();
      stopMusicRef.current = playTrack(audioContext);
    };

    if (audioContext.state === "suspended") {
      void audioContext.resume().then(startPlayback);
      return;
    }

    startPlayback();
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
    if (command === "EXIT") {
      stopMusicRef.current?.();
      stopMusicRef.current = null;
      onShutdown();
      return;
    }
    if (command === "OPM") {
      runMusicCommand(playOpmTrack);
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

  const displayedStartupMessageCount = isInitializing
    ? visibleStartupMessageCount
    : startupMessages.length;
  const shouldShowInitialDirectory = !isInitializing || showInitialDirectory;

  return (
    <main className="terminal-screen" id="top" hidden={!isActive}>
      <div className="boot-message" aria-live="polite" aria-atomic="false">
        {startupMessages.slice(0, displayedStartupMessageCount).map((message, index) => (
          message
            ? <p key={`${index}-${message}`}>{message}</p>
            : <br key={`space-${index}`} />
        ))}
      </div>

      <div className="command-history" aria-live="polite">
        {shouldShowInitialDirectory && history.map((entry) => (
          <section className="command-entry" key={entry.id}>
            <p className="entered-command"><span>A:\&gt;</span>{entry.command}</p>
            <CommandOutput output={entry.output} command={entry.command} runCommand={runCommand} />
          </section>
        ))}
      </div>

      {!isInitializing && (
        <>
          <form
            className="terminal-input-row"
            onSubmit={(event) => {
              event.preventDefault();
              runCommand(input);
            }}
          >
            <label htmlFor="human68k-command">A:\&gt;</label>
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
              autoComplete="off"
              autoCapitalize="characters"
              spellCheck={false}
              aria-describedby="command-hint"
            />
            <button type="submit">RETURN</button>
          </form>
          <p className="terminal-help" id="command-hint">HELP: コマンド一覧&nbsp;&nbsp; F1: COMMAND&nbsp;&nbsp; F2: SX-WINDOW</p>
        </>
      )}
      <div ref={terminalEndRef} aria-hidden="true" />
    </main>
  );
}
