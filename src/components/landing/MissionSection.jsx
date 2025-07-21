import React from "react";
import { Waves } from "lucide-react";

const MissionSection = ({ scrollY }) => {
  return (
    <section 
      className="relative py-6"
      style={{
        transform: `translate3d(0, ${scrollY * 0.05}px, 0)`
      }}
    >
      <div className="relative max-w-6xl mx-auto px-6">
        <div 
          className="text-center mb-16"
          style={{
            transform: `translate3d(0, ${scrollY * 0.03}px, 0)`
          }}
        >
          <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-r from-teal-400 to-cyan-500 rounded-2xl mb-6 shadow-lg">
            <Waves className="w-8 h-8 text-white" />
          </div>
          <h2 className="text-4xl md:text-5xl font-bold text-gray-900 mb-6">
            Bridging AI and Marine Ecology
          </h2>
          <div className="w-24 h-1 bg-gradient-to-r from-teal-400 to-cyan-500 mx-auto mb-8"></div>
        </div>
        
        <div 
          className="text-center"
          style={{
            transform: `translate3d(0, ${scrollY * 0.02}px, 0)`
          }}
        >
          <p className="text-xl text-gray-800 max-w-4xl mx-auto leading-relaxed font-medium">
            AquaMorph represents a collaboration between the{" "}
            <span className="text-teal-600 font-bold bg-gradient-to-r from-teal-50 to-cyan-50 px-2 py-1 rounded-lg">
              German Research Center for Artificial Intelligence (DFKI)
            </span>{" "}
            and the{" "}
            <span className="text-cyan-600 font-bold bg-gradient-to-r from-cyan-50 to-blue-50 px-2 py-1 rounded-lg">
              Helmholtz Institute for Functional Marine Biodiversity (HIFMB)
            </span>.
            This interdisciplinary initiative uses advanced artificial intelligence to enhance coral reef research with smart, scalable tools for marine ecosystem analysis.
          </p>
        </div>
      </div>
    </section>
  );
};

export default MissionSection; 