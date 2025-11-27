import React, { useEffect, ReactNode } from 'react';
import { useRouter } from 'next/router';
import { isAuthenticated } from '../auth/authService';

interface ProtectedRouteProps {
  children: ReactNode;
}

export default function ProtectedRoute({ children }: ProtectedRouteProps) {
  const router = useRouter();

  useEffect(() => {
    if (!isAuthenticated()) {
      router.replace('/admin/login');
    }
  }, [router]);

  return <>{children}</>;
}