import type { Metadata } from "next";
import { AppLayout } from "@/components/layout";
import { CampaignDetailContent } from "@/components/features/campaigns/campaign-detail-content";
import { CampaignServerService } from "@/services/campaign.server-service";

type PageProps = {
    params: Promise<{ id: string }>;
};

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
    const { id } = await params;

    try {
        const campaign = await CampaignServerService.getCampaignById(id);

        const title = `${campaign.title} | Tamsang`;
        const description = campaign.content
            ? campaign.content.substring(0, 160)
            : "Chiến dịch quyên góp từ thiện minh bạch trên Tamsang.";

        return {
            title,
            description,
            openGraph: {
                title,
                description,
                type: "article",
                images: campaign.images?.[0]
                    ? [{ url: campaign.images[0], width: 1200, height: 630 }]
                    : undefined,
            },
        };
    } catch {
        return {
            title: "Chi tiết chiến dịch | Tamsang",
            description: "Xem chi tiết chiến dịch quyên góp từ thiện minh bạch trên Tamsang.",
        };
    }
}

export default async function CampaignDetailPage({ params }: PageProps) {
    const { id } = await params;

    return (
        <AppLayout>
            <CampaignDetailContent id={id} />
        </AppLayout>
    );
}
