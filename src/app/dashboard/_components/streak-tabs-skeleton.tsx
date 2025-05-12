import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { StreakSkeleton } from "./listening-streaks";

export function StreakTabsSkeleton() {
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
                <StreakSkeleton isTabbed={true} />
            </TabsContent>
        </Tabs>
    );
}
