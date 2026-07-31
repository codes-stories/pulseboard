import { AppFrame, SiteFooter, SiteHeader } from "../../components/site-shell";
import { ContactPage } from "../../components/marketing-pages";

export default function ContactRoute() {
  return (
    <AppFrame>
      <SiteHeader />
      <main className="page-shell">
        <ContactPage />
      </main>
      <SiteFooter />
    </AppFrame>
  );
}
