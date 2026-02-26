import { RegisterForm } from "@/components/features/auth/register-form";
import { AuthLayout } from "@/components/features/auth/auth-layout";
import { ShieldCheck, Link2 } from "lucide-react";

export default function RegisterPage() {
    return (
        <AuthLayout
            backgroundImage="/auth-register-bg.png"
            testimonial={{
                quote:
                    "Tôi đã gây quỹ được 120 triệu đồng cho bé Minh trong vòng 2 tuần. Mọi người tin tưởng vì thấy từng đồng tiền được ghi lại rõ ràng.",
                name: "Trần Văn Đức",
                role: "Người tổ chức chiến dịch • TP.HCM",
            }}
            featureCards={[
                {
                    icon: <ShieldCheck className="h-5 w-5" />,
                    title: "AI Guardian",
                    description:
                        "Hệ thống AI của chúng tôi xác minh danh tính qua FaceID và OCR căn cước công dân, đảm bảo mọi chiến dịch đều minh bạch.",
                },
                {
                    icon: <Link2 className="h-5 w-5" />,
                    title: "Blockchain Ledger",
                    description: "Mọi giao dịch đều có thể kiểm tra",
                    tags: ["Minh bạch", "Bất biến", "Thời gian thực"],
                },
            ]}
        >
            <RegisterForm />
        </AuthLayout>
    );
}
