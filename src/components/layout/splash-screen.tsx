
"use client";
import React from 'react'; // Import React for JSX

export function SplashScreen() {
  return (
    <div className="fixed inset-0 z-[100] flex flex-col items-center justify-center bg-orange-500 text-white">
      {/* Root container for the splash screen with orange background */}
      {/* Placeholder for the abstract background shapes - more complex styling would be needed for an exact match */}
      {/* Main BOB World Logo and Text */}
      <div className="mb-14 flex items-center justify-center">
        <img src="/assets/branding/bob-world-logo.png" alt="BOB World" className="w-[230px] max-w-[72vw] object-contain" />
      </div>

      {/* Bank of Baroda Text */}
      <div className="absolute bottom-28 flex flex-col items-center gap-3">
        <img src="/assets/branding/bank-of-baroda-logo.png" alt="Bank of Baroda" className="w-[260px] max-w-[80vw] object-contain" />
      </div>
      {/* Version Text */}
      <p className="absolute bottom-8 text-xs">v3.8.7 © Bank of Baroda. All rights reserved.</p>
    </div>
  );
}