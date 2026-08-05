import React from "react";
import { FaReact, FaPhp, FaPython, FaDocker, FaAws } from "react-icons/fa";
import { FaGolang } from "react-icons/fa6";

export default function TechStackSection(): React.ReactNode {
  const technologies = [
    ["https://www.php.net/", "PHP", <FaPhp key="php" />],
    ["https://go.dev/", "GO", <FaGolang key="go" />],
    ["https://python.org/", "PYTHON", <FaPython key="python" />],
    ["https://react.dev/", "REACT", <FaReact key="react" />],
    ["https://docker.com/", "DOCKER", <FaDocker key="docker" />],
    ["https://aws.amazon.com/", "AWS", <FaAws key="aws" />],
  ] as const;

  return (
    <section id="tech" className="x-window tech-window">
      <h2 className="x-titlebar"><span>TECH_STACK.X</span><span>□</span></h2>
      <div className="tech-grid">
        {technologies.map(([href, label, icon], index) => (
          <a key={label} href={href} target="_blank" rel="noopener noreferrer">
            <span className="tech-index">0{index + 1}</span>
            <span className="tech-icon" aria-hidden="true">{icon}</span>
            <strong>{label}</strong>
          </a>
        ))}
      </div>
    </section>
  );
}
