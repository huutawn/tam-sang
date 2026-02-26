import { LoginForm } from "@/components/features/auth/login-form";
import { AuthLayout } from "@/components/features/auth/auth-layout";
import { ShieldCheck, CheckCircle, Users } from "lucide-react";

export default function LoginPage() {
    return (
        <AuthLayout
            backgroundImage="/auth-login-bg.png"
            testimonial={{
                quote:
                    "Mỗi đồng quyên góp đều được ghi lại minh bạch — không ai có thể thay đổi.",
                name: "Nguyễn Thị Lan",
                role: "Người quyên góp thường xuyên",
            }}
            stats={[
                {
                    icon: <ShieldCheck className="h-4 w-4" />,
                    value: "98.7%",
                    label: "Tỷ lệ tiền đến tay người nhận",
                },
                {
                    icon: <Users className="h-4 w-4" />,
                    value: "50K+",
                    label: "Người đã giúp đỡ",
                },
                {
                    icon: <CheckCircle className="h-4 w-4" />,
                    value: "12.4M",
                    label: "USD đã quyên góp",
                },
            ]}
        >
            <LoginForm />
        </AuthLayout>
    );
}
