import React from "react";
import { useNavigate } from "react-router-dom";
import { ArrowRight } from "lucide-react";

const CTASection = () => {
  const navigate = useNavigate();

  return (
    <section className="relative py-14 px-6">
      <div className="max-w-3xl mx-auto text-center bg-p1 border border-ln rounded-14 p-10 shadow-sm">
        <h2 className="text-3xl font-semibold tracking-tight text-t1 mb-3">
          Ready to segment your first reef survey?
        </h2>
        <p className="text-t2 mb-6">
          Upload a dataset and start annotating in minutes.
        </p>
        <button
          onClick={() => navigate('/datasets')}
          className="group inline-flex items-center gap-[8px] px-7 py-[13px] text-[15px] font-semibold text-onAccent bg-accent rounded-9 shadow-primary hover:brightness-110 active:brightness-95 transition-all duration-150"
        >
          Start segmenting
          <ArrowRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform duration-150" />
        </button>
      </div>
    </section>
  );
};

export default CTASection;
