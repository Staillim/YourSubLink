
'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import { buttonVariants } from '@/components/ui/button';
import { Link as LinkIcon, BarChart3, Settings, User, CreditCard, PlusSquare } from 'lucide-react';

const navItems = [
    {
        href: '/dashboard',
        label: 'My Links',
        icon: LinkIcon,
        exact: true,
    },
    {
        href: '/dashboard/create',
        label: 'Create Link',
        icon: PlusSquare,
    },
    {
        href: '/dashboard/analytics',
        label: 'Analytics',
        icon: BarChart3,
    },
    {
        href: '/dashboard/payouts',
        label: 'Payouts',
        icon: CreditCard,
    },
    {
        href: '/dashboard/profile',
        label: 'Profile',
        icon: User,
    }
]

type DashboardNavProps = {
    onLinkClick?: () => void;
};

export function DashboardNav({ onLinkClick }: DashboardNavProps) {
  const pathname = usePathname();

  return (
    <nav className="grid items-start gap-2">
        {navItems.map((item) => {
            const isActive = item.exact ? pathname === item.href : pathname.startsWith(item.href);
            return (
                 <Link
                    key={item.href}
                    href={item.href}
                    onClick={onLinkClick}
                    className={cn(
                        buttonVariants({ variant: isActive ? 'default' : 'ghost', size: 'default' }),
                        'justify-start text-base',
                        item.href === '#' && 'cursor-not-allowed opacity-50'
                    )}
                >
                    <item.icon className="mr-4 h-5 w-5" />
                    {item.label}
                </Link>
            )
        })}
    </nav>
  );
}
