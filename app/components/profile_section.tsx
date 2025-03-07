import React from "react";

export default function ProfileSection(): React.ReactNode {
  return (
    <section id="profile" className="py-8">
      <h2 className="text-3xl font-semibold mb-4 text-gray-800 dark:text-gray-200">
        Profile
      </h2>
      <ul className="list-disc list-inside text-lg text-gray-800 dark:text-gray-200">
        <li>Birthday: 2001/06/28</li>
        <li>Born in : Aichi</li>
        <li>Live in : Tokyo</li>
      </ul>
    </section>
  );
}
