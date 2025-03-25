import React from "react";
import { FaTwitter, FaGithub } from "react-icons/fa";

export default function AboutSection(): React.ReactNode {
  return (
    <section id="about" className="py-8 text-center">
      <h1 className="text-4xl font-bold mb-4 text-gray-800 dark:text-gray-200">
        Tsutsui Shota
      </h1>
      <img
        src="https://github.com/wind111-lang/my-portfolio/blob/main/app/images/74229075.jpeg"
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
        <iframe style="border-radius:12px" src="https://open.spotify.com/embed/playlist/7LMXraj2azy5FpVVrGdCGw?utm_source=generator" width="100%" height="352" frameBorder="0" allowfullscreen="" allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture" loading="lazy"></iframe>
      </div>
    </section>
  );
}
