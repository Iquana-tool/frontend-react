import React from "react";
import { useNavigate } from "react-router-dom";
import { ArrowRight, Sparkles } from "lucide-react";
import WorkspacePreview from "./WorkspacePreview";

const HeroSection = () => {
  const navigate = useNavigate();

  return (
    <section className="relative pt-24 pb-14 px-6">
      <div className="max-w-6xl mx-auto grid lg:grid-cols-2 gap-10 items-center">
        <div>
          <div className="inline-flex items-center gap-[8px] px-[14px] py-[7px] rounded-full bg-acS border border-acLn text-xs font-medium text-ac mb-5">
            <Sparkles className="w-[13px] h-[13px]" />
            DFKI × HIFMB Collaborative Research
          </div>

          {/* Same wordmark treatment as the nav bar and login screen, rather
              than a one-off decorative gradient — the brand should read as
              one product, not a marketing microsite bolted onto it. */}
          <h1 className="text-5xl sm:text-6xl font-semibold tracking-tight text-t1 mb-5 leading-[1.05]">
            I<span className="text-ac">Quana</span>
          </h1>

          <p className="text-lg text-t2 mb-7 max-w-lg leading-relaxed">
            Semi-automated coral segmentation for marine biodiversity research.
            Prompt-guided AI annotation, a full review workflow, and morphological
            quantification — in one tool built for reef imagery.
          </p>

          <div className="flex flex-wrap gap-4">
            <button
              onClick={() => navigate('/datasets')}
              className="group inline-flex items-center gap-[8px] px-6 py-[13px] text-[15px] font-semibold text-onAccent bg-accent rounded-9 shadow-primary hover:brightness-110 active:brightness-95 transition-all duration-150"
            >
              Start segmenting
              <ArrowRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform duration-150" />
            </button>
            <button
              onClick={() => navigate('/docs')}
              className="inline-flex items-center gap-[8px] px-6 py-[13px] text-[15px] font-semibold text-t2 hover:text-t1 bg-p1 hover:bg-hv border border-ln rounded-9 transition-colors duration-150"
            >
              Read the docs
            </button>
          </div>
        </div>

        {/* The product itself is the hero image — no stock photography, no
            abstract shapes standing in for a screenshot that doesn't exist. */}
        <div className="relative">
          <div className="absolute -inset-6 bg-acS rounded-[28px] blur-2xl opacity-60 -z-10" />
          <WorkspacePreview />
        </div>
      </div>
    </section>
  );
};

export default HeroSection;
