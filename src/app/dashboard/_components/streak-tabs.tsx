import { Suspense } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { GenericStreaks, StreakSkeleton } from "./listening-streaks";
import "server-only";

interface StreakTabsProps {
    userId: string;
}

export async function StreakTabs({ userId }: StreakTabsProps) {
    "use cache";
    return (
        <Tabs defaultValue="artist" className="w-full">
            <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="artist" className="text-sm">
                    Artists
                </TabsTrigger>
                <TabsTrigger value="track" className="text-sm">
                    Tracks
                </TabsTrigger>
                <TabsTrigger value="album" className="text-sm">
                    Albums
                </TabsTrigger>
            </TabsList>
            <TabsContent value="artist" className="mt-2">
                <Suspense fallback={<StreakSkeleton isTabbed={true} />}>
                    <GenericStreaks
                        userId={userId}
                        type="artist"
                        isTabbed={true}
                    />
                </Suspense>
            </TabsContent>
            <TabsContent value="track" className="mt-2">
                <Suspense fallback={<StreakSkeleton isTabbed={true} />}>
                    <GenericStreaks
                        userId={userId}
                        type="track"
                        isTabbed={true}
                    />
                </Suspense>
            </TabsContent>
            <TabsContent value="album" className="mt-2">
                <Suspense fallback={<StreakSkeleton isTabbed={true} />}>
                    <GenericStreaks
                        userId={userId}
                        type="album"
                        isTabbed={true}
                    />
                </Suspense>
            </TabsContent>
        </Tabs>
    );
}
