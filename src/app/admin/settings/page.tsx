
'use client';

import { useState, useEffect } from 'react';
import { db } from '@/lib/firebase';
import { collection, query, where, getDocs, doc, writeBatch, serverTimestamp, addDoc, onSnapshot, updateDoc, deleteDoc, orderBy } from 'firebase/firestore';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from '@/hooks/use-toast';
import { Loader2, DollarSign, PlusCircle, Trash2 } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import type { Rule } from '@/components/rule-editor';

const RULE_TYPES = {
  like: 'Like a Video',
  comment: 'Comment on a Video',
  subscribe: 'Subscribe to a channel',
  follow: 'Follow on Social Media',
  visit: 'Visit a website',
};

type GlobalRule = Rule & {
    id: string;
    title: string;
    status: 'active' | 'inactive';
    scope: 'all' | 'specific';
    targetLinkIds?: string[];
    createdAt: any;
};

export default function AdminSettingsPage() {
    // State for CPM section
    const [activeCpm, setActiveCpm] = useState<number | null>(null);
    const [activeCpmId, setActiveCpmId] = useState<string | null>(null);
    const [newCpmRate, setNewCpmRate] = useState('');
    const [loadingCpm, setLoadingCpm] = useState(true);
    const [isSubmittingCpm, setIsSubmittingCpm] = useState(false);

    // State for Global Rules section
    const [globalRules, setGlobalRules] = useState<GlobalRule[]>([]);
    const [loadingRules, setLoadingRules] = useState(true);
    const [isSubmittingRule, setIsSubmittingRule] = useState(false);
    
    // Form state for new rule
    const [newRule, setNewRule] = useState({
        title: '',
        type: 'visit' as Rule['type'],
        url: '',
        scope: 'all' as GlobalRule['scope'],
    });

    // Fetch Active CPM
    useEffect(() => {
        const q = query(collection(db, 'cpmHistory'), where('endDate', '==', null));
        const unsubscribe = onSnapshot(q, (snapshot) => {
            if (!snapshot.empty) {
                const cpmDoc = snapshot.docs[0];
                setActiveCpm(cpmDoc.data().rate);
                setActiveCpmId(cpmDoc.id);
            } else {
                setActiveCpm(null);
            }
            setLoadingCpm(false);
        });
        return () => unsubscribe();
    }, []);

    // Listen for Global Rules
    useEffect(() => {
        const rulesQuery = query(collection(db, 'globalRules'), orderBy('createdAt', 'desc'));
        const unsubscribe = onSnapshot(rulesQuery, (snapshot) => {
            const rulesData = snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            } as GlobalRule));
            setGlobalRules(rulesData);
            setLoadingRules(false);
        });
        return () => unsubscribe();
    }, []);

    const handleUpdateCpm = async (e: React.FormEvent) => {
        e.preventDefault();
        const rate = parseFloat(newCpmRate);
        if (isNaN(rate) || rate < 0) {
            toast({ title: 'Invalid Rate', description: 'Please enter a valid positive number (0 is allowed).', variant: 'destructive'});
            return;
        }

        setIsSubmittingCpm(true);
        try {
            const batch = writeBatch(db);
            if (activeCpmId) {
                const oldCpmRef = doc(db, 'cpmHistory', activeCpmId);
                batch.update(oldCpmRef, { endDate: serverTimestamp() });
            }
            const newCpmRef = doc(collection(db, 'cpmHistory'));
            batch.set(newCpmRef, { rate, startDate: serverTimestamp(), endDate: null });
            
            const usersSnapshot = await getDocs(query(collection(db, 'users')));
            const notificationMessage = rate > 0
                ? `The global CPM rate has been updated to $${rate.toFixed(4)}.`
                : 'The global CPM rate has been set to $0.00. Monetization is temporarily paused.';

            usersSnapshot.forEach(userDoc => {
                const notificationRef = doc(collection(db, 'notifications'));
                batch.set(notificationRef, {
                    userId: userDoc.id, type: 'custom_cpm_set', message: notificationMessage,
                    createdAt: serverTimestamp(), isRead: false,
                });
            });

            await batch.commit();
            toast({ title: 'CPM Rate Updated', description: `The new CPM rate of $${rate.toFixed(4)} is now active.` });
            setNewCpmRate('');
        } catch (error: any) {
            toast({ title: 'Error', description: 'Could not update CPM rate.', variant: 'destructive'});
        } finally {
            setIsSubmittingCpm(false);
        }
    };

    const handleCreateRule = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newRule.title || !newRule.url) {
            toast({ title: 'Missing fields', description: 'Please fill out title and URL.', variant: 'destructive' });
            return;
        }
        setIsSubmittingRule(true);
        try {
            await addDoc(collection(db, 'globalRules'), {
                ...newRule,
                status: 'active',
                createdAt: serverTimestamp()
            });
            toast({ title: 'Global Rule Created', description: 'The new rule is now active.' });
            setNewRule({ title: '', type: 'visit', url: '', scope: 'all' });
        } catch (error) {
            toast({ title: 'Error', description: 'Could not create the rule.', variant: 'destructive' });
        } finally {
            setIsSubmittingRule(false);
        }
    };

    const handleToggleRuleStatus = async (rule: GlobalRule) => {
        const newStatus = rule.status === 'active' ? 'inactive' : 'active';
        await updateDoc(doc(db, 'globalRules', rule.id), { status: newStatus });
        toast({ title: 'Rule status updated', description: `Rule "${rule.title}" is now ${newStatus}.` });
    };

    const handleDeleteRule = async (ruleId: string) => {
        if (!confirm('Are you sure you want to permanently delete this global rule?')) return;
        await deleteDoc(doc(db, 'globalRules', ruleId));
        toast({ title: 'Rule deleted', variant: 'destructive' });
    };

    return (
        <div className="flex flex-col gap-6">
            <h1 className="text-2xl font-bold">System Settings</h1>
            
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
                <Card>
                     <form onSubmit={handleUpdateCpm}>
                        <CardHeader>
                            <CardTitle>Set New CPM Rate</CardTitle>
                            <CardDescription>Setting a new rate will end the current one and start a new period. All users will be notified.</CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            {loadingCpm ? (
                                <Skeleton className="h-12 w-1/2" />
                            ) : activeCpm !== null ? (
                                <div className="flex items-center gap-2">
                                    <DollarSign className="h-8 w-8 text-muted-foreground" />
                                    <p className="text-4xl font-bold">${activeCpm.toFixed(4)} <span className="text-lg font-normal text-muted-foreground">Active</span></p>
                                </div>
                            ) : (
                                <p className="text-muted-foreground">No active CPM rate set.</p>
                            )}
                            <div className="space-y-2">
                                <Label htmlFor="new-cpm">New CPM Rate ($)</Label>
                                <Input id="new-cpm" type="number" step="0.0001" placeholder="e.g. 3.50 or 0"
                                    value={newCpmRate} onChange={(e) => setNewCpmRate(e.target.value)} required />
                            </div>
                            <Button type="submit" disabled={isSubmittingCpm}>
                                {isSubmittingCpm && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                Update Rate & Notify Users
                            </Button>
                        </CardContent>
                     </form>
                </Card>

                <Card>
                    <CardHeader>
                        <CardTitle>Global Monetization Rules</CardTitle>
                        <CardDescription>Add rules that will apply to all monetizable links on the platform.</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <form onSubmit={handleCreateRule} className="space-y-4 p-4 border rounded-lg">
                            <h3 className="font-semibold">Create New Global Rule</h3>
                             <div className="space-y-2">
                                <Label htmlFor="rule-title">Rule Title</Label>
                                <Input id="rule-title" placeholder="e.g. Holiday Campaign" value={newRule.title}
                                    onChange={e => setNewRule({...newRule, title: e.target.value})} />
                            </div>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label>Rule Type</Label>
                                    <Select value={newRule.type} onValueChange={(v: Rule['type']) => setNewRule({...newRule, type: v})}>
                                        <SelectTrigger><SelectValue/></SelectTrigger>
                                        <SelectContent>
                                            {Object.entries(RULE_TYPES).map(([key, value]) => (
                                                <SelectItem key={key} value={key}>{value}</SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>
                                 <div className="space-y-2">
                                    <Label>Scope</Label>
                                    <Select value={newRule.scope} onValueChange={(v: GlobalRule['scope']) => setNewRule({...newRule, scope: v})} disabled>
                                        <SelectTrigger><SelectValue/></SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="all">All Links</SelectItem>
                                            <SelectItem value="specific" disabled>Specific Links (Coming soon)</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="rule-url">URL</Label>
                                <Input id="rule-url" placeholder="https://..." value={newRule.url}
                                    onChange={e => setNewRule({...newRule, url: e.target.value})} />
                            </div>
                            <Button type="submit" disabled={isSubmittingRule} className="w-full">
                                {isSubmittingRule && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                <PlusCircle className="mr-2 h-4 w-4" /> Add Global Rule
                            </Button>
                        </form>
                    </CardContent>
                </Card>
            </div>
             <Card>
                <CardHeader>
                    <CardTitle>Manage Global Rules</CardTitle>
                </CardHeader>
                <CardContent>
                    {loadingRules ? <Skeleton className="h-20 w-full" /> : (
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Title</TableHead>
                                <TableHead>Type</TableHead>
                                <TableHead>Status</TableHead>
                                <TableHead className="text-right">Actions</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {globalRules.length === 0 && <TableRow><TableCell colSpan={4} className="h-24 text-center">No global rules created yet.</TableCell></TableRow>}
                            {globalRules.map(rule => (
                                <TableRow key={rule.id}>
                                    <TableCell className="font-semibold">{rule.title}</TableCell>
                                    <TableCell>{RULE_TYPES[rule.type]}</TableCell>
                                    <TableCell>
                                        <Badge variant={rule.status === 'active' ? 'default' : 'secondary'} className={rule.status === 'active' ? 'bg-green-600' : ''}>
                                            {rule.status}
                                        </Badge>
                                    </TableCell>
                                    <TableCell className="text-right space-x-2">
                                        <Switch checked={rule.status === 'active'} onCheckedChange={() => handleToggleRuleStatus(rule)} aria-label="Toggle rule status" />
                                        <Button variant="ghost" size="icon" onClick={() => handleDeleteRule(rule.id)}>
                                            <Trash2 className="h-4 w-4 text-destructive"/>
                                        </Button>
                                    </TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                    )}
                </CardContent>
             </Card>
        </div>
    );

    