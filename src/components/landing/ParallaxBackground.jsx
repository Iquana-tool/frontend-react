import React from "react";

const ParallaxBackground = ({ scrollY }) => {
  return (
    <div className="fixed inset-0 overflow-hidden pointer-events-none">
      {/* Large Primary Ocean Wave - Top Left */}
      <div 
        className="absolute -top-32 -left-32 w-[800px] h-[800px] bg-gradient-to-br from-teal-200/30 via-cyan-200/20 to-blue-200/25 rounded-full filter blur-3xl"
        style={{
          transform: `translate3d(${scrollY * 0.08}px, ${scrollY * 0.12}px, 0) rotate(${scrollY * 0.05}deg)`
        }}
      ></div>

      {/* Large Secondary Wave - Bottom Right */}
      <div 
        className="absolute -bottom-32 -right-32 w-[1000px] h-[1000px] bg-gradient-to-tl from-indigo-200/25 via-blue-200/30 to-cyan-200/20 rounded-full filter blur-3xl"
        style={{
          transform: `translate3d(${scrollY * -0.06}px, ${scrollY * 0.1}px, 0) rotate(${scrollY * -0.03}deg)`
        }}
      ></div>

      {/* Medium Research Network Pattern - Center */}
      <div 
        className="absolute top-1/4 left-1/3 w-[600px] h-[600px] bg-gradient-to-r from-emerald-200/20 via-teal-200/25 to-cyan-200/15 rounded-full filter blur-2xl"
        style={{
          transform: `translate3d(${scrollY * 0.04}px, ${scrollY * 0.07}px, 0) scale(${1 + scrollY * 0.00005})`
        }}
      ></div>

      {/* Floating Research Elements */}
      <div 
        className="absolute top-1/6 right-1/4 w-[400px] h-[400px] bg-gradient-to-br from-purple-200/20 via-indigo-200/25 to-blue-200/20 rounded-full filter blur-2xl animate-pulse"
        style={{
          transform: `translate3d(${scrollY * 0.1}px, ${scrollY * -0.05}px, 0) rotate(${scrollY * 0.08}deg)`
        }}
      ></div>

      <div 
        className="absolute bottom-1/4 left-1/6 w-[500px] h-[500px] bg-gradient-to-tr from-cyan-200/15 via-teal-200/20 to-emerald-200/25 rounded-full filter blur-2xl animate-pulse animation-delay-4000"
        style={{
          transform: `translate3d(${scrollY * -0.04}px, ${scrollY * 0.08}px, 0)`
        }}
      ></div>

      {/* Academic Accent Elements */}
      <div 
        className="absolute top-2/3 right-1/6 w-[350px] h-[350px] bg-gradient-to-bl from-orange-200/20 via-yellow-200/15 to-amber-200/20 rounded-full filter blur-xl animate-pulse animation-delay-2000"
        style={{
          transform: `translate3d(${scrollY * 0.06}px, ${scrollY * -0.04}px, 0) rotate(${scrollY * 0.06}deg)`
        }}
      ></div>

      <div 
        className="absolute top-1/8 left-2/3 w-[300px] h-[300px] bg-gradient-to-br from-pink-200/15 via-rose-200/20 to-red-200/15 rounded-full filter blur-xl animate-pulse animation-delay-6000"
        style={{
          transform: `translate3d(${scrollY * -0.07}px, ${scrollY * 0.05}px, 0)`
        }}
      ></div>

      {/* Subtle Grid Pattern Overlay */}
      <div 
        className="absolute inset-0 opacity-[0.02]"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg width='100' height='100' viewBox='0 0 100 100' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='%23000000' fill-opacity='0.4'%3E%3Ccircle cx='20' cy='20' r='2'/%3E%3Ccircle cx='80' cy='20' r='2'/%3E%3Ccircle cx='20' cy='80' r='2'/%3E%3Ccircle cx='80' cy='80' r='2'/%3E%3Ccircle cx='50' cy='50' r='1'/%3E%3C/g%3E%3C/svg%3E")`,
          transform: `translate3d(${scrollY * -0.01}px, ${scrollY * -0.02}px, 0)`
        }}
      ></div>
    </div>
  );
};

export default ParallaxBackground; 