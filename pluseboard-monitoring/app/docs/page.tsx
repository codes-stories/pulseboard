import { AppFrame } from "../../components/site-shell";
import { DocsPageComponent } from "../../components/docs-page";

export const metadata = {
  title: "Documentation — PulseBoard",
  description:
    "Learn how to install, configure, and operate PulseBoard agents and monitors.",
};

export default function DocsRoute() {
  return (
    <AppFrame>
      <DocsPageComponent />
    </AppFrame>
  );
}
