import React from "react";
import {
  FaReact,
  FaPhp,
  FaPython,
  FaDocker,
  FaAws,
} from "react-icons/fa";
import { FaGolang } from "react-icons/fa6";

export default function TechStackSection(): React.ReactNode {
  return (
    <section id="tech" className="py-8">
      <h2 className="text-3xl font-semibold mb-4 text-gray-800 dark:text-gray-200">
        Tech Stack
      </h2>
      <div className="flex gap-4 text-3xl">
        <a
          href="https://www.php.net/"
          target="_blank"
          rel="noopener noreferrer"
          className="text-gray-800 dark:text-gray-200 hover:text-blue-500"
        >
          <FaPhp title="PHP" />
        </a>
        <a
          href="https://go.dev/"
          target="_blank"
          rel="noopener noreferrer"
          className="text-gray-800 dark:text-gray-200 hover:text-blue-500"
        >
          <FaGolang title="Go" />
        </a>
        <a
          href="https://python.org/"
          target="_blank"
          rel="noopener noreferrer"
          className="text-gray-800 dark:text-gray-200 hover:text-blue-500"
        >
          <FaPython title="Python" />
        </a>
        <a
          href="https://reactjs.org/"
          target="_blank"
          rel="noopener noreferrer"
          className="text-gray-800 dark:text-gray-200 hover:text-blue-500"
        >
          <FaReact title="React" />
        </a>
        <a
          href="https://docker.com/"
          target="_blank"
          rel="noopener noreferrer"
          className="text-gray-800 dark:text-gray-200 hover:text-blue-500"
        >
          <FaDocker title="Docker" />
        </a>
        <a
          href="https://aws.amazon.com/"
          target="_blank"
          rel="noopener noreferrer"
          className="text-gray-800 dark:text-gray-200 hover:text-blue-500"
        >
          <FaAws title="AWS" />
        </a>
        {/* 必要に応じて他の技術アイコンも追加 */}
      </div>
    </section>
  );
}
