import type { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://yta.indalsingh.dev";

  return {
    rules: {
      userAgent: "*",
      allow: ["/", "/about", "/features", "/changelog"],
      disallow: ["/api/"],
    },
    sitemap: `${baseUrl}/sitemap.xml`,
  };
}
