
'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthState } from 'react-firebase-hooks/auth';
import { auth, db } from '@/lib/firebase';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
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
import { Textarea } from '@/components/ui/textarea';
import { Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Rule, RuleEditor } from '@/components/rule-editor';

export default function CreateLinkPage() {
  const [user] = useAuthState(auth);
  const router = useRouter();
  const { toast } = useToast();

  const [longUrl, setLongUrl] = useState('');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [rules, setRules] = useState<Rule[]>([]);
  
  const [shortenedUrl, setShortenedUrl] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const resetCreateForm = () => {
    setLongUrl('');
    setTitle('');
    setDescription('');
    setRules([]);
    setShortenedUrl(null);
  }

  const handleShorten = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!longUrl || !title || !user) return;

    startTransition(async () => {
      setShortenedUrl(null);
      try {
        const shortId = Math.random().toString(36).substring(2, 8);
        const newLink = {
          userId: user.uid,
          original: longUrl,
          shortId: shortId,
          clicks: 0,
          createdAt: serverTimestamp(),
          title,
          description,
          rules,
          monetizable: rules.length >= 3,
          generatedEarnings: 0,
        };
        // Crear el link y obtener el id real
        const linkDocRef = await addDoc(collection(db, "links"), newLink);
        const linkId = linkDocRef.id;

        // Crear sponsor por defecto para este link usando el id real
        const defaultSponsor = {
          linkId: linkId,
          title: "Apoya a tu creador",
          sponsorUrl: "https://otieu.com/4/9701308",
          isActive: true,
          createdBy: user.uid,
          createdAt: serverTimestamp(),
          // No se agrega expiresAt para que nunca expire
        };
        await addDoc(collection(db, "sponsorRules"), defaultSponsor);

        const url = `${window.location.origin}/link/${shortId}`;
        setShortenedUrl(url);

        // Automatically copy to clipboard and show toast
        navigator.clipboard.writeText(url);
        toast({
            title: "Link Copied!",
            description: "The new link has been copied to your clipboard.",
        });

      } catch (error) {
        console.error(error)
        toast({
          title: "Error creating link",
          description: "There was a problem shortening your link. Please try again.",
          variant: "destructive"
        })
      }
    });
  };

  return (
    <>
        <div className="flex items-center">
            <h1 className="text-lg font-semibold md:text-2xl">Create Link</h1>
        </div>
        <div className="grid gap-6">
            <Card>
                <form onSubmit={handleShorten}>
                    <CardHeader>
                    <CardTitle className="text-xl">Create a new link</CardTitle>
                    <CardDescription>
                        Provide the details for your new link below.
                    </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                    <div className="space-y-2">
                        <Label htmlFor="title">Title</Label>
                        <Input
                        id="title"
                        placeholder="e.g. My YouTube Channel"
                        value={title}
                        onChange={(e) => setTitle(e.target.value)}
                        required
                        />
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="long-url">Destination URL</Label>
                        <Input
                        id="long-url"
                        placeholder="https://example.com/very-long-url-to-shorten"
                        value={longUrl}
                        onChange={(e) => setLongUrl(e.target.value)}
                        required
                        />
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="description">Description (Optional)</Label>
                        <Textarea
                        id="description"
                        placeholder="A short description for your link"
                        value={description}
                        onChange={(e) => setDescription(e.target.value)}
                        />
                    </div>
                    <div className="space-y-2">
                        <Label>Monetization Rules</Label>
                        <p className="text-sm text-muted-foreground">Add at least 3 rules to make this link monetizable.</p>
                        <RuleEditor rules={rules} onRulesChange={setRules} />
                    </div>
                    </CardContent>
                    <CardFooter className="border-t px-6 py-4 flex justify-between">
                    <Button type="submit" disabled={isPending || !!shortenedUrl} className="font-semibold bg-primary text-primary-foreground hover:bg-primary/90">
                        {isPending && (
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        )}
                        Create Link
                    </Button>
                    {shortenedUrl && (
                         <Button type="button" variant="outline" onClick={resetCreateForm}>Create another link</Button>
                    )}
                    </CardFooter>
                </form>
            </Card>
        </div>
    </>
  );
}
