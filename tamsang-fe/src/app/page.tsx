import { HeroSection } from "@/components/features/landing/hero-section";
import { LiveImpactStats } from "@/components/features/landing/live-impact-stats";
import { FeaturedCampaigns } from "@/components/features/landing/featured-campaigns";
import { TrustSection } from "@/components/features/landing/trust-section";
import { AppLayout } from "@/components/layout";

export default function Home() {
  return (
    <AppLayout>
      <HeroSection />
      <LiveImpactStats />
      <FeaturedCampaigns />
      <TrustSection />
    </AppLayout>
  );
}

