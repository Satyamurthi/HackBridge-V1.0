import { getPublishedPageSections } from "@/lib/cms-server";
import HomePageClient from "@/components/home/HomePageClient";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function HomePage() {
  const initialSections = await getPublishedPageSections("page_landing");

  return <HomePageClient initialSections={initialSections} />;
}
