import React from "react";

export default function ProfileSection(): React.ReactNode {
  return (
    <section id="profile" className="x-window profile-window">
      <h2 className="x-titlebar"><span>PROFILE.DAT</span><span>□</span></h2>
      <ul className="data-list">
        <li><span>BIRTHDAY</span><strong>2001.06.28</strong></li>
        <li><span>ORIGIN</span><strong>AICHI, JP</strong></li>
        <li><span>LOCATION</span><strong>TOKYO, JP</strong></li>
        <li><span>ROLE</span><strong>SOFTWARE ENGINEER</strong></li>
      </ul>
    </section>
  );
}
