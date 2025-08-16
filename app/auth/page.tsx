

/**
 * !! ANTES DE EDITAR ESTE ARCHIVO, REVISA LAS DIRECTRICES EN LOS SIGUIENTES DOCUMENTOS: !!
 * - /README.md
 * - /src/AGENTS.md
 * 
 * Este componente maneja la autenticación (inicio de sesión, registro, etc.).
 * Un cambio incorrecto aquí puede impedir que los usuarios accedan a la aplicación.
 */

'use client';

import { useRouter, useSearchParams } from 'next/navigation';
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
import { useState, useCallback, useEffect, useRef } from 'react';
import { Eye, EyeOff, Loader2 } from 'lucide-react';
import Link from 'next/link';


const signInSchema = z.object({
  email: z.string().email({ message: 'Invalid email address.' }),
  password: z.string().min(1, { message: 'Password is required.' }),
});

const signUpSchema = z.object({
  name: z.string().min(2, { message: 'Name must be at least 2 characters.' }),
  email: z.string().email({ message: 'Invalid email address.' }),
  password: z.string()
    .min(8, { message: 'Password must be at least 8 characters.' })
    .regex(/[a-z]/, { message: 'Password must contain at least one lowercase letter.' })
    .regex(/[A-Z]/, { message: 'Password must contain at least one uppercase letter.' })
    .regex(/[0-9]/, { message: 'Password must contain at least one number.' })
    .regex(/[^a-zA-Z0-9]/, { message: 'Password must contain at least one special character.' }),
  invitationCode: z.string().optional(),
});

const resetPasswordSchema = z.object({
    email: z.string().email({ message: 'Invalid email address.' }),
});

function AuthForm() {
  const router = useRouter();
  const { toast } = useToast();
  const searchParams = useSearchParams();
  const referrerId = searchParams.get('ref');
  const [activeTab, setActiveTab] = useState('signin');
  const [showResetForm, setShowResetForm] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

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
    defaultValues: { name: '', email: '', password: '', invitationCode: referrerId || '' },
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
          setIsSigningIn(false);
          return;
      }

      // Si el usuario es viejo y no tiene referrerId, y hay uno en la URL o formulario, se lo asignamos
      const profile = await getUserProfile(user.uid);
      const invitationCode = signUpForm.getValues ? signUpForm.getValues('invitationCode') : null;
      const refId = invitationCode || referrerId;
      if (typeof profile.referrerId === 'undefined' && refId) {
        await createUserProfile(user, { referrerId: refId });
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
  // Si el usuario ingresó un código de invitación manualmente, úsalo como referrerId, si no, usa el de la URL
  const finalReferrerId = values.invitationCode || referrerId;
  await createUserProfile(user, { referrerId: finalReferrerId });

      await sendEmailVerification(user);

      signUpForm.reset();

      toast({
        title: 'Verification Email Sent',
        description: 'Please check your inbox (and spam folder) to verify your email address before signing in.',
        duration: 8000
      });

      setActiveTab('signin');

    } catch (error: any) {
      if (error.code === 'auth/email-already-in-use') {
        toast({
          title: 'Registration Error',
          description: 'This email address is already registered. Please sign in.',
          variant: 'destructive',
        });
      } else {
        toast({
          title: 'Authentication Error',
          description: error.message,
          variant: 'destructive',
        });
      }
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
      // Obtener el valor actual del campo invitationCode del formulario
      const invitationCode = signUpForm.getValues('invitationCode');
      const refId = invitationCode || referrerId;
      await createUserProfile(user, { referrerId: refId });
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
    <>
      <div className="absolute top-4 left-4 sm:top-8 sm:left-8">
        <Link href="/">
            <Logo />
        </Link>
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
                <>
                    <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
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
                                          <div className="relative">
                                            <Input type={showPassword ? "text" : "password"} {...field} />
                                            <Button
                                                type="button"
                                                variant="ghost"
                                                size="icon"
                                                className="absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7 text-muted-foreground"
                                                onClick={() => setShowPassword(prev => !prev)}
                                            >
                                                {showPassword ? <EyeOff /> : <Eye />}
                                            </Button>
                                          </div>
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
                name="invitationCode"
                render={({ field }) => (
                <FormItem>
                  <FormLabel>Código de invitación (opcional)</FormLabel>
                  <FormControl>
                  <Input placeholder="Código de referido" {...field} />
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
                                        <div className="relative">
                                            <Input type={showPassword ? "text" : "password"} {...field} />
                                            <Button
                                                type="button"
                                                variant="ghost"
                                                size="icon"
                                                className="absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7 text-muted-foreground"
                                                onClick={() => setShowPassword(prev => !prev)}
                                            >
                                                {showPassword ? <EyeOff /> : <Eye />}
                                            </Button>
                                          </div>
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
                    </Tabs>
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
    </>
  );
}


import { Suspense } from 'react';

export default function AuthenticationPage() {
  return (
    <main className="flex min-h-screen w-full flex-col items-center justify-center bg-background p-4 sm:p-6">
      <Suspense fallback={<div>Cargando...</div>}>
        <AuthForm />
      </Suspense>
    </main>
  );
}

    

    
