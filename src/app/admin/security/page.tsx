
'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";

export default function AdminSecurityPage() {
    return (
        <div className="flex flex-col gap-6">
            <h1 className="text-2xl font-bold">Security & Anti-bot</h1>

            <Card>
                <CardHeader>
                    <CardTitle>Anti-Fraud Settings</CardTitle>
                    <CardDescription>Configure rules to prevent bot traffic and fraudulent clicks.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                    <div className="flex items-center justify-between rounded-lg border p-4">
                        <div className="space-y-0.5">
                            <Label htmlFor="ip-filtering" className="text-base">IP/User-Agent Filtering</Label>
                            <p className="text-sm text-muted-foreground">
                                Prevent repeated clicks from the same IP address and User-Agent within an hour.
                            </p>
                        </div>
                        <Switch id="ip-filtering" defaultChecked />
                    </div>
                    <div className="flex items-center justify-between rounded-lg border p-4">
                        <div className="space-y-0.5">
                            <Label htmlFor="interaction-speed" className="text-base">Interaction Speed Check</Label>
                            <p className="text-sm text-muted-foreground">
                                Analyze interaction speed to detect non-human behavior.
                            </p>
                        </div>
                        <Switch id="interaction-speed" />
                    </div>
                    <div className="flex items-center justify-between rounded-lg border p-4">
                        <div className="space-y-0.5">
                            <Label htmlFor="auto-suspend" className="text-base">Automatic Suspension</Label>
                            <p className="text-sm text-muted-foreground">
                                Temporarily suspend links with highly suspicious activity.
                            </p>
                        </div>
                        <Switch id="auto-suspend" defaultChecked />
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
