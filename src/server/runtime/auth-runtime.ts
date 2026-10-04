import type express from "express";
import jwt from "jsonwebtoken";

export type UserRecord = {
  id: string;
  email: string;
  fullName: string;
  role: string;
  isActive: boolean;
  passwordHash: string;
  mustChangePassword?: boolean;
};

export interface AuthRuntimeDependencies {
  users: readonly UserRecord[];
  jwtSecret: string;
  jwtIssuer: string;
  jwtAudience: string;
}

export function createAuthRuntime(deps: AuthRuntimeDependencies) {
  if (!deps.jwtSecret || deps.jwtSecret.length < 32) {
    throw new Error("JWT_SECRET must be set and contain at least 32 characters");
  }

  function publicUser(user: UserRecord) {
    return {
      id: user.id,
      email: user.email,
      fullName: user.fullName,
      role: user.role,
      isActive: user.isActive,
      mustChangePassword: Boolean(user.mustChangePassword),
    };
  }

  function generateJWT(user: UserRecord): string {
    return jwt.sign(
      { sub: user.id, email: user.email, fullName: user.fullName, role: user.role },
      deps.jwtSecret,
      {
        algorithm: "HS256",
        expiresIn: "24h",
        issuer: deps.jwtIssuer,
        audience: deps.jwtAudience,
      },
    );
  }

  function getRequestUser(req: express.Request): UserRecord | null {
    const authHeader = req.headers.authorization;
    let token = authHeader?.startsWith("Bearer ") ? authHeader.slice(7) : undefined;
    if (!token && req.cookies) token = req.cookies.axislab_token;
    if (!token) return null;

    try {
      const payload = jwt.verify(token, deps.jwtSecret, {
        algorithms: ["HS256"],
        issuer: deps.jwtIssuer,
        audience: deps.jwtAudience,
      }) as jwt.JwtPayload;
      if (!payload.sub) return null;
      const user = deps.users.find((candidate) => candidate.id === payload.sub);
      return user && user.isActive ? user : null;
    } catch {
      return null;
    }
  }

  return {
    publicUser,
    generateJWT,
    getRequestUser,
  };
}

export const JWT_ISSUER_DEFAULT = process.env.JWT_ISSUER || "axislab-api";
export const JWT_AUDIENCE_DEFAULT = process.env.JWT_AUDIENCE || "axislab-web";
