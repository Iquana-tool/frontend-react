import React from "react";

const Footer = () => {
  return (
    <footer className="relative border-t border-ln py-8 px-6">
      <div className="max-w-6xl mx-auto text-center">
        <h3 className="text-lg font-semibold tracking-tight mb-2 text-t1">
          I<span className="text-ac">Quana</span>
        </h3>
        <p className="text-sm text-t2 mb-5 max-w-md mx-auto leading-relaxed">
          Coral segmentation platform for marine biodiversity research
        </p>

        <div className="flex flex-col sm:flex-row items-center justify-center gap-2 sm:gap-6 mb-5 text-sm">
          <span className="text-t2">
            <span className="text-ac font-medium">DFKI</span> — German Research Center for Artificial Intelligence
          </span>
          <span className="hidden sm:block w-1 h-1 bg-ln2 rounded-full" />
          <span className="text-t2">
            <span className="text-ac font-medium">HIFMB</span> — Helmholtz Institute for Functional Marine Biodiversity
          </span>
        </div>

        <p className="text-t3 text-xs">
          © 2025 IQuana. A collaborative research initiative bridging AI and marine ecology.
        </p>
      </div>
    </footer>
  );
};

export default Footer; 