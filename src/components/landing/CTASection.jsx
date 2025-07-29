import React from "react";
import { useNavigate } from "react-router-dom";
import { Zap } from "lucide-react";

const CTASection = ({ scrollY }) => {
  const navigate = useNavigate();

  return (
    <section 
      className="relative py-24"
      style={{
        transform: `translate3d(0, ${scrollY * 0.02}px, 0)`
      }}
    >
      <div 
        className="relative max-w-4xl mx-auto px-6 text-center"
        style={{
          transform: `translate3d(0, ${scrollY * 0.01}px, 0)`
        }}
      >
        <div className="inline-flex items-center justify-center w-20 h-20 bg-gradient-to-r from-teal-400 to-cyan-500 rounded-3xl mb-8 shadow-lg">
          <Zap className="w-10 h-10 text-white" />
        </div>
        <h2 className="text-4xl md:text-5xl font-bold text-gray-900 mb-8">
          Advance Marine Research with AI
        </h2>
        <p className="text-xl text-gray-600 mb-12 leading-relaxed">
          Use AquaMorph for coral segmentation and morphological analysis.
        </p>
        <button
          onClick={() => navigate('/datasets')}
          className="group relative inline-flex items-center justify-center px-12 py-4 text-xl font-bold text-white bg-gradient-to-r from-teal-500 to-cyan-600 rounded-2xl shadow-2xl hover:shadow-cyan-500/25 transition-all duration-300 transform hover:-translate-y-1 hover:scale-105"
        >
          <span className="relative z-10">Start Segmenting</span>
          <div className="absolute inset-0 bg-gradient-to-r from-teal-400 to-cyan-500 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity blur-xl"></div>
        </button>
      </div>
    </section>
  );
};

export default CTASection; 