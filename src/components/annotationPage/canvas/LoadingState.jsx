import React from 'react';
import { Loader2 } from 'lucide-react';

const LoadingState = () => (
  <div className="absolute inset-0 z-10 flex items-center justify-center bg-canvasbg/80 backdrop-blur-sm">
    <div className="text-center">
      <Loader2 size={28} className="mx-auto mb-[10px] text-ac animate-spin" />
      <p className="text-row text-t2">Loading image…</p>
    </div>
  </div>
);

export default LoadingState;
