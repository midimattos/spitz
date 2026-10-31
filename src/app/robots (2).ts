import type { MetadataRoute } from "next";
import { urlBase } from "@/lib/url-base";

export default async function robots(): Promise<MetadataRoute.Robots> {
  const base = await urlBase();
  return {
    rules: [{ userAgent: "*", allow: "/", disallow: ["/api/", "/admin", "/dashboard/", "/contrato/", "/confirmar/", "/avaliar/", "/redefinir-senha/"] }],
    ...(base ? { sitemap: `${base}/sitemap.xml` } : {}),
  };
}
