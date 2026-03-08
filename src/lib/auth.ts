import { getAdminAuth } from "@/lib/firebase/admin";
import type { AuthenticatedRequestContext } from "@/lib/types";
import { AUTH_COOKIE_NAME } from "@/lib/auth-constants";

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

function getCookieToken(request: Request): string | null {
  const cookieHeader = request.headers.get("cookie");
  if (!cookieHeader) {
    return null;
  }

  const cookies = cookieHeader.split(";").map((entry) => entry.trim());
  for (const cookie of cookies) {
    if (!cookie.startsWith(`${AUTH_COOKIE_NAME}=`)) {
      continue;
    }

    const value = cookie.slice(`${AUTH_COOKIE_NAME}=`.length).trim();
    if (!value) {
      return null;
    }
    return decodeURIComponent(value);
  }

  return null;
}

async function decodeAuthToken(
  token: string,
  options?: { checkRevoked?: boolean },
): Promise<AuthenticatedRequestContext | null> {
  try {
    const decoded = await getAdminAuth().verifyIdToken(token, Boolean(options?.checkRevoked));
    return {
      uid: decoded.uid,
      email: decoded.email ?? null,
    };
  } catch {
    return null;
  }
}

export async function getAuthenticatedRequestContext(
  request: Request,
  options?: { checkRevoked?: boolean },
): Promise<AuthenticatedRequestContext | null> {
  const token = getBearerToken(request);
  if (!token) {
    return null;
  }

  return decodeAuthToken(token, options);
}

export async function getAuthenticatedRequestContextWithCookieFallback(
  request: Request,
  options?: { checkRevoked?: boolean },
): Promise<AuthenticatedRequestContext | null> {
  const bearerContext = await getAuthenticatedRequestContext(request, options);
  if (bearerContext) {
    return bearerContext;
  }

  const cookieToken = getCookieToken(request);
  if (!cookieToken) {
    return null;
  }

  return decodeAuthToken(cookieToken, options);
}
