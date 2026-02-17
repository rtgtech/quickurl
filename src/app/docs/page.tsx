import { DocsPage } from "@/components/docs/docs-page";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "QuickURL Docs",
  description:
    "QuickURL documentation for GUI usage, public API endpoints, redirect behavior, TTL, errors, security, and deployment notes.",
};

export default function DocumentationPage() {
  return <DocsPage />;
}
