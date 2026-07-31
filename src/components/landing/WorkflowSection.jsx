import React from "react";
import { Target, CheckCircle } from "lucide-react";

const WorkflowSection = ({ workflowSteps, capabilities }) => {
  return (
    <section className="relative py-14 px-6">
      <div className="max-w-6xl mx-auto">
        <div className="grid lg:grid-cols-2 gap-10 items-start">
          <div>
            <h2 className="text-3xl font-semibold tracking-tight text-t1 mb-6">
              From upload to measurement
            </h2>
            <div className="space-y-5">
              {workflowSteps.map((item, index) => (
                <div key={index} className="flex items-start gap-4">
                  <div className="flex-shrink-0 w-9 h-9 rounded-full bg-acS text-ac flex items-center justify-center font-semibold text-sm">
                    {item.step}
                  </div>
                  <div>
                    <h3 className="text-base font-semibold text-t1 mb-1">
                      {item.title}
                    </h3>
                    <p className="text-sm text-t2 leading-relaxed">
                      {item.description}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="bg-p1 border border-ln rounded-14 p-6 shadow-sm">
            <h3 className="text-lg font-semibold text-t1 mb-4 flex items-center gap-[10px]">
              <Target className="w-5 h-5 text-ac" />
              Key capabilities
            </h3>
            <div className="space-y-3">
              {capabilities.slice(0, 6).map((capability, index) => (
                <div key={index} className="flex items-center gap-[10px]">
                  <CheckCircle className="w-4 h-4 text-ok flex-shrink-0" />
                  <span className="text-sm text-t2 leading-relaxed">{capability}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default WorkflowSection;
