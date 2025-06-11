mport React, { useEffect, useState } from "react";Add commentMore actions
import { FaSun, FaMoon } from "react-icons/fa";

export default function Header(): React.ReactNode {
  const [darkMode, setDarkMode] = useState<boolean>(false);
  useEffect(() => {
    const storedTheme = localStorage.getItem("theme");
    if (storedTheme) {
      const isDark = storedTheme === "dark";
      setDarkMode(isDark);
      if (isDark) {
        document.documentElement.classList.add("dark");
      } else {
        document.documentElement.classList.remove("dark");
      }
    } else if (window.matchMedia("(prefers-color-scheme: dark)").matches) {
      setDarkMode(true);
      document.documentElement.classList.add("dark");
    }
  }, []);

  const toggleDarkMode = () => {
    const newDarkMode = !darkMode;
    setDarkMode(newDarkMode);
    if (newDarkMode) {
      document.documentElement.classList.add("dark");
      localStorage.setItem("theme", "dark");
    } else {
      document.documentElement.classList.remove("dark");
      localStorage.setItem("theme", "light");
    }
  };


  const handleNavClick = (
    e: React.MouseEvent<HTMLAnchorElement>,
    sectionId: string
  ) => {
    e.preventDefault();
    const element = document.getElementById(sectionId);
    if (element) {
      element.scrollIntoView({ behavior: "smooth" });
    }
  };


  return (
    <header className="shadow py-4 md:py-4 dark:bg-gray-900">
      <nav className="relative max-w-7xl mx-auto px-2 md:py-4 bg-white dark:bg-gray-900">
        <ul className="flex justify-center gap-2 md:gap-4 list-none">
          <li>
            <a
              href="#profile"
              onClick={(e) => handleNavClick(e, "profile")}
              className="text-gray-800 dark:text-gray-200 hover:text-blue-500 dark:hover:text-blue-500"
            >
              Profile
            </a>
          </li>
          <li>
            <a
              href="#career"
              onClick={(e) => handleNavClick(e, "career")}
              className="text-gray-800 dark:text-gray-200 hover:text-blue-500 dark:hover:text-blue-500"
            >
              Career
            </a>
          </li>
          <li>
            <a
              href="#tech"
              onClick={(e) => handleNavClick(e, "tech")}
              className="text-gray-800 dark:text-gray-200 hover:text-blue-500 dark:hover:text-blue-500"
            >
              Tech Stack
            </a>
          </li>
          <li>
            <a
              href="#blog"
              onClick={(e) => handleNavClick(e, "blog")}
              className="text-gray-800 dark:text-gray-200 hover:text-blue-500 dark:hover:text-blue-500"
            >
              Blog
            </a>
          </li>
        </ul>
        <button
          onClick={toggleDarkMode}
          className="absolute left-2 top-1/2 transform -translate-y-1/2 text-gray-800 dark:text-gray-200"
          aria-label="Toggle Dark Mode"

        >
          {darkMode ? <FaSun /> : <FaMoon />}
        </button>
      </nav>
    </header>
  );
}
