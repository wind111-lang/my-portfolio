import React from "react";
import Header from "~/components/header";
import AboutSection from "~/components/about_section";
import ProfileSection from "~/components/profile_section";
import CareerSection from "~/components/career_section";
import TechStackSection from "~/components/tech_stack_section";
import BlogSection from "~/components/blog_section";
import Footer from "~/components/footer";
import ScrollToTop from "~/components/scroll_to_top";
import SpotifyFloatingEmbed from "~/components/spotify_parts";
import SpeakSection from "~/components/speak_section";

export default function Index(): React.ReactNode {
  return (
    <>
      <Header />
      <main className="max-w-4xl mx-auto p-4">
        <SpotifyFloatingEmbed />
        <AboutSection />
        <ProfileSection />
        <CareerSection />
        <TechStackSection />
        <BlogSection />
        <SpeakSection />
      </main>
      <Footer />
      <ScrollToTop />
    </>
  );
}
