
'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import { buttonVariants } from '@/components/ui/button';
import { Home, Users, Link2, Shield, Settings, History, CreditCard, DollarSign } from 'lucide-react';

const navItems = [
    {
        href: '/admin',
        label: 'Dashboard',
        icon: Home,
    },
    {
        href: '/admin/users',
        label: 'Users',
        icon: Users,
    },
    {
        href: '/admin/links',
        label: 'Links',
        icon: Link2,
    },
    {
        href: '/admin/payout-requests',
        label: 'Payout Requests',
        icon: CreditCard,
    },
     {
        href: '/admin/cpm-history',
        label: 'CPM History',
        icon: DollarSign,
    },
    {
        href: '/admin/security',
        label: 'Security',
        icon: Shield,
    },
    {
        href: '/admin/settings',
        label: 'Settings',
        icon: Settings,
    },
    {
        href: '/admin/history',
        label: 'History',
        icon: History,
    }
]

type AdminNavProps = {
    onLinkClick?: () => void;
};

export function AdminNav({ onLinkClick }: AdminNavProps) {
  const pathname = usePathname();

  return (
    <nav className="grid items-start gap-2">
        {navItems.map((item) => {
            const isActive = (item.href === '/admin' && pathname === item.href) || (item.href !== '/admin' && pathname.startsWith(item.href));
            return (
                 <Link
                    key={item.href}
                    href={item.href}
                    onClick={onLinkClick}
                    className={cn(
                        buttonVariants({ variant: isActive ? 'default' : 'ghost', size: 'default' }),
                        'justify-start text-base',
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
