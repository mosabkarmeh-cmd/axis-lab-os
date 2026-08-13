import React, { useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { HelpCircle } from "lucide-react";

interface HelpTooltipProps {
  id: string;
  content: string;
  position?: "top" | "bottom" | "left" | "right";
}

export default function HelpTooltip({ id, content, position = "top" }: HelpTooltipProps) {
  const [show, setShow] = useState<boolean>(false);

  // Position styles
  const getPositionClass = () => {
    switch (position) {
      case "bottom":
        return "top-full mt-2 left-1/2 -translate-x-1/2";
      case "left":
        return "right-full mr-2 top-1/2 -translate-y-1/2";
      case "right":
        return "left-full ml-2 top-1/2 -translate-y-1/2";
      case "top":
      default:
        return "bottom-full mb-2 left-1/2 -translate-x-1/2";
    }
  };

  return (
    <div 
      className="inline-block relative z-30 font-sans"
      onMouseEnter={() => setShow(true)}
      onMouseLeave={() => setShow(false)}
      onTouchStart={() => setShow(!show)}
    >
      <button
        id={`tooltip-trigger-${id}`}
        type="button"
        className="p-0.5 hover:bg-zinc-800 rounded text-[#c59257]/80 hover:text-[#c59257] transition-all cursor-help flex items-center justify-center focus:outline-none"
      >
        <HelpCircle className="w-3.5 h-3.5" />
      </button>

      <AnimatePresence>
        {show && (
          <motion.div
            id={`tooltip-content-${id}`}
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className={`absolute ${getPositionClass()} w-56 p-2.5 bg-[#0b0c0e] border border-zinc-800 rounded-lg text-right text-[10px] text-zinc-300 font-normal leading-relaxed shadow-xl pointer-events-none`}
            style={{ filter: "drop-shadow(0 4px 6px rgba(0, 0, 0, 0.4))" }}
          >
            {/* Tooltip arrow effect */}
            <div className={`absolute w-1.5 h-1.5 bg-[#0b0c0e] border-r border-b border-zinc-800 rotate-45 ${
              position === "bottom" 
                ? "bottom-full mb-[-3px] left-1/2 -translate-x-1/2 rotate-[225deg] border-l border-t border-r-0 border-b-0" 
                : position === "left"
                  ? "left-full ml-[-3px] top-1/2 -translate-y-1/2 rotate-[315deg] border-l-0 border-t-0 border-r border-b"
                  : position === "right"
                    ? "right-full mr-[-3px] top-1/2 -translate-y-1/2 rotate-[135deg] border-r-0 border-b-0 border-l border-t"
                    : "top-full mt-[-3px] left-1/2 -translate-x-1/2"
            }`} />
            
            <p className="text-zinc-300">{content}</p>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
