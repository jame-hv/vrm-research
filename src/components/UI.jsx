export const UI = () => {
  return (
    <section className="fixed inset-0 z-10 flex items-center justify-center">
      <div className="absolute top-4 left-4 md:top-8 md:left-14 opacity-0 animate-fade-in-down animation-delay-200 pointer-events-none">
        <h2 className="text-white text-2xl">Indie Studio</h2>
      </div>
      <div className="absolute left-4 md:left-15 -translate-x-1/2 -rotate-90 flex items-center gap-4 animation-delay-1500 animate-fade-in-down opacity-0 pointer-events-none">
        <div className="w-20 h-px bg-white/60"></div>
        <p className="text-white/60 text-xs">Turn on camera</p>
      </div>
    </section>
  );
};
