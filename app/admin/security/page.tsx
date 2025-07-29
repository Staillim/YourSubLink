
'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Shield } from "lucide-react";

export default function AdminSecurityPage() {
    return (
        <div className="flex flex-col gap-6">
            <h1 className="text-2xl font-bold">Security & Anti-bot</h1>

             <Alert>
                <Shield className="h-4 w-4" />
                <AlertTitle>Future Implementation</AlertTitle>
                <AlertDescription>
                    The controls below are visual representations for a future security implementation. Currently, they do not have any real effect on the system's behavior.
                </AlertDescription>
            </Alert>

            <Card>
                <CardHeader>
                    <CardTitle>Anti-Fraud Settings</CardTitle>
                    <CardDescription>Configure rules to prevent bot traffic and fraudulent clicks.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                    <div className="flex items-center justify-between rounded-lg border p-4">
                        <div className="space-y-0.5">
                            <Label htmlFor="interaction-speed" className="text-base">Interaction Speed Check</Label>
                            <p className="text-sm text-muted-foreground">
                                Clicks completed too quickly (under 10s) are automatically invalidated.
                            </p>
                        </div>
                        <Switch id="interaction-speed" defaultChecked disabled />
                    </div>
                    <div className="flex items-center justify-between rounded-lg border p-4">
                        <div className="space-y-0.5">
                            <Label htmlFor="auto-suspend" className="text-base">AI-Powered Monetization Suspension</Label>
                            <p className="text-sm text-muted-foreground">
                                Manually trigger an AI analysis on a link to suspend monetization if suspicious.
                            </p>
                        </div>
                        <Switch id="auto-suspend" defaultChecked disabled />
                    </div>
                </CardContent>
            </Card>

             <Card>
                <CardHeader>
                    <CardTitle>Recent Suspicious Activity</CardTitle>
                    <CardDescription>A log of potentially fraudulent activity detected by the system.</CardDescription>
                </CardHeader>
                <CardContent>
                   <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Link</TableHead>
                                <TableHead>User</TableHead>
                                <TableHead>Reason</TableHead>
                                <TableHead>Date</TableHead>
                                <TableHead>Status</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            <TableRow>
                                <TableCell colSpan={5} className="h-24 text-center text-muted-foreground">
                                    No suspicious activity detected recently.
                                </TableCell>
                            </TableRow>
                        </TableBody>
                   </Table>
                </CardContent>
            </Card>
        </div>
    );
}
