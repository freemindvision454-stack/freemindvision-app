import { useQuery } from "@tanstack/react-query";

interface AuthConfig {
  replitAuthEnabled: boolean;
}

export function useAuthConfig() {
  return useQuery<AuthConfig>({
    queryKey: ["/api/auth/config"],
    staleTime: Infinity,
    retry: false,
  });
}
