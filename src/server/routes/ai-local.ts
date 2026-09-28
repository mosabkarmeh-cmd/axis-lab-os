import { Router } from "express";
import { createAiCompilerLocalRouter } from "./ai-compiler-local.ts";
import { createAiAdvisorLocalRouter } from "./ai-advisor-local.ts";
import { createAiFastLocalRouter } from "./ai-fast-local.ts";
import { createAiChatLocalRouter } from "./ai-chat-local.ts";
import { createAiMemoryLocalRouter } from "./ai-memory-local.ts";
import { createAiSearchLocalRouter } from "./ai-search-local.ts";

export function createAiLocalRouter(deps: any) {
  const router = Router();
  router.use(createAiCompilerLocalRouter(deps));
  router.use(createAiAdvisorLocalRouter(deps));
  router.use(createAiFastLocalRouter(deps));
  router.use(createAiChatLocalRouter(deps));
  router.use(createAiMemoryLocalRouter(deps));
  router.use(createAiSearchLocalRouter(deps));
  return router;
}
