import { motion } from "motion/react";
import type { Variants, Transition } from "motion/react";
import SettingsView from "./SettingsView";

type SettingsPageProps = {
  showTerminalLogs: boolean;
  setShowTerminalLogs: (value: boolean) => void;
  showJwtHud: boolean;
  setShowJwtHud: (value: boolean) => void;
  virtualFiles: unknown[];
  selectedFileId: string;
  setSelectedFileId: (value: string) => void;
  pageVariants: Variants;
  pageTransition: Transition;
};

export default function SettingsPage({
  showTerminalLogs,
  setShowTerminalLogs,
  showJwtHud,
  setShowJwtHud,
  virtualFiles,
  selectedFileId,
  setSelectedFileId,
  pageVariants,
  pageTransition,
}: SettingsPageProps) {
  return (
    <motion.div
      key="settings"
      variants={pageVariants}
      initial="initial"
      animate="animate"
      exit="exit"
      transition={pageTransition}
      className="flex-1 overflow-y-auto p-6 bg-zinc-950/20"
    >
      <SettingsView
        showTerminalLogs={showTerminalLogs}
        setShowTerminalLogs={(value) => {
          setShowTerminalLogs(value);
          localStorage.setItem("axis_show_terminal_logs", String(value));
        }}
        showJwtHud={showJwtHud}
        setShowJwtHud={(value) => {
          setShowJwtHud(value);
          localStorage.setItem("axis_show_jwt_hud", String(value));
        }}
        virtualFiles={virtualFiles}
        selectedFileId={selectedFileId}
        setSelectedFileId={setSelectedFileId}
      />
    </motion.div>
  );
}
