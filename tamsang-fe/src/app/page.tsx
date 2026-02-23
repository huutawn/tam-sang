import { HeroSection } from "@/components/features/landing/hero-section";
import { LiveDonations } from "@/components/features/landing/live-donations";
import { FeaturedCampaigns } from "@/components/features/landing/featured-campaigns";
import { AppLayout } from "@/components/layout";

export default function Home() {
  return (
    <AppLayout>
      <HeroSection />
      <LiveDonations />
      <FeaturedCampaigns />
    </AppLayout>
  );
}
