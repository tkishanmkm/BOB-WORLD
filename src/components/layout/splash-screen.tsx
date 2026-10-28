
"use client";
import React from 'react'; // Import React for JSX

export function SplashScreen() {
  return (
    <div className="fixed inset-0 z-[100] flex flex-col items-center justify-center bg-orange-500 text-white">
      {/* Root container for the splash screen with orange background */}
      {/* Placeholder for the abstract background shapes - more complex styling would be needed for an exact match */}
      {/* Main BOB World Logo and Text */}
      <div className="text-center mb-16">
        <h1 className="text-6xl font-bold tracking-tight">bob</h1>
        <p className="text-2xl tracking-wider">World</p>
      </div>

      {/* Bank of Baroda Text */}
      <div className="absolute bottom-32 flex flex-col items-center">
      <p className="text-xl font-semibold mt-2">बैंक ऑफ़ बड़ौदा</p>
      <p className="text-xl font-semibold">Bank of Baroda</p>
      </div>
      {/* Version Text */}
      <p className="absolute bottom-8 text-xs">v3.8.7 © Bank of Baroda. All rights reserved.</p>
    </div>
  );
}
