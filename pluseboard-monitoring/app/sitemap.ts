import type { MetadataRoute } from "next";

export default function sitemap(): MetadataRoute.Sitemap {
  const routes = ["", "/pricing", "/features", "/docs", "/blog", "/about", "/contact", "/status", "/privacy", "/terms", "/login", "/register", "/forgot-password", "/verify-email", "/dashboard", "/dashboard/monitors", "/dashboard/agents", "/dashboard/alerts", "/dashboard/incidents", "/dashboard/status-pages", "/dashboard/analytics", "/dashboard/settings"];

  return routes.map((path) => ({ url: `https://pulseboard.dev${path}`, lastModified: new Date() }));
}
