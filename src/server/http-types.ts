import type { Request, Response } from "express";
import type { UserRecord } from "./types.ts";

declare global {
  namespace Express {
    interface Request {
      user?: UserRecord;
    }
  }
}

export type HttpRequest = Request;
export type HttpResponse = Response;
