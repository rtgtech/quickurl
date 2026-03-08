import type { AuthenticatedRequestContext, LinkDocument } from "@/lib/types";

export type AccessOutcome = "allowed" | "unauthenticated" | "forbidden";

export function canAccessLink(
  link: Pick<LinkDocument, "accessMode" | "allowedUserUids">,
  authContext: AuthenticatedRequestContext | null,
): AccessOutcome {
  if (link.accessMode === "public") {
    return "allowed";
  }

  if (!authContext) {
    return "unauthenticated";
  }

  if (link.allowedUserUids.includes(authContext.uid)) {
    return "allowed";
  }

  return "forbidden";
}
