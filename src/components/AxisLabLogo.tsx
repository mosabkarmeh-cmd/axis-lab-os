import React from "react";
import axislabLogoImage from "../assets/images/axis-lab-logo.png";

interface LogoProps {
  className?: string;
  size?: number;
  src?: string;
}

export function AxisLabLogo({ className = "", size = 120, src }: LogoProps) {
  const logoSrc = src || axislabLogoImage;
  return (
    <img
      src={logoSrc}
      alt="AXIS LAB Logo"
      style={{ width: size, height: size }}
      className={`select-none object-cover rounded-xl border border-zinc-850/80 shadow-md ${className}`}
      referrerPolicy="no-referrer"
    />
  );
}

export function AxisLabLogoFull({ className = "", showSubtext = true, logoSrc }: { className?: string; showSubtext?: boolean; logoSrc?: string }) {
  return (
    <div className={`flex flex-col items-center justify-center text-center ${className}`}>
      {/* Beautiful Icon */}
      <AxisLabLogo size={140} src={logoSrc} className="mb-4 transform hover:scale-105 transition-transform duration-500" />
      
      {/* Brand text matching the uploaded photo */}
      <div className="space-y-1 select-none">
        <h2 className="text-3xl font-extrabold tracking-[0.15em] font-mono flex items-center justify-center gap-1">
          <span className="text-[#c59257]">AXIS</span>
          <span className="text-zinc-100 dark:text-zinc-100 theme-light:text-zinc-900">LAB</span>
        </h2>
        
        {showSubtext && (
          <div className="space-y-2 mt-1">
            <p className="text-[10px] font-bold text-[#c59257] tracking-[0.25em] uppercase font-sans">
              Laser Cutting & Design Studio
            </p>
            
            {/* The 5 key visual services icons shown in photo */}
            <div className="flex items-center justify-center gap-4 pt-3 border-t border-zinc-900/60 text-[9px] text-zinc-500 font-sans max-w-sm mx-auto">
              <div className="flex flex-col items-center gap-1">
                <span className="text-xs text-[#c59257]">ðŸ“</span>
                <span className="text-[8px] scale-90">Ù…Ø§ÙƒÙŠØªØ§Øª</span>
              </div>
              <div className="h-4 w-[1px] bg-zinc-850"></div>
              <div className="flex flex-col items-center gap-1">
                <span className="text-xs text-[#c59257]">ðŸªµ</span>
                <span className="text-[8px] scale-90">Ø®Ø´Ø¨</span>
              </div>
              <div className="h-4 w-[1px] bg-zinc-850"></div>
              <div className="flex flex-col items-center gap-1">
                <span className="text-xs text-[#c59257]">ðŸ’Ž</span>
                <span className="text-[8px] scale-90">Ø¨Ù„ÙŠÙƒØ³ÙŠ</span>
              </div>
              <div className="h-4 w-[1px] bg-zinc-850"></div>
              <div className="flex flex-col items-center gap-1">
                <span className="text-xs text-[#c59257]">ðŸŒ¸</span>
                <span className="text-[8px] scale-90">Ø¯ÙŠÙƒÙˆØ±Ø§Øª</span>
              </div>
              <div className="h-4 w-[1px] bg-zinc-850"></div>
              <div className="flex flex-col items-center gap-1">
                <span className="text-xs text-[#c59257]">âš¡</span>
                <span className="text-[8px] scale-90">Ù‚Øµ Ù„ÙŠØ²Ø±</span>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

