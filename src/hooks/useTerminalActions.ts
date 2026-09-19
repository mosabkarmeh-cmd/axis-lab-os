import { useCallback, useState, type FormEvent } from "react";

type TerminalLog = { time: string; type: string; msg: string };

type TerminalOptions = {
  currentUser: { fullName?: string } | null;
  token: string | null;
  users: Array<{ fullName: string; role: string }>;
  addTerminalLog: (type: string, message: string) => void;
};

export function useTerminalActions({ currentUser, token, users, addTerminalLog }: TerminalOptions) {
  const [terminalLogs, setTerminalLogs] = useState<TerminalLog[]>([
    { time: "11:22:01", type: "SYSTEM", msg: "AXIS LAB bootstrap engine initialized." },
    { time: "11:22:05", type: "DB", msg: "Prisma Database Client initialized in memory." },
  ]);
  const [commandInput, setCommandInput] = useState("");

  const runTerminalCommand = useCallback((cmd: string) => {
    if (cmd === "npx prisma generate") {
      addTerminalLog("PRISMA", "Parsing database/schema.prisma models...");
      window.setTimeout(() => addTerminalLog("SUCCESS", "Generated client bundle: @prisma/client successfully!"), 800);
    } else if (cmd === "npx prisma migrate dev") {
      addTerminalLog("PRISMA", "Creating migration file inside /migrations...");
      window.setTimeout(() => addTerminalLog("SUCCESS", "Applied migration: init_tables_laser_workshop onto Postgres client"), 1200);
    }
  }, [addTerminalLog]);

  const executeTerminalCommand = useCallback((cmd: string) => {
    addTerminalLog("USER", `$ ${cmd}`);
    runTerminalCommand(cmd);
  }, [addTerminalLog, runTerminalCommand]);

  const handleTerminalSubmit = useCallback((event: FormEvent) => {
    event.preventDefault();
    const rawCommand = commandInput.trim();
    const command = rawCommand.toLowerCase();
    if (!command) return;
    addTerminalLog("USER", `$ ${commandInput}`);
    setCommandInput("");
    window.setTimeout(() => {
      if (command === "help" || command === "?") addTerminalLog("INFO", "Commands: /help, /prisma-generate, /prisma-migrate, /clear, /status, /users");
      else if (command === "clear") setTerminalLogs([]);
      else if (command === "prisma-generate" || command === "npx prisma generate") runTerminalCommand("npx prisma generate");
      else if (command === "prisma-migrate" || command === "npx prisma migrate dev") runTerminalCommand("npx prisma migrate dev");
      else if (command === "status") addTerminalLog("STATUS", `User: ${currentUser?.fullName || "Guest"}, Active token: ${token ? "YES" : "NO"}`);
      else if (command === "users") addTerminalLog("INFO", `Users: ${users.map((user) => `${user.fullName} (${user.role})`).join(" | ")}`);
      else addTerminalLog("ERROR", `Command not found: "${command}". Type help for a list.`);
    }, 200);
  }, [addTerminalLog, commandInput, currentUser, runTerminalCommand, token, users]);

  return { terminalLogs, setTerminalLogs, commandInput, setCommandInput, handleTerminalSubmit, executeTerminalCommand };
}
