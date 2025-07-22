
'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import { buttonVariants } from '@/components/ui/button';
import { Link as LinkIcon, BarChart3, Settings } from 'lucide-react';

const navItems = [
    {
        href: '/dashboard',
        label: 'Links',
        icon: LinkIcon,
    },
    {
        href: '/dashboard/analytics',
        label: 'Analytics',
        icon: BarChart3,
    },
    {
        href: '#', // Placeholder for future settings page
        label: 'Settings',
        icon: Settings,
    }
]

export function DashboardNav() {
  const pathname = usePathname();

  return (
    <nav className="grid items-start gap-2">
        {navItems.map((item) => {
            const isActive = (item.href === '/dashboard' && pathname === item.href) || (item.href !== '/dashboard' && pathname.startsWith(item.href));
            return (
                 <Link
                    key={item.href}
                    href={item.href}
                    className={cn(
                        buttonVariants({ variant: isActive ? 'default' : 'ghost', size: 'sm' }),
                        'justify-start',
                        item.href === '#' && 'cursor-not-allowed opacity-50'
                    )}
                >
                    <item.icon className="mr-2 h-4 w-4" />
                    {item.label}
                </Link>
            )
        })}
    </nav>
  );
}

    