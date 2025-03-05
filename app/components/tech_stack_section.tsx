import React from "react";
import { FaReact, FaNodeJs } from "react-icons/fa";

export default function TechStackSection(): React.ReactNode {
  return (
    <section id="tech" className="py-8">
      <h2 className="text-3xl font-semibold mb-4 dark:text-gray-200">技術スタック</h2>
      <div className="flex gap-4 text-3xl">
        <a
          href="https://reactjs.org"
          target="_blank"
          rel="noopener noreferrer"
          className="text-gray-800 dark:text-gray-200 hover:text-blue-500"
        >
          <FaReact title="React" />
        </a>
        <a
          href="https://nodejs.org"
          target="_blank"
          rel="noopener noreferrer"
          className="text-gray-800 dark:text-gray-200 hover:text-blue-500"
        >
          <FaNodeJs title="Node.js" />
        </a>
        {/* 必要に応じて他の技術アイコンも追加 */}
      </div>
    </section>
  );
}
