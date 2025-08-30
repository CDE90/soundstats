"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { Loader2, Plus, Copy, Check } from "lucide-react";
import { useState, useTransition } from "react";
import { createInvite } from "../actions";
import { toast } from "sonner";

export function CreateInviteForm() {
    const [isPending, startTransition] = useTransition();
    const [name, setName] = useState("");
    const [expiresIn, setExpiresIn] = useState<string>("never");
    const [maxUses, setMaxUses] = useState<number | null>(null);
    const [unlimitedUses, setUnlimitedUses] = useState(true);
    const [lastCreatedCode, setLastCreatedCode] = useState<string>("");
    const [copied, setCopied] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        startTransition(async () => {
            const result = await createInvite(
                name.trim() || undefined,
                expiresIn && expiresIn !== "never"
                    ? parseInt(expiresIn)
                    : undefined,
                unlimitedUses ? undefined : (maxUses ?? undefined),
            );

            if ("error" in result) {
                toast.error(result.error);
            } else if ("success" in result && result.invite) {
                toast.success("Invite created successfully!");
                setLastCreatedCode(result.invite.code);
                setName("");
                setExpiresIn("never");
                setMaxUses(null);
                setUnlimitedUses(true);
                setCopied(false);
            }
        });
    };

    const copyInviteLink = async () => {
        if (!lastCreatedCode) return;

        const inviteUrl = `${window.location.origin}/invite/${lastCreatedCode}`;
        await navigator.clipboard.writeText(inviteUrl);
        setCopied(true);
        toast.success("Invite link copied to clipboard!");

        setTimeout(() => setCopied(false), 2000);
    };

    return (
        <div className="space-y-6">
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <Plus className="h-5 w-5" />
                        Create New Invite
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    <form onSubmit={handleSubmit} className="space-y-4">
                        <div className="space-y-2">
                            <Label htmlFor="name">Invite Name (Optional)</Label>
                            <Input
                                id="name"
                                type="text"
                                placeholder="e.g., College Friends, Work Group"
                                value={name}
                                onChange={(e) => setName(e.target.value)}
                                maxLength={100}
                            />
                            <p className="text-sm text-muted-foreground">
                                Give your invite a name to help you remember who
                                it&apos;s for
                            </p>
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="expires">
                                Expires After (Optional)
                            </Label>
                            <Select
                                value={expiresIn}
                                onValueChange={setExpiresIn}
                            >
                                <SelectTrigger id="expires">
                                    <SelectValue placeholder="Never expires" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="never">
                                        Never expires
                                    </SelectItem>
                                    <SelectItem value="1">1 day</SelectItem>
                                    <SelectItem value="7">1 week</SelectItem>
                                    <SelectItem value="30">1 month</SelectItem>
                                    <SelectItem value="90">3 months</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>

                        <div className="space-y-3">
                            <Label>Usage Limit</Label>
                            <div className="flex items-center space-x-2">
                                <Checkbox
                                    id="unlimited"
                                    checked={unlimitedUses}
                                    onCheckedChange={(checked) => {
                                        setUnlimitedUses(checked === true);
                                        if (checked) setMaxUses(null);
                                    }}
                                />
                                <Label
                                    htmlFor="unlimited"
                                    className="text-sm font-normal"
                                >
                                    Unlimited uses
                                </Label>
                            </div>
                            {!unlimitedUses && (
                                <div className="space-y-2">
                                    <Label htmlFor="maxUsesInput">
                                        Maximum number of people
                                    </Label>
                                    <Input
                                        id="maxUsesInput"
                                        type="number"
                                        min="1"
                                        max="1000"
                                        placeholder="e.g., 10"
                                        value={maxUses?.toString() ?? ""}
                                        onChange={(e) => {
                                            const value = e.target.value;
                                            setMaxUses(
                                                value ? parseInt(value) : null,
                                            );
                                        }}
                                    />
                                </div>
                            )}
                            <p className="text-sm text-muted-foreground">
                                {unlimitedUses
                                    ? "Anyone with the link can use this invite"
                                    : "Invite will be disabled after the specified number of people use it"}
                            </p>
                        </div>

                        <Button
                            type="submit"
                            disabled={isPending}
                            className="w-full"
                        >
                            {isPending ? (
                                <>
                                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                    Creating...
                                </>
                            ) : (
                                <>
                                    <Plus className="mr-2 h-4 w-4" />
                                    Create Invite
                                </>
                            )}
                        </Button>
                    </form>
                </CardContent>
            </Card>

            {lastCreatedCode && (
                <Card className="border-green-200 bg-green-50 dark:border-green-800 dark:bg-green-900/20">
                    <CardHeader>
                        <CardTitle className="text-green-800 dark:text-green-200">
                            Invite Created Successfully!
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="space-y-3">
                            <div>
                                <Label className="text-green-700 dark:text-green-300">
                                    Invite Code
                                </Label>
                                <div className="mt-1 flex items-center gap-2">
                                    <code className="flex-1 rounded bg-green-100 px-3 py-2 font-mono text-sm dark:bg-green-800/50">
                                        {lastCreatedCode}
                                    </code>
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={copyInviteLink}
                                        className="border-green-300 text-green-700 hover:bg-green-100 dark:border-green-700 dark:text-green-300 dark:hover:bg-green-800/50"
                                    >
                                        {copied ? (
                                            <Check className="h-4 w-4" />
                                        ) : (
                                            <Copy className="h-4 w-4" />
                                        )}
                                    </Button>
                                </div>
                            </div>
                            <div>
                                <Label className="text-green-700 dark:text-green-300">
                                    Share Link
                                </Label>
                                <div className="mt-1 rounded bg-green-100 px-3 py-2 font-mono text-sm dark:bg-green-800/50">
                                    {window.location.origin}/invite/
                                    {lastCreatedCode}
                                </div>
                            </div>
                        </div>
                    </CardContent>
                </Card>
            )}
        </div>
    );
}
