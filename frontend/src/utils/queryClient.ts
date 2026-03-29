import { QueryClient } from '@tanstack/react-query';

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 0, // always refetch on focus, but show cached data instantly
      retry: 1,
    },
  },
});
