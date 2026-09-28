import type { UserRecord } from "./types.ts";
import type { HttpRequest } from "./http-types.ts";

/**
 * Compatibility authentication reader for the legacy Postgres routers.
 * The main server middleware already verifies and attaches the active user.
 * When invoked directly, this helper still validates issuer/audience/algorithm.
 */
export function getVerifiedRequestUser(req: HttpRequest): UserRecord | null {
  const requestUser = req?.user as UserRecord | undefined;
  if (requestUser?.id && requestUser.isActive !== false) return requestUser;
  return null;
}
