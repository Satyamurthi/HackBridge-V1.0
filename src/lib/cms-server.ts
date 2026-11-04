import { prisma } from "@/lib/db";
import { CMS_DEFAULT_PAGES } from "@/lib/cms-defaults";

/**
 * Server-side helper to fetch published sections for any page from SQLite.
 * Falls back to default template if not yet published.
 */
export async function getPublishedPageSections(pageKey: string): Promise<any[]> {
  try {
    const record = await prisma.siteContent.findUnique({
      where: { key: pageKey },
    });

    if (record?.jsonValue) {
      const parsed = JSON.parse(record.jsonValue);
      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed;
      }
    }
  } catch (err) {
    console.error(`[CMS Server] Error fetching sections for ${pageKey}:`, err);
  }

  const def = CMS_DEFAULT_PAGES.find((p) => p.key === pageKey);
  return def ? def.defaultSections : [];
}

/**
 * Server-side helper returning full metadata and sections for a page.
 */
export async function getPublishedPageData(pageKey: string) {
  try {
    const record = await prisma.siteContent.findUnique({
      where: { key: pageKey },
    });

    if (record) {
      let parsed: any[] = [];
      try {
        parsed = JSON.parse(record.jsonValue);
      } catch {
        parsed = [];
      }
      return {
        key: record.key,
        sections: parsed,
        version: record.version,
        published: record.published,
      };
    }
  } catch (err) {
    console.error(`[CMS Server] Error fetching record for ${pageKey}:`, err);
  }

  const def = CMS_DEFAULT_PAGES.find((p) => p.key === pageKey);
  return {
    key: pageKey,
    sections: def ? def.defaultSections : [],
    version: 1,
    published: true,
  };
}
