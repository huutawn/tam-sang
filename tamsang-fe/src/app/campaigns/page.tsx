import type { Metadata } from "next";
import { AppLayout } from "@/components/layout";
import { CampaignsPageContent } from "@/components/features/campaigns/campaigns-page-content";

export const metadata: Metadata = {
    title: "Khám Phá Chiến Dịch | Tamsang",
    description:
        "Khám phá các chiến dịch từ thiện minh bạch được xác minh bởi AI và theo dõi trên blockchain. Quyên góp tạo tác động thực sự.",
    openGraph: {
        title: "Khám Phá Chiến Dịch | Tamsang",
        description:
            "Khám phá các chiến dịch từ thiện minh bạch được xác minh bởi AI và theo dõi trên blockchain.",
        type: "website",
    },
};

export default function CampaignsPage() {
    return (
        <AppLayout>
            <CampaignsPageContent />
        </AppLayout>
    );
}
