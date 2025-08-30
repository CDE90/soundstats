import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { getTopContentStats } from "../../actions";
import { Music, User, Disc3, TrendingUp } from "lucide-react";

export async function TopContentStats() {
    const stats = await getTopContentStats();

    const formatDuration = (ms: number) => {
        const hours = Math.floor(ms / (1000 * 60 * 60));
        const minutes = Math.floor((ms % (1000 * 60 * 60)) / (1000 * 60));

        if (hours > 0) {
            return `${hours}h ${minutes}m`;
        }
        return `${minutes}m`;
    };

    return (
        <div className="space-y-6">
            {/* Overview */}
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <TrendingUp className="h-5 w-5" />
                        Content Performance Overview
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="flex items-center gap-4">
                        <div>
                            <div className="text-2xl font-bold">
                                {stats.avgCompletionRate}%
                            </div>
                            <p className="text-xs text-muted-foreground">
                                Avg completion rate
                            </p>
                        </div>
                        <Progress
                            value={stats.avgCompletionRate}
                            className="flex-1"
                        />
                    </div>
                </CardContent>
            </Card>

            <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
                {/* Top Tracks */}
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <Music className="h-4 w-4" />
                            Top Tracks
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="space-y-3">
                            {stats.topTracks.length > 0 ? (
                                stats.topTracks.map((track, index) => (
                                    <div key={index} className="space-y-1">
                                        <div className="flex items-start justify-between">
                                            <div className="min-w-0 flex-1">
                                                <p className="truncate text-sm font-medium">
                                                    {track.trackName ??
                                                        "Unknown Track"}
                                                </p>
                                                <div className="mt-1 flex items-center gap-2">
                                                    <Badge
                                                        variant="secondary"
                                                        className="text-xs"
                                                    >
                                                        #{index + 1}
                                                    </Badge>
                                                    <span className="text-xs text-muted-foreground">
                                                        {track.playCount} plays
                                                    </span>
                                                </div>
                                            </div>
                                            <div className="ml-2 text-xs text-muted-foreground">
                                                {formatDuration(
                                                    track.totalListeningMs ?? 0,
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                ))
                            ) : (
                                <p className="text-sm text-muted-foreground">
                                    No track data available
                                </p>
                            )}
                        </div>
                    </CardContent>
                </Card>

                {/* Top Artists */}
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <User className="h-4 w-4" />
                            Top Artists
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="space-y-3">
                            {stats.topArtists.length > 0 ? (
                                stats.topArtists.map((artist, index) => (
                                    <div key={index} className="space-y-1">
                                        <div className="flex items-start justify-between">
                                            <div className="min-w-0 flex-1">
                                                <p className="truncate text-sm font-medium">
                                                    {artist.artistName ??
                                                        "Unknown Artist"}
                                                </p>
                                                <div className="mt-1 flex items-center gap-2">
                                                    <Badge
                                                        variant="secondary"
                                                        className="text-xs"
                                                    >
                                                        #{index + 1}
                                                    </Badge>
                                                    <span className="text-xs text-muted-foreground">
                                                        {artist.playCount} plays
                                                    </span>
                                                </div>
                                            </div>
                                            <div className="ml-2 text-xs text-muted-foreground">
                                                {formatDuration(
                                                    artist.totalListeningMs ??
                                                        0,
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                ))
                            ) : (
                                <p className="text-sm text-muted-foreground">
                                    No artist data available
                                </p>
                            )}
                        </div>
                    </CardContent>
                </Card>

                {/* Top Albums */}
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <Disc3 className="h-4 w-4" />
                            Top Albums
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="space-y-3">
                            {stats.topAlbums.length > 0 ? (
                                stats.topAlbums.map((album, index) => (
                                    <div key={index} className="space-y-1">
                                        <div className="flex items-start justify-between">
                                            <div className="min-w-0 flex-1">
                                                <p className="truncate text-sm font-medium">
                                                    {album.albumName ??
                                                        "Unknown Album"}
                                                </p>
                                                <div className="mt-1 flex items-center gap-2">
                                                    <Badge
                                                        variant="secondary"
                                                        className="text-xs"
                                                    >
                                                        #{index + 1}
                                                    </Badge>
                                                    <span className="text-xs text-muted-foreground">
                                                        {album.playCount} plays
                                                    </span>
                                                </div>
                                            </div>
                                            <div className="ml-2 text-xs text-muted-foreground">
                                                {formatDuration(
                                                    album.totalListeningMs ?? 0,
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                ))
                            ) : (
                                <p className="text-sm text-muted-foreground">
                                    No album data available
                                </p>
                            )}
                        </div>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}
