import React from "react";

const FeaturesSection = ({ scrollY, features }) => {
  return (
    <section id="features" className="relative py-24">
      <div className="max-w-7xl mx-auto px-6">
        <div 
          className="text-center mb-20"
          style={{
            transform: `translate3d(0, ${scrollY * 0.02}px, 0)`
          }}
        >
          <h2 className="text-4xl md:text-5xl font-bold text-gray-900 mb-6">
            Advanced Tools for Marine Research
          </h2>
          <p className="text-xl text-gray-600 max-w-3xl mx-auto leading-relaxed">
            Specialized features designed for coral morphology analysis, and marine biodiversity research.
          </p>
          <div className="w-24 h-1 bg-gradient-to-r from-teal-500 to-cyan-500 mx-auto mt-8"></div>
        </div>
        
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
          {features.map((feature, index) => (
            <div
              key={index}
              className="group relative bg-white/80 backdrop-blur-lg rounded-3xl p-8 border border-white/30 hover:border-white/50 shadow-lg hover:shadow-2xl transition-all duration-500 hover:-translate-y-2"
              style={{
                transform: `translate3d(0, ${scrollY * (0.01 + index * 0.003)}px, 0)`
              }}
            >
              <div className={`flex items-center justify-center w-16 h-16 bg-gradient-to-r ${feature.gradient} rounded-2xl mb-6 text-white group-hover:scale-110 transition-transform duration-300 mx-auto`}>
                {feature.icon}
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-4 text-center">
                {feature.title}
              </h3>
              <p className="text-gray-600 leading-relaxed text-center">
                {feature.description}
              </p>
              <div className={`absolute inset-0 bg-gradient-to-r ${feature.gradient} rounded-3xl opacity-0 group-hover:opacity-5 transition-opacity duration-300`}></div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default FeaturesSection; 