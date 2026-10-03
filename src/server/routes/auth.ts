import express from "express";
import rateLimit from "express-rate-limit";
import bcrypt from "bcryptjs";
import * as core from "../server-core.ts";

const { nextActivityLogId, nextEntityId, schedulePersist, publicUser, generateJWT, getRequestUser, USERS, ACTIVITY_LOGS } = core;

export function registerAuthRoutes(app: express.Express) {

}
