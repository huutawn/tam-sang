import { useMutation, useQueryClient } from "@tanstack/react-query";
import { AuthService, LoginCredentials } from "@/services/auth-service";
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
        router.push('/'); // Or handle dynamic redirect
        router.refresh();
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
      queryClient.clear(); // Clear all cached data on logout
      router.push('/login');
      router.refresh();
    },
  });
}
