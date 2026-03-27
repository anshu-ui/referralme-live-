import { useEffect } from "react";

type SeoHeadProps = {
  title: string;
  description: string;
  canonicalPath?: string;
  image?: string;
  keywords?: string;
  noindex?: boolean;
  structuredData?: Record<string, unknown> | Record<string, unknown>[];
};

const SITE_URL = "https://referralme.in";
const DEFAULT_IMAGE = `${SITE_URL}/logo.png`;

function upsertMeta(selector: string, attributes: Record<string, string>, content: string) {
  let element = document.head.querySelector<HTMLMetaElement>(selector);
  if (!element) {
    element = document.createElement("meta");
    Object.entries(attributes).forEach(([key, value]) => element!.setAttribute(key, value));
    document.head.appendChild(element);
  }
  element.setAttribute("content", content);
}

function upsertLink(rel: string, href: string) {
  let element = document.head.querySelector<HTMLLinkElement>(`link[rel="${rel}"]`);
  if (!element) {
    element = document.createElement("link");
    element.setAttribute("rel", rel);
    document.head.appendChild(element);
  }
  element.setAttribute("href", href);
}

export default function SeoHead({
  title,
  description,
  canonicalPath = "/",
  image = DEFAULT_IMAGE,
  keywords,
  noindex = false,
  structuredData,
}: SeoHeadProps) {
  useEffect(() => {
    const canonicalUrl = canonicalPath.startsWith("http") ? canonicalPath : `${SITE_URL}${canonicalPath}`;

    document.title = title;

    upsertMeta('meta[name="description"]', { name: "description" }, description);
    upsertMeta('meta[name="robots"]', { name: "robots" }, noindex ? "noindex,nofollow" : "index,follow");
    upsertMeta('meta[property="og:type"]', { property: "og:type" }, "website");
    upsertMeta('meta[property="og:site_name"]', { property: "og:site_name" }, "ReferralMe");
    upsertMeta('meta[property="og:title"]', { property: "og:title" }, title);
    upsertMeta('meta[property="og:description"]', { property: "og:description" }, description);
    upsertMeta('meta[property="og:url"]', { property: "og:url" }, canonicalUrl);
    upsertMeta('meta[property="og:image"]', { property: "og:image" }, image);
    upsertMeta('meta[name="twitter:card"]', { name: "twitter:card" }, "summary_large_image");
    upsertMeta('meta[name="twitter:title"]', { name: "twitter:title" }, title);
    upsertMeta('meta[name="twitter:description"]', { name: "twitter:description" }, description);
    upsertMeta('meta[name="twitter:image"]', { name: "twitter:image" }, image);

    if (keywords) {
      upsertMeta('meta[name="keywords"]', { name: "keywords" }, keywords);
    }

    upsertLink("canonical", canonicalUrl);

    const scriptId = "referralme-seo-structured-data";
    const existingScript = document.getElementById(scriptId);
    if (existingScript) existingScript.remove();

    if (structuredData) {
      const script = document.createElement("script");
      script.id = scriptId;
      script.type = "application/ld+json";
      script.textContent = JSON.stringify(structuredData);
      document.head.appendChild(script);
    }
  }, [title, description, canonicalPath, image, keywords, noindex, structuredData]);

  return null;
}
