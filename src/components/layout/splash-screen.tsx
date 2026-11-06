
"use client";
import React from 'react'; // Import React for JSX

export function SplashScreen() {
  return (
    <div className="fixed inset-0 z-[100] flex min-h-[100dvh] flex-col items-center justify-center overflow-hidden bg-gradient-to-b from-[#f36b24] via-[#e95720] to-[#d9431b] px-6 text-white">
      <div className="flex w-full max-w-[340px] flex-col items-center justify-center gap-9 rounded-[2rem] bg-white/95 px-8 py-10 shadow-[0_18px_60px_rgba(65,20,0,0.18)]">
        <img src="/assets/branding/bob-world-logo.png" alt="BOB World" className="block h-auto w-[250px] max-w-full object-contain" />
        <div className="h-px w-full bg-[#e9e9e9]" />
        <img src="/assets/branding/bank-of-baroda-logo.png" alt="Bank of Baroda" className="block h-auto w-[248px] max-w-full object-contain" />
      </div>
      <p className="absolute bottom-7 text-[11px] font-medium tracking-wide text-white/90">v3.8.7 © Bank of Baroda. All rights reserved.</p>
    </div>
  );
}