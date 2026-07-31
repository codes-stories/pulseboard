import { AppFrame, SiteFooter, SiteHeader } from "../../components/site-shell";
import { ForgotPasswordPage } from "../../components/marketing-pages";

export default function ForgotPasswordRoute() {
  return (
    <AppFrame>
      <SiteHeader />
      <main className="page-shell"> <ForgotPasswordPage /> </main>
      <SiteFooter />
    </AppFrame>
  );
}
