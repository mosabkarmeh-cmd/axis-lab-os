export async function safeApiFetch<T = any>(url: string, options?: RequestInit): Promise<T | null> {
  try {
    const response = await fetch(url, options);
    if (!response.ok) return null;
    const contentType = response.headers.get("content-type");
    if (!contentType || !contentType.includes("application/json")) return null;
    return await response.json() as T;
  } catch {
    return null;
  }
}

export async function apiFetchJson<T = unknown>(url: string, options?: RequestInit): Promise<T> {
  const response = await fetch(url, options);
  const contentType = response.headers.get("content-type") || "";
  const body = contentType.includes("application/json") ? await response.json() : null;
  if (!response.ok) {
    const message = body && typeof body === "object" && "error" in body
      ? String((body as { error: unknown }).error)
      : body && typeof body === "object" && "message" in body
        ? String((body as { message: unknown }).message)
        : `Request failed (${response.status})`;
    throw new Error(message);
  }
  return body as T;
}
