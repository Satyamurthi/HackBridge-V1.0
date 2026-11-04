import { getPublishedPageSections } from "@/lib/cms-server";
import HackathonsPageClient from "@/components/hackathons/HackathonsPageClient";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function HackathonsPage() {
  const initialSections = await getPublishedPageSections("page_arenas");

  return <HackathonsPageClient initialSections={initialSections} />;
}
