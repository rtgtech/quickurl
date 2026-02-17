import { getAdminAuth } from "@/lib/firebase/admin";
import type { AuthenticatedRequestContext } from "@/lib/types";

export function getBearerToken(request: Request): string | null {
  const authHeader = request.headers.get("authorization") ?? request.headers.get("Authorization");
  if (!authHeader) {
    return null;
  }

  const [type, token] = authHeader.split(" ");
  if (!type || !token || type.toLowerCase() !== "bearer") {
    return null;
  }

  return token.trim();
}

export async function getAuthenticatedRequestContext(
  request: Request,
): Promise<AuthenticatedRequestContext | null> {
  const token = getBearerToken(request);
  if (!token) {
    return null;
  }

  try {
    const decoded = await getAdminAuth().verifyIdToken(token);
    return {
      uid: decoded.uid,
      email: decoded.email ?? null,
    };
  } catch {
    return null;
  }
}
