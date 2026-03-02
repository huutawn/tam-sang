import type { Metadata } from "next";
import { CampaignManagementContent } from "@/components/features/dashboard/campaign-management-content";

export const metadata: Metadata = {
    title: "Quản lý chiến dịch | Tamsang",
    description: "Theo dõi và quản lý tất cả chiến dịch quyên góp của bạn trên Tamsang.",
};

export default function QuanLyChienDichPage() {
    return <CampaignManagementContent />;
}
