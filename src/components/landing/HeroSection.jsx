import React from "react";
import { useNavigate } from "react-router-dom";
import { ArrowRight, Sparkles } from "lucide-react";

const HeroSection = ({ scrollY }) => {
  const navigate = useNavigate();

  return (
    <section className="relative flex items-start justify-center pt-24 pb-8">
      <div 
        className="relative max-w-7xl mx-auto px-6 py-8 text-center"
        style={{
          transform: `translate3d(0, ${scrollY * 0.1}px, 0)`
        }}
      >
        {/* Badge */}
        <div 
          className="inline-flex items-center px-4 py-2 rounded-full bg-white/80 backdrop-blur-sm border border-white/20 text-sm font-medium text-gray-700 mb-8 shadow-lg"
          style={{
            transform: `translate3d(0, ${scrollY * 0.05}px, 0)`
          }}
        >
          <Sparkles className="w-4 h-4 mr-2 text-teal-500" />
          DFKI × HIFMB Collaborative Research
        </div>
        
        <h1 
          className="text-6xl md:text-8xl font-black text-gray-900 mb-6 leading-tight"
          style={{
            transform: `translate3d(0, ${scrollY * 0.08}px, 0)`
          }}
        >
          I
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-teal-400 via-cyan-500 to-blue-600 animate-gradient">
            Quana
          </span>
        </h1>
        
        <p 
          className="text-xl md:text-2xl text-gray-600 mb-8 max-w-4xl mx-auto leading-relaxed font-light"
          style={{
            transform: `translate3d(0, ${scrollY * 0.06}px, 0)`
          }}
        >
           Semi-automated coral segmentation platform powered by cutting-edge AI. 
          <span className="text-teal-600 font-medium"> Transform marine biodiversity research</span> with intelligent tools for coral reef analysis.
        </p>
        
        <div 
          className="flex flex-col sm:flex-row gap-6 justify-center"
          style={{
            transform: `translate3d(0, ${scrollY * 0.04}px, 0)`
          }}
        >
          <button
            onClick={() => navigate('/datasets')}
            className="group relative inline-flex items-center justify-center px-8 py-4 text-lg font-semibold text-white bg-gradient-to-r from-teal-500 to-cyan-600 rounded-2xl shadow-xl hover:shadow-2xl transition-all duration-300 transform hover:-translate-y-1 hover:scale-105"
          >
            <span className="relative z-10 flex items-center space-x-2">
              <span>Start Segmenting</span>
              <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
            </span>
            <div className="absolute inset-0 bg-gradient-to-r from-teal-600 to-cyan-700 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity"></div>
          </button>
        </div>
      </div>
    </section>
  );
};

export default HeroSection; 