import React from "react";
import { Waves } from "lucide-react";

const MissionSection = () => {
  return (
    <section className="relative py-12 px-6">
      <div className="max-w-3xl mx-auto text-center">
        <div className="inline-flex items-center justify-center w-14 h-14 rounded-12 bg-acS mb-4">
          <Waves className="w-6 h-6 text-ac" />
        </div>
        <h2 className="text-3xl font-semibold tracking-tight text-t1 mb-4">
          Bridging AI and marine ecology
        </h2>
        <p className="text-t2 leading-relaxed">
          IQuana is a collaboration between the{" "}
          <span className="text-ac font-medium">
            German Research Center for Artificial Intelligence (DFKI)
          </span>{" "}
          and the{" "}
          <span className="text-ac font-medium">
            Helmholtz Institute for Functional Marine Biodiversity (HIFMB)
          </span>
          , building AI-assisted tools for coral reef research and marine
          ecosystem analysis.
        </p>
      </div>
    </section>
  );
};

export default MissionSection;
