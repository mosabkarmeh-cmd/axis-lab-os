import express from "express";
import { registerAiAdvisorRoutes } from "./ai/advisor.ts";
import { registerAiFastLocalRoutes } from "./ai/fast-local.ts";
import { registerAiChatRoutes } from "./ai/chat.ts";
import { registerAiMemoryRoutes } from "./ai/memory.ts";
import { registerAiSemanticSearchRoutes } from "./ai/semantic-search.ts";

export function registerAIRoutes(app: express.Express) {
  registerAiAdvisorRoutes(app);
  registerAiFastLocalRoutes(app);
  registerAiChatRoutes(app);
  registerAiMemoryRoutes(app);
  registerAiSemanticSearchRoutes(app);
}
