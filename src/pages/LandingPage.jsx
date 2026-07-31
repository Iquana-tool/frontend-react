import React from "react";
import {
  HeroSection,
  MissionSection,
  FeaturesSection,
  WorkflowSection,
  CTASection,
  Footer,
  features,
  capabilities,
  workflowSteps
} from "../components/landing";
import Navbar from "../components/Navbar";

const LandingPage = () => {
  return (
    /* Built from the same surface/text tokens as every other page, so it is
       never a special case that can fall out of sync with a theme — no
       separate light-pastel and dark-navy literal gradients to keep matched.
       The one ambient glow is `acS`, which already resolves per theme. */
    <div className="min-h-screen bg-app overflow-hidden">
      <Navbar />

      <div className="relative">
        <div className="absolute top-0 inset-x-0 h-[440px] bg-gradient-to-b from-acS to-transparent pointer-events-none" />
        <HeroSection />
      </div>

      <MissionSection />
      <FeaturesSection features={features} />
      <WorkflowSection workflowSteps={workflowSteps} capabilities={capabilities} />
      <CTASection />
      <Footer />
    </div>
  );
};

export default LandingPage;
