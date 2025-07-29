import React from "react";
import { Target, CheckCircle } from "lucide-react";

const WorkflowSection = ({ scrollY, workflowSteps, capabilities }) => {
  return (
    <section 
      className="relative py-6"
      style={{
        transform: `translate3d(0, ${scrollY * 0.03}px, 0)`
      }}
    >
      <div className="max-w-7xl mx-auto px-6">
        <div className="grid lg:grid-cols-2 gap-16 items-center">
          <div
            style={{
              transform: `translate3d(0, ${scrollY * 0.02}px, 0)`
            }}
          >
            <h2 className="text-4xl md:text-5xl font-bold text-gray-900 mb-8">
              Simple Yet Powerful Workflow
            </h2>
            <div className="space-y-8">
              {workflowSteps.map((item, index) => (
                <div 
                  key={index} 
                  className="flex items-start space-x-6 group"
                  style={{
                    transform: `translate3d(0, ${scrollY * (0.01 + index * 0.002)}px, 0)`
                  }}
                >
                  <div className={`flex-shrink-0 w-12 h-12 bg-gradient-to-r ${item.color} rounded-2xl flex items-center justify-center text-white font-bold text-lg shadow-lg group-hover:scale-110 transition-transform duration-300`}>
                    {item.step}
                  </div>
                  <div>
                    <h3 className="text-xl font-bold text-gray-900 mb-2">
                      {item.title}
                    </h3>
                    <p className="text-gray-600 leading-relaxed">
                      {item.description}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
          
          <div 
            className="relative"
            style={{
              transform: `translate3d(0, ${scrollY * 0.01}px, 0)`
            }}
          >
            <div className="bg-gradient-to-br from-teal-500 via-cyan-500 to-blue-600 rounded-3xl p-8 text-white shadow-2xl">
              <h3 className="text-2xl font-bold mb-4 flex items-center">
                <Target className="w-8 h-8 mr-3" />
                Key Capabilities
              </h3>
              <div className="space-y-4">
                {capabilities.slice(0, 6).map((capability, index) => (
                  <div key={index} className="flex items-center space-x-3 group">
                    <CheckCircle className="w-5 h-5 text-teal-200 flex-shrink-0 group-hover:scale-110 transition-transform" />
                    <span className="text-sm leading-relaxed">{capability}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default WorkflowSection; 