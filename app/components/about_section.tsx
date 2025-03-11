import React from "react";
import { FaTwitter, FaGithub } from "react-icons/fa";

export default function AboutSection(): React.ReactNode {
  return (
    <section id="about" className="py-8 text-center">
      <h1 className="text-4xl font-bold mb-4 text-gray-800 dark:text-gray-200">
        Tsutsui Shota
      </h1>
      <img
        src="https://github.com/wind111-lang/my-portfolio/blob/main/app/images/74229075.jpeg?raw=true"
        alt="profile-pic"
        className="w-72 h-72 rounded-full mx-auto mt-4"
      />
      <div className="mt-4 flex justify-center gap-4 text-2xl">
        <a
          href="https://twitter.com/tsuttsun_wind"
          target="_blank"
          rel="noopener noreferrer"
          className="text-gray-800 dark:text-gray-200 hover:text-blue-500 dark:hover:text-blue-500"
        >
          <FaTwitter />
        </a>
        <a
          href="https://github.com/wind111-lang"
          target="_blank"
          rel="noopener noreferrer"
          className="text-gray-800 dark:text-gray-200 hover:text-blue-500 dark:hover:text-blue-500"
        >
          <FaGithub />
        </a>
      </div>
    </section>
  );
}
