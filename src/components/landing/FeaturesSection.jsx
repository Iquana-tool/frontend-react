import React from "react";

const FeaturesSection = ({ features }) => {
  return (
    <section id="features" className="relative py-14 px-6">
      <div className="max-w-6xl mx-auto">
        <div className="mb-8 max-w-xl">
          <h2 className="text-3xl font-semibold tracking-tight text-t1 mb-3">
            Built for coral morphology
          </h2>
          <p className="text-t2 leading-relaxed">
            Every tool in the workspace is designed around one image at a time —
            segment it, label it, measure it.
          </p>
        </div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {features.map((feature, index) => (
            <div
              key={index}
              className="group bg-p1 border border-ln hover:border-ln2 rounded-14 p-5 shadow-sm hover:shadow-md transition-all duration-150"
            >
              <div className="flex items-center justify-center w-11 h-11 rounded-9 bg-acS text-ac mb-4">
                {feature.icon}
              </div>
              <h3 className="text-base font-semibold text-t1 mb-2">
                {feature.title}
              </h3>
              <p className="text-sm text-t2 leading-relaxed">
                {feature.description}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default FeaturesSection;
