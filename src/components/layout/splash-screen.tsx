"use client";

export function SplashScreen() {
  return (
    <div className="fixed inset-0 z-[100] h-[100svh] w-screen overflow-hidden bg-[#f45a16]">
      <img
        src="/assets/branding/bob-world-splash-v3.9.0.png"
        alt="BOB World"
        className="absolute inset-0 h-full w-full select-none object-cover object-center"
        draggable={false}
      />
    </div>
  );
}
