"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { useState } from "react";
import Link from "next/link";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useRegister } from "@/hooks/use-auth";
import {
    Heart,
    Loader2,
    Mail,
    Lock,
    Eye,
    EyeOff,
    ArrowRight,
    User,
    Phone,
} from "lucide-react";

/* ─── Step 1 schema ─── */
const step1Schema = z.object({
    fullName: z
        .string()
        .min(2, { message: "Họ và tên tối thiểu 2 ký tự" }),
    email: z.string().email({ message: "Email không hợp lệ" }),
    phone: z
        .string()
        .regex(/^(0|\+84)\d{9,10}$/, { message: "Số điện thoại không hợp lệ" }),
});

/* ─── Step 2 schema ─── */
const step2Schema = z
    .object({
        password: z.string().min(6, { message: "Mật khẩu tối thiểu 6 ký tự" }),
        confirmPassword: z.string(),
    })
    .refine((data) => data.password === data.confirmPassword, {
        message: "Mật khẩu không khớp",
        path: ["confirmPassword"],
    });

type Step1Values = z.infer<typeof step1Schema>;
type Step2Values = z.infer<typeof step2Schema>;

export function RegisterForm() {
    const [step, setStep] = useState(1);
    const [step1Data, setStep1Data] = useState<Step1Values | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [showPassword, setShowPassword] = useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = useState(false);

    const { mutate: registerUser, isPending } = useRegister();

    /* ─── Step 1 form ─── */
    const form1 = useForm<Step1Values>({
        resolver: zodResolver(step1Schema),
        defaultValues: step1Data || { fullName: "", email: "", phone: "" },
    });

    /* ─── Step 2 form ─── */
    const form2 = useForm<Step2Values>({
        resolver: zodResolver(step2Schema),
    });

    const handleStep1 = (data: Step1Values) => {
        setStep1Data(data);
        setStep(2);
    };

    const handleStep2 = (data: Step2Values) => {
        if (!step1Data) return;
        setError(null);
        registerUser(
            {
                fullName: step1Data.fullName,
                email: step1Data.email,
                phone: step1Data.phone,
                password: data.password,
            },
            {
                onError: (err: any) => {
                    setError(
                        err.response?.data?.message || "Đăng ký thất bại, vui lòng thử lại"
                    );
                },
            }
        );
    };

    return (
        <div className="w-full max-w-md mx-auto">
            {/* Logo */}
            <Link href="/" className="inline-flex items-center gap-2.5 mb-8">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-emerald-500 to-emerald-700 shadow-md">
                    <Heart className="h-5 w-5 text-white" />
                </div>
                <span className="text-xl font-bold text-gray-800">Tam Sang</span>
            </Link>

            {/* Heading */}
            <h1 className="text-3xl font-bold text-gray-900 mb-1">Tạo tài khoản</h1>
            <p className="text-sm text-gray-500 mb-6">
                Tham gia cùng 50,000+ người đang thay đổi thế giới
            </p>

            {/* Step indicator */}
            <div className="flex items-center gap-0 mb-8">
                {/* Step 1 */}
                <div className="flex items-center gap-2">
                    <div
                        className={`flex h-7 w-7 items-center justify-center rounded-full text-xs font-bold transition-colors ${step >= 1
                                ? "bg-emerald-600 text-white"
                                : "bg-gray-200 text-gray-500"
                            }`}
                    >
                        1
                    </div>
                    <span
                        className={`text-sm font-medium ${step >= 1 ? "text-gray-800" : "text-gray-400"
                            }`}
                    >
                        Thông tin cơ bản
                    </span>
                </div>

                {/* Connector */}
                <div className="flex-1 mx-3">
                    <div
                        className={`h-0.5 rounded-full transition-colors ${step >= 2 ? "bg-emerald-500" : "bg-gray-200"
                            }`}
                    />
                </div>

                {/* Step 2 */}
                <div className="flex items-center gap-2">
                    <div
                        className={`flex h-7 w-7 items-center justify-center rounded-full text-xs font-bold transition-colors ${step >= 2
                                ? "bg-emerald-600 text-white"
                                : "bg-gray-200 text-gray-500"
                            }`}
                    >
                        2
                    </div>
                    <span
                        className={`text-sm font-medium ${step >= 2 ? "text-gray-800" : "text-gray-400"
                            }`}
                    >
                        Bảo mật
                    </span>
                </div>
            </div>

            {/* Error message */}
            {error && (
                <div className="mb-4 rounded-xl bg-red-50 border border-red-200 p-3 text-sm text-red-600 font-medium">
                    {error}
                </div>
            )}

            {/* ─── Step 1: Basic info ─── */}
            {step === 1 && (
                <form onSubmit={form1.handleSubmit(handleStep1)} className="space-y-5">
                    {/* Full name */}
                    <div className="space-y-1.5">
                        <Label
                            htmlFor="fullName"
                            className="text-sm font-medium text-gray-700"
                        >
                            Họ và tên
                        </Label>
                        <div className="relative">
                            <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                            <Input
                                id="fullName"
                                placeholder="Nguyễn Văn A"
                                className="pl-10 h-12 rounded-xl border-gray-200 bg-gray-50/50 focus:bg-white transition-colors"
                                {...form1.register("fullName")}
                            />
                        </div>
                        {form1.formState.errors.fullName && (
                            <p className="text-xs text-red-500 mt-1">
                                {form1.formState.errors.fullName.message}
                            </p>
                        )}
                    </div>

                    {/* Email */}
                    <div className="space-y-1.5">
                        <Label
                            htmlFor="email"
                            className="text-sm font-medium text-gray-700"
                        >
                            Email
                        </Label>
                        <div className="relative">
                            <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                            <Input
                                id="email"
                                type="email"
                                placeholder="email@example.com"
                                className="pl-10 h-12 rounded-xl border-gray-200 bg-gray-50/50 focus:bg-white transition-colors"
                                {...form1.register("email")}
                            />
                        </div>
                        {form1.formState.errors.email && (
                            <p className="text-xs text-red-500 mt-1">
                                {form1.formState.errors.email.message}
                            </p>
                        )}
                    </div>

                    {/* Phone */}
                    <div className="space-y-1.5">
                        <Label
                            htmlFor="phone"
                            className="text-sm font-medium text-gray-700"
                        >
                            Số điện thoại
                        </Label>
                        <div className="relative">
                            <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                            <Input
                                id="phone"
                                type="tel"
                                placeholder="0912 345 678"
                                className="pl-10 h-12 rounded-xl border-gray-200 bg-gray-50/50 focus:bg-white transition-colors"
                                {...form1.register("phone")}
                            />
                        </div>
                        {form1.formState.errors.phone && (
                            <p className="text-xs text-red-500 mt-1">
                                {form1.formState.errors.phone.message}
                            </p>
                        )}
                    </div>

                    {/* Next step button */}
                    <Button
                        className="w-full h-12 bg-gradient-to-r from-emerald-600 to-emerald-700 hover:from-emerald-700 hover:to-emerald-800 text-white rounded-xl font-semibold text-base shadow-lg shadow-emerald-500/20 transition-all duration-300"
                        type="submit"
                    >
                        Tiếp theo <ArrowRight className="ml-2 h-4 w-4" />
                    </Button>
                </form>
            )}

            {/* ─── Step 2: Security ─── */}
            {step === 2 && (
                <form onSubmit={form2.handleSubmit(handleStep2)} className="space-y-5">
                    {/* Password */}
                    <div className="space-y-1.5">
                        <Label
                            htmlFor="password"
                            className="text-sm font-medium text-gray-700"
                        >
                            Mật khẩu
                        </Label>
                        <div className="relative">
                            <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                            <Input
                                id="password"
                                type={showPassword ? "text" : "password"}
                                placeholder="Tối thiểu 6 ký tự"
                                className="pl-10 pr-10 h-12 rounded-xl border-gray-200 bg-gray-50/50 focus:bg-white transition-colors"
                                {...form2.register("password")}
                            />
                            <button
                                type="button"
                                onClick={() => setShowPassword(!showPassword)}
                                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
                            >
                                {showPassword ? (
                                    <EyeOff className="h-4 w-4" />
                                ) : (
                                    <Eye className="h-4 w-4" />
                                )}
                            </button>
                        </div>
                        {form2.formState.errors.password && (
                            <p className="text-xs text-red-500 mt-1">
                                {form2.formState.errors.password.message}
                            </p>
                        )}
                    </div>

                    {/* Confirm Password */}
                    <div className="space-y-1.5">
                        <Label
                            htmlFor="confirmPassword"
                            className="text-sm font-medium text-gray-700"
                        >
                            Xác nhận mật khẩu
                        </Label>
                        <div className="relative">
                            <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                            <Input
                                id="confirmPassword"
                                type={showConfirmPassword ? "text" : "password"}
                                placeholder="Nhập lại mật khẩu"
                                className="pl-10 pr-10 h-12 rounded-xl border-gray-200 bg-gray-50/50 focus:bg-white transition-colors"
                                {...form2.register("confirmPassword")}
                            />
                            <button
                                type="button"
                                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
                            >
                                {showConfirmPassword ? (
                                    <EyeOff className="h-4 w-4" />
                                ) : (
                                    <Eye className="h-4 w-4" />
                                )}
                            </button>
                        </div>
                        {form2.formState.errors.confirmPassword && (
                            <p className="text-xs text-red-500 mt-1">
                                {form2.formState.errors.confirmPassword.message}
                            </p>
                        )}
                    </div>

                    {/* Buttons row */}
                    <div className="flex gap-3">
                        <Button
                            variant="outline"
                            className="flex-1 h-12 rounded-xl border-gray-200 text-gray-700 hover:bg-gray-50 font-semibold"
                            type="button"
                            onClick={() => setStep(1)}
                        >
                            Quay lại
                        </Button>
                        <Button
                            className="flex-[2] h-12 bg-gradient-to-r from-emerald-600 to-emerald-700 hover:from-emerald-700 hover:to-emerald-800 text-white rounded-xl font-semibold text-base shadow-lg shadow-emerald-500/20 transition-all duration-300"
                            type="submit"
                            disabled={isPending}
                        >
                            {isPending ? (
                                <>
                                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                    Đang tạo...
                                </>
                            ) : (
                                <>
                                    Tạo tài khoản <ArrowRight className="ml-2 h-4 w-4" />
                                </>
                            )}
                        </Button>
                    </div>
                </form>
            )}

            {/* Divider */}
            <div className="relative my-6">
                <div className="absolute inset-0 flex items-center">
                    <div className="w-full border-t border-gray-200" />
                </div>
                <div className="relative flex justify-center text-sm">
                    <span className="bg-white px-4 text-gray-400">
                        Hoặc đăng ký với
                    </span>
                </div>
            </div>

            {/* Social register */}
            <div className="grid grid-cols-2 gap-3">
                <Button
                    variant="outline"
                    className="h-11 rounded-xl border-gray-200 hover:bg-gray-50 font-medium text-gray-700"
                    type="button"
                >
                    <svg className="h-5 w-5 mr-2" viewBox="0 0 24 24">
                        <path
                            d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 01-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z"
                            fill="#4285F4"
                        />
                        <path
                            d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                            fill="#34A853"
                        />
                        <path
                            d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                            fill="#FBBC05"
                        />
                        <path
                            d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                            fill="#EA4335"
                        />
                    </svg>
                    Google
                </Button>
                <Button
                    variant="outline"
                    className="h-11 rounded-xl border-gray-200 hover:bg-gray-50 font-medium text-gray-700"
                    type="button"
                >
                    <svg className="h-5 w-5 mr-2" fill="#1877F2" viewBox="0 0 24 24">
                        <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
                    </svg>
                    Facebook
                </Button>
            </div>

            {/* Login link */}
            <p className="text-center text-sm text-gray-500 mt-8">
                Đã có tài khoản?{" "}
                <Link
                    href="/login"
                    className="font-semibold text-emerald-700 hover:text-emerald-800 transition-colors"
                >
                    Đăng nhập ngay
                </Link>
            </p>
        </div>
    );
}
