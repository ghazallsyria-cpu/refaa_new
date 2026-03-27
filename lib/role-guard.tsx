'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/auth-context';
import type { UserRole } from '@/types';

interface RoleGuardProps {
  allowedRoles: UserRole[];
  children: React.ReactNode;
  redirectTo?: string;
}

/**
 * RoleGuard — يحمي الصفحات بناءً على دور المستخدم
 *
 * الاستخدام:
 * <RoleGuard allowedRoles={['admin', 'management']}>
 *   <AdminPage />
 * </RoleGuard>
 */
export function RoleGuard({ allowedRoles, children, redirectTo = '/dashboard' }: RoleGuardProps) {
  const { userRole, isChecking } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!isChecking && userRole && !allowedRoles.includes(userRole as UserRole)) {
      router.replace(redirectTo);
    }
  }, [userRole, isChecking, allowedRoles, redirectTo, router]);

  if (isChecking) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
      </div>
    );
  }

  if (!userRole || !allowedRoles.includes(userRole as UserRole)) {
    return null;
  }

  return <>{children}</>;
}

/**
 * withRoleGuard — HOC لحماية صفحة كاملة
 *
 * الاستخدام:
 * export default withRoleGuard(AdminPage, ['admin', 'management']);
 */
export function withRoleGuard<P extends object>(
  Component: React.ComponentType<P>,
  allowedRoles: UserRole[],
  redirectTo = '/dashboard'
) {
  return function GuardedComponent(props: P) {
    return (
      <RoleGuard allowedRoles={allowedRoles} redirectTo={redirectTo}>
        <Component {...props} />
      </RoleGuard>
    );
  };
}

// صلاحيات جاهزة لكل دور
export const ROLES = {
  ADMIN_ONLY: ['admin'] as UserRole[],
  ADMIN_MANAGEMENT: ['admin', 'management'] as UserRole[],
  STAFF: ['admin', 'management', 'teacher'] as UserRole[],
  TEACHERS: ['teacher'] as UserRole[],
  STUDENTS: ['student'] as UserRole[],
  PARENTS: ['parent'] as UserRole[],
  STUDENTS_PARENTS: ['student', 'parent'] as UserRole[],
  ALL_AUTHENTICATED: ['admin', 'management', 'teacher', 'student', 'parent'] as UserRole[],
};
