"use client";

import { usePathname } from "next/navigation";
import { AppNotFoundPage } from "@/components/home/not-found-page";

export default function NotFound() {
  const pathname = usePathname();
  return <AppNotFoundPage path={pathname || "(unknown)"} />;
}
