import { motion } from "motion/react";
import type { Variants, Transition } from "motion/react";
import HelpCenter from "./HelpCenter";

type HelpPageProps = {
  pageVariants: Variants;
  pageTransition: Transition;
};

export default function HelpPage({ pageVariants, pageTransition }: HelpPageProps) {
  return (
    <motion.div
      key="help"
      variants={pageVariants}
      initial="initial"
      animate="animate"
      exit="exit"
      transition={pageTransition}
      className="flex-1 overflow-y-auto p-6 bg-[#0c0c0e]"
    >
      <HelpCenter />
    </motion.div>
  );
}
