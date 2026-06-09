import { useEffect } from 'react';
import { useRouter } from 'next/router';

// Root index — redirects to /home.
// Auth check will be handled inside /home itself.
export default function Index() {
  const router = useRouter();
  useEffect(() => {
    router.replace('/home');
  }, [router]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-stone-50">
      <div className="w-10 h-10 border-4 border-brand-orange border-t-transparent rounded-full animate-spin" />
    </div>
  );
}
