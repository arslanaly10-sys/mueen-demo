// React Bits islands on the static landing page (public/index.html), built by scripts/build-islands.mjs.
// site.js has already put the page in its language when this runs; a language switch reloads the page.
import { createRoot } from "react-dom/client";
import BlurText from "./bits/BlurText";
import Grainient from "./bits/Grainient";

// Hero lead: the words blur in once (MotionConfig "user" keeps it still under reduced motion).
const lead = document.querySelector<HTMLParagraphElement>(".hero--centred .hero__lead");
if (lead) {
  const host = document.createElement("div");
  host.className = "bits-lead";
  lead.replaceWith(host);
  createRoot(host).render(<BlurText text={lead.textContent ?? ""} className="hero__lead" delay={60} stepDuration={0.3} />);
}

// Hero window ground: a slow grain gradient in the brand's mint and sky, under the product window.
const frame = document.querySelector(".hero--centred .hero__window");
if (frame) {
  const host = document.createElement("div");
  host.className = "bits-ground";
  host.setAttribute("aria-hidden", "true");
  frame.prepend(host);
  createRoot(host).render(<Grainient colors={["#B9D8E0", "#A9CDB9", "#E4F1EB"]} interactive={false} grainAmount={0.05} speed={0.6} />);
}
