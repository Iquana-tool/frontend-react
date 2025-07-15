import React from "react";

const Footer = () => {
  return (
    <footer className="relative py-16">
      {/* Subtle separator */}
      <div className="absolute left-0 right-0 h-px bg-gradient-to-r from-transparent via-gray-300 to-transparent mb-12"></div>
      
      <div className=" py-4 max-w-7xl mx-auto px-6">
        <div className="text-center">
          <h3 className="text-3xl font-bold mb-4 text-gray-900">
            Aqua<span className="text-transparent bg-clip-text bg-gradient-to-r from-teal-400 to-cyan-400">Morph</span>
          </h3>
          <p className="text-lg text-gray-700 mb-8 max-w-2xl mx-auto leading-relaxed">
            Advanced coral segmentation platform for marine biodiversity research
          </p>
          
          {/* Organization info with enhanced styling */}
          <div className="flex flex-col md:flex-row items-center justify-center space-y-2 md:space-y-0 md:space-x-8 mb-8">
            <div className="text-center">
              <span className="text-teal-600 font-semibold text-sm tracking-wide uppercase">DFKI</span>
              <p className="text-gray-600 text-sm">German Research Center for Artificial Intelligence</p>
            </div>
            <div className="hidden md:block w-1 h-1 bg-gray-400 rounded-full"></div>
            <div className="text-center">
              <span className="text-cyan-600 font-semibold text-sm tracking-wide uppercase">HIFMB</span>
              <p className="text-gray-600 text-sm">Helmholtz Institute for Functional Marine Biodiversity</p>
            </div>
          </div>
          
          {/* Subtle separator */}
          <div className="w-24 h-px bg-gradient-to-r from-transparent via-gray-400 to-transparent mx-auto mb-6"></div>
          
          <p className="text-gray-500 text-sm">
            © 2025 AquaMorph. A collaborative research initiative bridging AI and marine ecology.
          </p>
        </div>
      </div>
    </footer>
  );
};

export default Footer; 