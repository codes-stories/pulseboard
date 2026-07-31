import { AppFrame, SiteFooter, SiteHeader } from "../../components/site-shell";
import { BlogPage } from "../../components/marketing-pages";

export default function BlogRoute() {
  return (
    <AppFrame>
      <SiteHeader />
      <main className="page-shell">
        <BlogPage />
      </main>
      <SiteFooter />
    </AppFrame>
  );
}
