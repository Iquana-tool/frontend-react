import React from 'react';

const ResponsiveWrapper = ({ children }) => {
  return (
    <div className="w-full min-h-screen bg-gray-100">
      {/* Small Screen Message - Hide annotation page on screens below 1024px */}
      <div className="block lg:hidden">
        <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 to-slate-100 p-6">
          <div className="text-center max-w-md mx-auto">
            <div className="mb-8">
              <div className="w-24 h-24 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-12 h-12 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} 
                        d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                </svg>
              </div>
              <h1 className="text-2xl font-bold text-slate-800 mb-3">Larger Screen Required</h1>
              <p className="text-slate-600 text-lg mb-6">
                Annotation tools require a larger screen for optimal precision and usability.
              </p>
              <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 mb-6">
                <p className="text-amber-800 text-sm">
                  <strong>Minimum screen width:</strong> 1024px (Large tablet or desktop)
                </p>
              </div>
              <p className="text-slate-500 text-sm">
                Please use a desktop computer, laptop, or large tablet to access the annotation features.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Large Screen Content - Show annotation page on screens 1024px and above */}
      <div className="hidden lg:block">
        {children}
      </div>
    </div>
  );
};

export default ResponsiveWrapper;
