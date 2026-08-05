import React, { useEffect, useRef, useState } from "react";

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

const opmPhrase = [
  { offset: 0, frequency: 261.63, duration: 0.34, pan: -0.45 },
  { offset: 0.12, frequency: 329.63, duration: 0.34, pan: -0.15 },
  { offset: 0.24, frequency: 392, duration: 0.34, pan: 0.15 },
  { offset: 0.36, frequency: 523.25, duration: 0.42, pan: 0.45 },
  { offset: 0.76, frequency: 659.25, duration: 0.18, pan: 0.35 },
  { offset: 0.96, frequency: 587.33, duration: 0.18, pan: 0.15 },
  { offset: 1.16, frequency: 783.99, duration: 0.4, pan: 0.45 },
  { offset: 1.64, frequency: 261.63, duration: 0.58, pan: -0.55 },
  { offset: 1.64, frequency: 329.63, duration: 0.58, pan: -0.2 },
  { offset: 1.64, frequency: 392, duration: 0.58, pan: 0.2 },
  { offset: 1.64, frequency: 523.25, duration: 0.58, pan: 0.55 },
  { offset: 2.3, frequency: 392, duration: 0.16, pan: -0.25 },
  { offset: 2.48, frequency: 523.25, duration: 0.16, pan: 0 },
  { offset: 2.66, frequency: 783.99, duration: 0.5, pan: 0.25 },
] as const;

function createOpmVoice(
  context: AudioContext,
  destination: AudioNode,
  frequency: number,
  startAt: number,
  duration: number,
  pan: number,
): OscillatorNode[] {
  const operators = Array.from({ length: 4 }, () => context.createOscillator());
  const modulationDepths = Array.from({ length: 3 }, () => context.createGain());
  const envelope = context.createGain();
  const panner = context.createStereoPanner();

  operators.forEach((operator, index) => {
    operator.type = "sine";
    operator.frequency.setValueAtTime(frequency * (index + 1), startAt);
  });

  modulationDepths[2].gain.setValueAtTime(frequency * 0.8, startAt);
  modulationDepths[1].gain.setValueAtTime(frequency * 1.35, startAt);
  modulationDepths[0].gain.setValueAtTime(frequency * 2.1, startAt);

  operators[3].connect(modulationDepths[2]);
  modulationDepths[2].connect(operators[2].frequency);
  operators[2].connect(modulationDepths[1]);
  modulationDepths[1].connect(operators[1].frequency);
  operators[1].connect(modulationDepths[0]);
  modulationDepths[0].connect(operators[0].frequency);

  envelope.gain.setValueAtTime(0.0001, startAt);
  envelope.gain.exponentialRampToValueAtTime(0.11, startAt + 0.012);
  envelope.gain.exponentialRampToValueAtTime(0.055, startAt + Math.min(0.11, duration * 0.35));
  envelope.gain.exponentialRampToValueAtTime(0.0001, startAt + duration);
  panner.pan.setValueAtTime(pan, startAt);

  operators[0].connect(envelope);
  envelope.connect(panner);
  panner.connect(destination);

  operators.forEach((operator) => {
    operator.start(startAt);
    operator.stop(startAt + duration + 0.02);
  });

  return operators;
}

function playOpmJingle(context: AudioContext): () => void {
  const startAt = context.currentTime + 0.025;
  const master = context.createGain();
  const compressor = context.createDynamicsCompressor();
  const oscillators: OscillatorNode[] = [];
  let disconnected = false;

  master.gain.setValueAtTime(0.42, startAt);
  compressor.threshold.setValueAtTime(-20, startAt);
  compressor.knee.setValueAtTime(12, startAt);
  compressor.ratio.setValueAtTime(8, startAt);
  compressor.attack.setValueAtTime(0.003, startAt);
  compressor.release.setValueAtTime(0.15, startAt);
  master.connect(compressor);
  compressor.connect(context.destination);

  opmPhrase.forEach((note) => {
    oscillators.push(
      ...createOpmVoice(
        context,
        master,
        note.frequency,
        startAt + note.offset,
        note.duration,
        note.pan,
      ),
    );
  });

  const disconnectGraph = () => {
    if (disconnected) return;
    disconnected = true;
    master.disconnect();
    compressor.disconnect();
  };
  const cleanupTimer = window.setTimeout(disconnectGraph, 3400);

  return () => {
    window.clearTimeout(cleanupTimer);
    const stopAt = context.currentTime + 0.025;
    master.gain.cancelScheduledValues(context.currentTime);
    master.gain.setTargetAtTime(0.0001, context.currentTime, 0.008);
    oscillators.forEach((oscillator) => {
      try {
        oscillator.stop(stopAt);
      } catch {
        // すでに再生を終えたオペレーターは停止済みのため何もしない。
      }
    });
    window.setTimeout(disconnectGraph, 80);
  };
}

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
        <p>YM2151 (OPM) FM SOUND SOURCE TEST</p>
        <p>NOW PLAYING...</p>
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
      stopOpmRef.current = playOpmJingle(audioContext);
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
    <main className="terminal-screen" id="top" onClick={() => inputRef.current?.focus()}>
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
          autoFocus
        />
        <button type="submit">RETURN</button>
      </form>
      <p className="terminal-help" id="command-hint">HELP: コマンド一覧&nbsp;&nbsp; F1: COMMAND&nbsp;&nbsp; F2: SX-WINDOW</p>
    </main>
  );
}
