import type { Metadata } from "next";
import { ProfileContent } from "@/components/features/dashboard/profile-content";

export const metadata: Metadata = {
    title: "Thông tin cá nhân | Tamsang",
    description: "Quản lý hồ sơ cá nhân và xác minh danh tính trên Tamsang.",
};

export default function ThongTinCaNhanPage() {
    return <ProfileContent />;
}
