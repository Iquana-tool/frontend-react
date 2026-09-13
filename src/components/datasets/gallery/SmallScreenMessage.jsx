import React from 'react';

const SmallScreenMessage = () => {
  return (
    <div className="block lg:hidden">
      <div className="min-h-screen flex items-center justify-center bg-app p-6">
        <div className="text-center max-w-md mx-auto">
          <div className="mb-8">
            <div className="w-24 h-24 bg-acS rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-12 h-12 text-ac" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} 
                      d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
              </svg>
            </div>
            <h1 className="text-2xl font-bold text-t1 mb-3">Larger Screen Required</h1>
            <p className="text-t2 text-lg mb-6">
              Dataset gallery requires a larger screen for optimal viewing and management.
            </p>
            <div className="bg-warnBg border border-warnLn rounded-lg p-4 mb-6">
              <p className="text-warn text-sm">
                <strong>Minimum screen width:</strong> 1024px (Large tablet or desktop)
              </p>
            </div>
            <p className="text-t3 text-sm">
              Please use a desktop computer, laptop, or large tablet to access the dataset gallery.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SmallScreenMessage;

