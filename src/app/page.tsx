
/**
 * !! ANTES DE EDITAR ESTE ARCHIVO, REVISA LAS DIRECTRICES EN LOS SIGUIENTES DOCUMENTOS: !!
 * - /README.md
 * - /src/AGENTS.md
 * 
 * Este componente maneja la autenticación (inicio de sesión, registro, etc.).
 * Un cambio incorrecto aquí puede impedir que los usuarios accedan a la aplicación.
 */

'use client';

import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signInWithPopup,
  GoogleAuthProvider,
  sendPasswordResetEmail,
  updateProfile,
} from 'firebase/auth';
import { auth, createUserProfile, getUserProfile, sendEmailVerification } from '@/lib/firebase';
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
import { useToast } from '@/hooks/use-toast';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { useState } from 'react';
import { Loader2 } from 'lucide-react';

const signInSchema = z.object({
  email: z.string().email({ message: 'Invalid email address.' }),
  password: z.string().min(1, { message: 'Password is required.' }),
});

const signUpSchema = z.object({
  name: z.string().min(2, { message: 'Name must be at least 2 characters.' }),
  email: z.string().email({ message: 'Invalid email address.' }),
  password: z.string().min(6, { message: 'Password must be at least 6 characters.' }),
});

const resetPasswordSchema = z.object({
    email: z.string().email({ message: 'Invalid email address.' }),
});

export default function AuthenticationPage() {
  const router = useRouter();
  const { toast } = useToast();
  const [showResetForm, setShowResetForm] = useState(false);

  // Separate loading states for each form submission
  const [isSigningIn, setIsSigningIn] = useState(false);
  const [isSigningUp, setIsSigningUp] = useState(false);
  const [isResetting, setIsResetting] = useState(false);
  const [isGoogleSigningIn, setIsGoogleSigningIn] = useState(false);

  const signInForm = useForm<z.infer<typeof signInSchema>>({
    resolver: zodResolver(signInSchema),
    defaultValues: { email: '', password: '' },
  });

  const signUpForm = useForm<z.infer<typeof signUpSchema>>({
    resolver: zodResolver(signUpSchema),
    defaultValues: { name: '', email: '', password: '' },
  });
  
  const resetPasswordForm = useForm<z.infer<typeof resetPasswordSchema>>({
    resolver: zodResolver(resetPasswordSchema),
    defaultValues: { email: '' },
  });

  const handleRedirectBasedOnRole = async (user: any) => {
    const profile = await getUserProfile(user.uid);
    if (profile?.accountStatus === 'suspended') {
        await auth.signOut();
        toast({
            title: 'Account Suspended',
            description: (
              <span>
                Your account has been suspended. Please{' '}
                <a
                  href="https://t.me/YourSubSuport"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="font-bold underline"
                >
                  contact support
                </a>
                .
              </span>
            ),
            variant: 'destructive',
            duration: 8000,
        });
        router.push('/');
        return;
    }

    if (profile?.role === 'admin') {
        router.push('/admin');
    } else {
        router.push('/dashboard');
    }
  }

  const handleSignIn = async (values: z.infer<typeof signInSchema>) => {
    setIsSigningIn(true);
    try {
      const userCredential = await signInWithEmailAndPassword(auth, values.email, values.password);
      const user = userCredential.user;

      if (!user.emailVerified) {
          await auth.signOut();
          toast({
              title: 'Email Not Verified',
              description: 'Please check your inbox and verify your email address to log in.',
              variant: 'destructive',
          });
          return;
      }

      await handleRedirectBasedOnRole(user);
    } catch (error: any) {
      toast({
        title: 'Authentication Error',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setIsSigningIn(false);
    }
  };

  const handleSignUp = async (values: z.infer<typeof signUpSchema>) => {
    setIsSigningUp(true);
    try {
      const userCredential = await createUserWithEmailAndPassword(auth, values.email, values.password);
      const user = userCredential.user;
      
      await updateProfile(user, { displayName: values.name });
      await createUserProfile(user);
      
      await sendEmailVerification(user);
      toast({
          title: 'Verification Email Sent',
          description: 'Please check your inbox to verify your email address.',
      });

      router.push('/dashboard');
    } catch (error: any) {
      toast({
        title: 'Authentication Error',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setIsSigningUp(false);
    }
  };

  const handleGoogleSignIn = async () => {
    setIsGoogleSigningIn(true);
    try {
      const provider = new GoogleAuthProvider();
      const result = await signInWithPopup(auth, provider);
      const user = result.user;

      if (!user.emailVerified) {
        await auth.signOut();
        toast({
          title: 'Email Not Verified',
          description: 'Your Google account email is not verified. Please verify it to continue.',
          variant: 'destructive',
        });
        return;
      }
      
      await createUserProfile(user);
      await handleRedirectBasedOnRole(user);

    } catch (error: any) {
      toast({
        title: 'Google Sign-In Error',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setIsGoogleSigningIn(false);
    }
  };

  const handlePasswordReset = async (values: z.infer<typeof resetPasswordSchema>) => {
    setIsResetting(true);
    try {
      await sendPasswordResetEmail(auth, values.email);
      toast({
        title: 'Password Reset Email Sent',
        description: 'Check your inbox for instructions to reset your password.',
      });
      setShowResetForm(false);
    } catch (error: any) {
        toast({
            title: 'Error',
            description: error.message,
            variant: 'destructive',
        });
    } finally {
        setIsResetting(false);
    }
  }

  const isLoading = isSigningIn || isSigningUp || isResetting || isGoogleSigningIn;

  return (
    <main className="flex min-h-screen w-full flex-col items-center justify-center bg-background p-4 sm:p-6">
      <div className="absolute top-4 left-4 sm:top-8 sm:left-8">
        <Logo />
      </div>
      
        <Card className="w-full max-w-md shadow-2xl">
          <CardHeader className="text-center px-4 sm:px-6">
            <CardTitle className="text-xl sm:text-2xl font-bold tracking-tight text-primary">
              {showResetForm ? 'Reset Password' : 'Welcome to YourSubLink'}
            </CardTitle>
            <CardDescription className="text-sm">
              {showResetForm ? 'Enter your email to receive a reset link.' : 'Enter your credentials to access your account'}
            </CardDescription>
          </CardHeader>
          <CardContent className="px-4 sm:px-6">
            {showResetForm ? (
                 <Form {...resetPasswordForm}>
                    <form onSubmit={resetPasswordForm.handleSubmit(handlePasswordReset)} className="space-y-4 pt-4">
                        <FormField
                            control={resetPasswordForm.control}
                            name="email"
                            render={({ field }) => (
                            <FormItem>
                                <FormLabel>Email</FormLabel>
                                <FormControl>
                                <Input
                                    type="email"
                                    placeholder="m@example.com"
                                    {...field}
                                />
                                </FormControl>
                                <FormMessage />
                            </FormItem>
                            )}
                        />
                        <Button type="submit" className="w-full font-semibold" disabled={isResetting}>
                            {isResetting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                            Send Reset Email
                        </Button>
                        <Button variant="link" className="w-full" onClick={() => setShowResetForm(false)}>
                            Back to Sign In
                        </Button>
                    </form>
                </Form>
            ) : (
                <Tabs defaultValue="signin" className="w-full">
                    <TabsList className="grid w-full grid-cols-2">
                        <TabsTrigger value="signin">Sign In</TabsTrigger>
                        <TabsTrigger value="signup">Sign Up</TabsTrigger>
                    </TabsList>
                    <TabsContent value="signin">
                        <Form {...signInForm}>
                            <form
                            onSubmit={signInForm.handleSubmit(handleSignIn)}
                            className="space-y-4 pt-4"
                            >
                            <FormField
                                control={signInForm.control}
                                name="email"
                                render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Email</FormLabel>
                                    <FormControl>
                                    <Input
                                        type="email"
                                        placeholder="m@example.com"
                                        {...field}
                                    />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                                )}
                            />
                            <FormField
                                control={signInForm.control}
                                name="password"
                                render={({ field }) => (
                                <FormItem>
                                    <div className="flex items-center justify-between">
                                        <FormLabel>Password</FormLabel>
                                        <Button variant="link" type="button" size="sm" className="h-auto p-0 text-xs" onClick={() => setShowResetForm(true)}>
                                            Forgot password?
                                        </Button>
                                    </div>
                                    <FormControl>
                                    <Input type="password" {...field} />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                                )}
                            />
                            <Button type="submit" className="w-full font-semibold" disabled={isSigningIn}>
                                {isSigningIn && (
                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                )}
                                Sign In
                            </Button>
                            </form>
                        </Form>
                    </TabsContent>
                    <TabsContent value="signup">
                    <Form {...signUpForm}>
                        <form
                        onSubmit={signUpForm.handleSubmit(handleSignUp)}
                        className="space-y-4 pt-4"
                        >
                        <FormField
                            control={signUpForm.control}
                            name="name"
                            render={({ field }) => (
                            <FormItem>
                                <FormLabel>Name</FormLabel>
                                <FormControl>
                                <Input placeholder="Max Robinson" {...field} />
                                </FormControl>
                                <FormMessage />
                            </FormItem>
                            )}
                        />
                        <FormField
                            control={signUpForm.control}
                            name="email"
                            render={({ field }) => (
                            <FormItem>
                                <FormLabel>Email</FormLabel>
                                <FormControl>
                                <Input
                                    type="email"
                                    placeholder="m@example.com"
                                    {...field}
                                />
                                </FormControl>
                                <FormMessage />
                            </FormItem>
                            )}
                        />
                        <FormField
                            control={signUpForm.control}
                            name="password"
                            render={({ field }) => (
                            <FormItem>
                                <FormLabel>Password</FormLabel>
                                <FormControl>
                                <Input type="password" {...field} />
                                </FormControl>
                                <FormMessage />
                            </FormItem>
                            )}
                        />
                        <Button type="submit" className="w-full font-semibold" disabled={isSigningUp}>
                            {isSigningUp && (
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            )}
                            Sign Up
                        </Button>
                        </form>
                    </Form>
                    </TabsContent>
                    <>
                        <div className="relative my-4">
                            <div className="absolute inset-0 flex items-center">
                                <span className="w-full border-t" />
                            </div>
                            <div className="relative flex justify-center text-xs uppercase">
                                <span className="bg-card px-2 text-muted-foreground">
                                Or continue with
                                </span>
                            </div>
                        </div>
                        <Button
                            variant="outline"
                            className="w-full font-semibold"
                            onClick={handleGoogleSignIn}
                            disabled={isLoading}
                        >
                            {isGoogleSigningIn && (
                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            )}
                            <GoogleIcon className="mr-2 h-5 w-5" />
                            Google
                        </Button>
                    </>
                </Tabs>
            )}
            
          </CardContent>
          {!showResetForm && (
          <CardFooter className="flex flex-col items-center gap-2 text-sm px-4 sm:px-6 pb-4">
            <p className="text-muted-foreground text-center">
              By continuing, you agree to our{' '}
              <a href="#" className="font-medium text-primary hover:underline">
                Terms of Service
              </a>
              .
            </p>
             <a href="https://t.me/YourSubSuport" target="_blank" rel="noopener noreferrer" className="font-medium text-primary hover:underline">
                Contactar con soporte
             </a>
          </CardFooter>
          )}
        </Card>
    </main>
  );
}
