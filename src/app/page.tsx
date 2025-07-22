'use client';

import Link from 'next/link';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { GoogleIcon, Logo } from '@/components/icons';

export default function AuthenticationPage() {
  return (
    <main className="flex min-h-screen w-full flex-col items-center justify-center bg-background p-4">
      <div className="absolute top-8 left-8">
        <Logo />
      </div>
      <Tabs defaultValue="signin" className="w-full max-w-md">
        <Card className="shadow-2xl">
          <CardHeader className="text-center">
            <CardTitle className="text-2xl font-bold tracking-tight text-primary">
              Welcome to YourSubLink
            </CardTitle>
            <CardDescription>
              Enter your credentials to access your account
            </CardDescription>
          </CardHeader>
          <CardContent>
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="signin">Sign In</TabsTrigger>
              <TabsTrigger value="signup">Sign Up</TabsTrigger>
            </TabsList>
            <TabsContent value="signin">
              <div className="space-y-4 pt-4">
                <div className="space-y-2">
                  <Label htmlFor="email-signin">Email</Label>
                  <Input
                    id="email-signin"
                    type="email"
                    placeholder="m@example.com"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="password-signin">Password</Label>
                  <Input id="password-signin" type="password" required />
                </div>
              </div>
            </TabsContent>
            <TabsContent value="signup">
              <div className="space-y-4 pt-4">
                <div className="space-y-2">
                  <Label htmlFor="name-signup">Name</Label>
                  <Input id="name-signup" placeholder="Max Robinson" required />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="email-signup">Email</Label>
                  <Input
                    id="email-signup"
                    type="email"
                    placeholder="m@example.com"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="password-signup">Password</Label>
                  <Input id="password-signup" type="password" required />
                </div>
              </div>
            </TabsContent>
            <div className="mt-6">
              <Button asChild className="w-full font-semibold" style={{ backgroundColor: 'hsl(var(--primary))', color: 'hsl(var(--primary-foreground))' }}>
                <Link href="/dashboard">Continue</Link>
              </Button>
            </div>
            <div className="relative my-6">
              <div className="absolute inset-0 flex items-center">
                <span className="w-full border-t" />
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-card px-2 text-muted-foreground">
                  Or continue with
                </span>
              </div>
            </div>
            <Button variant="outline" className="w-full font-semibold" asChild>
              <Link href="/dashboard">
                <GoogleIcon className="mr-2 h-5 w-5" />
                Google
              </Link>
            </Button>
          </CardContent>
          <CardFooter className="flex justify-center text-sm">
            <p className="text-muted-foreground">
              By continuing, you agree to our{' '}
              <a href="#" className="font-medium text-primary hover:underline">
                Terms of Service
              </a>
              .
            </p>
          </CardFooter>
        </Card>
      </Tabs>
    </main>
  );
}
