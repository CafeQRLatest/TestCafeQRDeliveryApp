// pages/account.js
// Legacy /account route alias — redirects to /profile.
// BottomNav previously used /account; now uses /profile.
// This file ensures any bookmarked /account links still work.

import { useEffect } from 'react';
import { useRouter }  from 'next/router';

export default function AccountRedirect() {
  const router = useRouter();

  useEffect(() => {
    router.replace('/profile');
  }, [router]);

  return null;
}
