'use client';

import * as React from 'react';
import Link from "next/link"
import {
  Menu,
} from "lucide-react"

import { Button } from "@/components/ui/button"
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet"
import { UserNav } from '@/components/user-nav';
import { Logo } from '@/components/icons';
import { useUser } from '@/hooks/use-user';
import { useRouter } from 'next/navigation';
import { Skeleton } from '@/components/ui/skeleton';
import { AdminNav } from '@/components/admin-nav';
import { AdminNotificationBell } from '@/components/admin-notification-bell';
import { ThemeSwitcher } from '@/components/theme-switcher';

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const { user, loading, role } = useUser();
  const router = useRouter();
  const [isSheetOpen, setIsSheetOpen] = React.useState(false);

  React.useEffect(() => {
    if (!loading) {
      if (!user) {
        // Not logged in, redirect to auth page
        router.push('/auth');
      } else if (role !== 'admin') {
        // Not an admin, redirect to user dashboard
        router.push('/dashboard');
      }
    }
  }, [user, loading, role, router]);

  const handleLinkClick = () => {
    setIsSheetOpen(false);
  };

  if (loading || !user || role !== 'admin') {
    return (
       <div className="grid min-h-screen w-full md:grid-cols-[220px_1fr] lg:grid-cols-[280px_1fr]">
        <div className="hidden border-r bg-muted/40 md:block">
            <div className="flex h-full max-h-screen flex-col gap-2">
                <div className="flex h-14 items-center border-b px-4 lg:h-[60px] lg:px-6">
                    <Skeleton className="h-8 w-32" />
                </div>
                <div className="flex-1">
                    <nav className="grid items-start gap-2 p-2 text-sm font-medium lg:px-4">
                        <Skeleton className="h-10 w-full" />
                        <Skeleton className="h-10 w-full" />
                        <Skeleton className="h-10 w-full" />
                    </nav>
                </div>
            </div>
        </div>
        <div className="flex flex-col">
            <header className="flex h-14 items-center gap-4 border-b bg-muted/40 px-4 lg:h-[60px] lg:px-6">
                <Skeleton className="h-10 w-10 md:hidden" />
                <div className="w-full flex-1" />
                 <Skeleton className="h-9 w-9 rounded-full" />
            </header>
            <main className="flex flex-1 flex-col gap-4 p-4 lg:gap-6 lg:p-6">
                <Skeleton className="h-[calc(100vh-10rem)] w-full" />
            </main>
        </div>
       </div>
    );
  }

  return (
    <div className="grid min-h-screen w-full md:grid-cols-[220px_1fr] lg:grid-cols-[280px_1fr]">
      <div className="hidden border-r bg-muted/40 md:block">
        <div className="flex h-full max-h-screen flex-col gap-2">
          <div className="flex h-14 items-center border-b px-4 lg:h-[60px] lg:px-6">
            <Link href="/admin" className="flex items-center gap-2 font-semibold">
              <Logo />
              <span className="text-sm bg-primary text-primary-foreground px-2 py-1 rounded-md">Admin</span>
            </Link>
          </div>
          <div className="flex-1 overflow-y-auto">
            <nav className="grid items-start px-2 text-sm font-medium lg:px-4">
              <AdminNav />
            </nav>
          </div>
        </div>
      </div>
      <div className="flex flex-col">
        <header className="flex h-14 items-center gap-4 border-b bg-muted/40 px-4 lg:h-[60px] lg:px-6">
          <Sheet open={isSheetOpen} onOpenChange={setIsSheetOpen}>
            <SheetTrigger asChild>
              <Button
                variant="outline"
                size="icon"
                className="shrink-0 md:hidden"
              >
                <Menu className="h-5 w-5" />
                <span className="sr-only">Toggle navigation menu</span>
              </Button>
            </SheetTrigger>
            <SheetContent side="left" className="flex flex-col">
              <SheetHeader>
                <SheetTitle className="sr-only">Admin Menu</SheetTitle>
              </SheetHeader>
              <nav className="grid gap-2 text-lg font-medium">
                <Link
                  href="/admin"
                  className="flex items-center gap-2 text-lg font-semibold mb-4"
                  onClick={handleLinkClick}
                >
                  <Logo />
                  <span className="text-sm bg-primary text-primary-foreground px-2 py-1 rounded-md">Admin</span>
                </Link>
                <AdminNav onLinkClick={handleLinkClick} />
              </nav>
            </SheetContent>
          </Sheet>
          <div className="w-full flex-1">
            {/* Can add a search bar here later */}
          </div>
          <ThemeSwitcher />
          <AdminNotificationBell />
          <UserNav />
        </header>
        <main className="flex flex-1 flex-col gap-4 p-4 lg:gap-6 lg:p-8">
          {children}
        </main>
      </div>
    </div>
  )
}
