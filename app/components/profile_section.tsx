import React from "react";

export default function ProfileSection(): React.ReactNode {
  return (
    <section id="profile" className="py-8">
      <h2 className="text-3xl font-semibold mb- dark:text-gray-200">プロフィール</h2>
      <ul className="list-disc list-inside text-lg text-gray-800 dark:text-gray-200">
        <li>生年月日: 1990/01/01</li>
        <li>出身地: 愛知</li>
        <li>学歴: 卒業</li>
      </ul>
    </section>
  );
}
