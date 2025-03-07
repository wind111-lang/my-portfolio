import React from "react";

export default function CareerSection(): React.ReactNode {
  return (
    <section id="career" className="py-8">
      <div className="flex flex-col items-left">
        <h2 className="text-3xl font-semibold mb-4 text-gray-800 dark:text-gray-200">
          Career
        </h2>
        <h5 className="text-1xl font-semibold mb-1 text-gray-800 dark:text-gray-200">
          2016.04 - 2020.03
        </h5>
        <a
          href="https://www.daido-h.ed.jp/"
          target="_blank"
          rel="noopener noreferrer"
          className="text-gray-800 dark:text-gray-200 hover:text-blue-500 dark:hover:text-blue-500"
        >
          Daido University Daido Senior High School
        </a>
        <h5 className="text-1xl font-semibold mb-1 text-gray-800 dark:text-gray-200">
          2020.04 - 2024.03
        </h5>
        <a
          href="https://www.ait.ac.jp/"
          target="_blank"
          rel="noopener noreferrer"
          className="text-gray-800 dark:text-gray-200 hover:text-blue-500 dark:hover:text-blue-500"
        >
          Aichi Institute of Technology
        </a>
        <h5 className="text-1xl font-semibold mb-1 text-gray-800 dark:text-gray-200">
          2024.04 - Now
        </h5>
        <a
          href="https://prtimes.co.jp/"
          target="_blank"
          rel="noopener noreferrer"
          className="text-gray-800 dark:text-gray-200 hover:text-blue-500 dark:hover:text-blue-500"
        >
          PR TIMES Inc.
        </a>
      </div>
    </section>
  );
}
