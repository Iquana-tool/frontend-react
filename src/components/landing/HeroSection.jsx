import React from "react";
import { useNavigate } from "react-router-dom";
import { ArrowRight, Sparkles, Play } from "lucide-react";

const HeroSection = ({ scrollY, stats }) => {
  const navigate = useNavigate();

  return (
    <section className="relative min-h-screen flex items-center justify-center">
      <div 
        className="relative max-w-7xl mx-auto px-6 py-20 text-center"
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
          className="text-6xl md:text-8xl font-black text-gray-900 mb-8 leading-tight"
          style={{
            transform: `translate3d(0, ${scrollY * 0.08}px, 0)`
          }}
        >
          Aqua
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-teal-400 via-cyan-500 to-blue-600 animate-gradient">
            Morph
          </span>
        </h1>
        
        <p 
          className="text-xl md:text-2xl text-gray-600 mb-12 max-w-4xl mx-auto leading-relaxed font-light"
          style={{
            transform: `translate3d(0, ${scrollY * 0.06}px, 0)`
          }}
        >
           Semi-automated coral segmentation platform powered by cutting-edge AI. 
          <span className="text-teal-600 font-medium">Transform marine biodiversity research</span> with intelligent tools for coral reef analysis.
        </p>
        
        <div 
          className="flex flex-col sm:flex-row gap-6 justify-center mb-16"
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
          
          <button
            onClick={() => document.getElementById('features').scrollIntoView({ behavior: 'smooth' })}
            className="group inline-flex items-center justify-center px-8 py-4 text-lg font-semibold text-gray-700 bg-white/80 backdrop-blur-sm border border-white/20 rounded-2xl shadow-lg hover:shadow-xl transition-all duration-300 hover:bg-white/90"
          >
            <Play className="w-5 h-5 mr-2 group-hover:scale-110 transition-transform" />
            Watch Demo
          </button>
        </div>

        {/* Stats Grid with Parallax */}
        <div 
          className="grid grid-cols-2 md:grid-cols-4 gap-6 max-w-4xl mx-auto"
          style={{
            transform: `translate3d(0, ${scrollY * 0.02}px, 0)`
          }}
        >
          {stats.map((stat, index) => (
            <div
              key={index}
              className="bg-white/60 backdrop-blur-lg rounded-2xl p-6 border border-white/20 shadow-lg hover:shadow-xl transition-all duration-300 group"
              style={{
                transform: `translate3d(0, ${scrollY * (0.01 + index * 0.005)}px, 0)`
              }}
            >
              <div className="text-teal-500 mb-2 flex justify-center group-hover:scale-110 transition-transform">
                {stat.icon}
              </div>
              <div className="text-3xl font-bold text-gray-900 mb-1">{stat.value}</div>
              <div className="text-sm text-gray-600 font-medium">{stat.label}</div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default HeroSection; 