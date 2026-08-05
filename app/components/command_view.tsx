import React, { useEffect, useRef, useState } from "react";
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
};

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

export default function CommandView({ onModeChange }: CommandViewProps): React.ReactNode {
  const [input, setInput] = useState("");
  const [history, setHistory] = useState<HistoryEntry[]>([
    { id: 0, command: "DIR", output: "dir" },
  ]);
  const nextId = useRef(1);
  const inputRef = useRef<HTMLInputElement>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const stopOpmRef = useRef<(() => void) | null>(null);

  useEffect(() => {
    if (window.matchMedia("(hover: hover) and (pointer: fine)").matches) {
      inputRef.current?.focus({ preventScroll: true });
    }

    return () => {
      stopOpmRef.current?.();
      if (audioContextRef.current?.state !== "closed") {
        void audioContextRef.current?.close();
      }
    };
  }, []);

  const runOpmCommand = () => {
    const context = audioContextRef.current?.state === "closed"
      ? null
      : audioContextRef.current;
    const audioContext = context ?? new AudioContext({ latencyHint: "interactive" });

    audioContextRef.current = audioContext;

    const startPlayback = () => {
      stopOpmRef.current?.();
      stopOpmRef.current = playOpmTrack(audioContext);
    };

    if (audioContext.state === "suspended") {
      void audioContext.resume().then(startPlayback);
      return;
    }

    startPlayback();
  };

  const runCommand = (rawCommand: string) => {
    const command = rawCommand.trim().replace(/\s+/g, " ").toUpperCase();
    setInput("");

    if (!command) return;
    if (command === "CLS") {
      setHistory([]);
      inputRef.current?.focus();
      return;
    }
    if (command === "GUI" || command === "SX") {
      onModeChange("gui");
      return;
    }
    if (command === "OPM") {
      runOpmCommand();
    }

    setHistory((entries) => [
      ...entries,
      {
        id: nextId.current++,
        command,
        output: commandAliases[command] ?? "error",
      },
    ]);
    inputRef.current?.focus();
  };

  return (
    <main className="terminal-screen" id="top">
      <div className="boot-message" aria-label="Human68k 起動メッセージ">
        <p>Human68k for X680x0 version 3.02</p>
        <p>Copyright 1987-93 SHARP/Hudson</p>
        <br />
        <p>Command version 3.00</p>
        <p>PORTFOLIO DEVICE DRIVER version 1.01</p>
        <p>プロフィール情報を表示できます</p>
      </div>

      <div className="command-history" aria-live="polite">
        {history.map((entry) => (
          <section className="command-entry" key={entry.id}>
            <p className="entered-command"><span>A:\&gt;</span>{entry.command}</p>
            <CommandOutput output={entry.output} command={entry.command} runCommand={runCommand} />
          </section>
        ))}
      </div>

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
          onChange={(event) => setInput(event.target.value)}
          autoComplete="off"
          autoCapitalize="characters"
          spellCheck={false}
          aria-describedby="command-hint"
        />
        <button type="submit">RETURN</button>
      </form>
      <p className="terminal-help" id="command-hint">HELP: コマンド一覧&nbsp;&nbsp; F1: COMMAND&nbsp;&nbsp; F2: SX-WINDOW</p>
    </main>
  );
}
