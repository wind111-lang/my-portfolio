import React from "react";
import { FaTwitter, FaGithub, FaEnvelope } from "react-icons/fa";

export default function Footer(): React.ReactNode {
  return (
    <footer className="py-4 bg-white dark:bg-gray-900">
      <div className="flex justify-center gap-4 text-2xl">
        <a
          href="https://twitter.com/tsuttsun_wind"
          target="_blank"
          rel="noopener noreferrer"
          className="text-gray-800 dark:text-gray-200 hover:text-blue-500"
        >
          <FaTwitter />
        </a>
        <a
          href="https://github.com/wind111-lang"
          target="_blank"
          rel="noopener noreferrer"
          className="text-gray-800 dark:text-gray-200 hover:text-blue-500"
        >
          <FaGithub />
        </a>
        <a
          href="mailto:windmill@pluslab.org"
          className="text-gray-800 dark:text-gray-200 hover:text-blue-500"
        >
          <FaEnvelope />
        </a>
      </div>
    </footer>
  );
}
