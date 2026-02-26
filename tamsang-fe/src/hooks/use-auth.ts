import { useMutation, useQueryClient } from "@tanstack/react-query";
import { AuthService, LoginCredentials, RegisterData } from "@/services/auth-service";
import { useAuthStore } from "@/store/auth-store";
import { useRouter } from "next/navigation";

export function useLogin() {
  const router = useRouter();
  const setUser = useAuthStore((state) => state.setUser);

  return useMutation({
    mutationFn: (credentials: LoginCredentials) => AuthService.login(credentials),
    onSuccess: (data) => {
      if (data.success && data.user) {
        setUser(data.user);
        router.push('/');
        router.refresh();
      }
    },
  });
}

export function useRegister() {
  const router = useRouter();

  return useMutation({
    mutationFn: (data: RegisterData) => AuthService.register(data),
    onSuccess: (data) => {
      if (data.success) {
        router.push('/login?registered=true');
      }
    },
  });
}

export function useLogout() {
  const router = useRouter();
  const logoutStore = useAuthStore((state) => state.logout);
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: AuthService.logout,
    onSuccess: () => {
      logoutStore();
      queryClient.clear();
      router.push('/login');
      router.refresh();
    },
  });
}
