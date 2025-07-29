import React from "react";
import {
  HeroSection,
  MissionSection,
  FeaturesSection,
  WorkflowSection,
  CTASection,
  Footer,
  ParallaxBackground,
  useParallaxScroll,
  features,
  capabilities,
  workflowSteps
} from "../components/landing";
import Navbar from "../components/Navbar";

const LandingPage = () => {
  const scrollY = useParallaxScroll();

  return (
    <>
      <style jsx>{`
        .animate-gradient {
          background-size: 300% 300%;
          animation: gradient 6s ease infinite;
        }
        
        @keyframes gradient {
          0% { background-position: 0% 50%; }
          50% { background-position: 100% 50%; }
          100% { background-position: 0% 50%; }
        }
        
        .animation-delay-1000 {
          animation-delay: 1s;
        }
        
        .animation-delay-2000 {
          animation-delay: 2s;
        }
        
        .animation-delay-4000 {
          animation-delay: 4s;
        }

        .animation-delay-6000 {
          animation-delay: 6s;
        }

        .animation-delay-8000 {
          animation-delay: 8s;
        }

        .parallax-bg {
          background-attachment: fixed;
          background-position: center;
          background-repeat: no-repeat;
          background-size: cover;
        }
      `}</style>

      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-cyan-50 overflow-hidden">
        {/* Navigation Bar */}
        <Navbar />
        
        {/* Professional Parallax Background Elements */}
        <ParallaxBackground scrollY={scrollY} />

        {/* Hero Section with Parallax */}
        <HeroSection scrollY={scrollY} />

        {/* Mission Section with Light Background */}
        <MissionSection scrollY={scrollY} />

        {/* Features Section with Staggered Parallax */}
        <FeaturesSection scrollY={scrollY} features={features} />

        {/* How to Use Section with Parallax Elements */}
        <WorkflowSection 
          scrollY={scrollY} 
          workflowSteps={workflowSteps} 
          capabilities={capabilities} 
        />

        {/* CTA Section with Light Background */}
        <CTASection scrollY={scrollY} />

        {/* Footer */}
        <Footer />
      </div>
    </>
  );
};

export default LandingPage; 