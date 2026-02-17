import { redirect } from "next/navigation";

interface CodePageProps {
  params: Promise<{ code: string }>;
}

export default async function CodePage({ params }: CodePageProps) {
  const { code } = await params;
  redirect(`/r/${encodeURIComponent(code)}`);
}
