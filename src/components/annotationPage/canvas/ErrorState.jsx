import React from 'react';
import { AlertTriangle } from 'lucide-react';

const ErrorState = ({ error, onRetry }) => (
  <div className="absolute inset-0 z-10 flex items-center justify-center bg-canvasbg/80 backdrop-blur-sm">
    <div className="text-center max-w-[320px] px-[16px]">
      <div className="w-14 h-14 rounded-full bg-errBg flex items-center justify-center mx-auto mb-[12px]">
        <AlertTriangle size={22} className="text-err" />
      </div>
      <h3 className="text-modaltitle font-bold text-t1 mb-[4px]">Failed to load image</h3>
      <p className="text-row text-t3 mb-[12px]">{error}</p>
      <button
        type="button"
        onClick={onRetry}
        className="h-7 px-[12px] rounded-7 bg-accent text-onAccent text-btn font-bold hover:brightness-110 transition-[filter]"
      >
        Retry
      </button>
    </div>
  </div>
);

export default ErrorState;
