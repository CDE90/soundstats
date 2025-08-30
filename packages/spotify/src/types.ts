/*
This file contains the essential Spotify types needed for the now-playing update service.
Copied from the web app's types file.
*/

export interface Image {
    url: string;
    height: number;
    width: number;
}

export interface SimplifiedArtist {
    external_urls: ExternalUrls;
    href: string;
    id: string;
    name: string;
    type: string;
    uri: string;
}

export interface Artist extends SimplifiedArtist {
    followers: Followers;
    genres: string[];
    images: Image[];
    popularity: number;
}

export interface SimplifiedAlbum {
    album_type: string;
    available_markets: string[];
    external_urls: ExternalUrls;
    href: string;
    id: string;
    images: Image[];
    name: string;
    release_date: string;
    release_date_precision: string;
    total_tracks: number;
    type: string;
    uri: string;
    artists: SimplifiedArtist[];
}

export interface Track {
    artists: Artist[];
    available_markets: string[];
    disc_number: number;
    duration_ms: number;
    episode: boolean;
    explicit: boolean;
    external_urls: ExternalUrls;
    href: string;
    id: string;
    is_local: boolean;
    name: string;
    preview_url: string | null;
    track: boolean;
    track_number: number;
    type: "track";
    uri: string;
    is_playable?: boolean;
    linked_from?: LinkedFrom;
    restrictions?: Restrictions;
    album: SimplifiedAlbum;
    external_ids: ExternalIds;
    popularity: number;
}

export interface SimplifiedEpisode {
    audio_preview_url: string;
    description: string;
    html_description: string;
    duration_ms: number;
    explicit: boolean;
    external_urls: ExternalUrls;
    href: string;
    id: string;
    images: Image[];
    is_externally_hosted: boolean;
    is_playable: boolean;
    language: string;
    languages: string[];
    name: string;
    release_date: string;
    release_date_precision: string;
    resume_point: ResumePoint;
    type: "episode";
    uri: string;
    restrictions: Restrictions;
}

export interface Episode extends SimplifiedEpisode {
    show: SimplifiedShow;
}

export interface SimplifiedShow {
    available_markets: string[];
    copyrights: Copyright[];
    description: string;
    html_description: string;
    explicit: boolean;
    external_urls: ExternalUrls;
    href: string;
    id: string;
    images: Image[];
    is_externally_hosted: boolean;
    languages: string[];
    media_type: string;
    name: string;
    publisher: string;
    type: string;
    uri: string;
    total_episodes: number;
}

export interface Copyright {
    text: string;
    type: string;
}

export interface ResumePoint {
    fully_played: boolean;
    resume_position_ms: number;
}

export interface Restrictions {
    reason: string;
}

export interface LinkedFrom {
    external_urls: ExternalUrls;
    href: string;
    id: string;
    type: string;
    uri: string;
}

export interface ExternalIds {
    isrc: string;
    ean: string;
    upc: string;
}

export interface ExternalUrls {
    spotify: string;
}

export interface Followers {
    href: string | null;
    total: number;
}

export type TrackItem = Track | Episode;

export interface Device {
    id: string | null;
    is_active: boolean;
    is_private_session: boolean;
    is_restricted: boolean;
    name: string;
    type: string;
    volume_percent: number | null;
}

export interface Context {
    type: string;
    href: string;
    external_urls: ExternalUrls;
    uri: string;
}

export interface Actions {
    interrupting_playback?: boolean;
    pausing?: boolean;
    resuming?: boolean;
    seeking?: boolean;
    skipping_next?: boolean;
    skipping_prev?: boolean;
    toggling_repeat_context?: boolean;
    toggling_shuffle?: boolean;
    toggling_repeat_track?: boolean;
    transferring_playback?: boolean;
}

export interface PlaybackState {
    device?: Device;
    repeat_state: string;
    shuffle_state: boolean;
    context: Context | null;
    timestamp: number;
    progress_ms: number;
    is_playing: boolean;
    item: TrackItem;
    currently_playing_type: string;
    actions: Actions;
}

// Additional types for search and other functionality
export interface Albums {
    albums: SimplifiedAlbum[];
}

export interface Artists {
    artists: Artist[];
}

export interface Tracks {
    tracks: Track[];
}

export interface Page<TItemType> {
    href: string;
    items: TItemType[];
    limit: number;
    next: string | null;
    offset: number;
    previous: string | null;
    total: number;
}

export type ItemTypes =
    | "artist"
    | "album"
    | "playlist"
    | "track"
    | "show"
    | "episode"
    | "audiobook";

interface ResourceTypeToResultKey {
    album: "albums";
    artist: "artists";
    track: "tracks";
    playlist: "playlists";
    show: "shows";
    episode: "episodes";
    audiobook: "audiobooks";
}

interface SearchResultsMap {
    album: SimplifiedAlbum;
    artist: Artist;
    track: Track;
    playlist: any; // Simplified for now
    show: SimplifiedShow;
    episode: SimplifiedEpisode;
    audiobook: any; // Simplified for now
}

export type PartialSearchResult = {
    [K in ItemTypes as ResourceTypeToResultKey[K]]?: Page<
        K extends keyof SearchResultsMap ? SearchResultsMap[K] : unknown
    >;
};

export type SearchResults<T extends readonly ItemTypes[]> =
    Pick<
        PartialSearchResult,
        ResourceTypeToResultKey[T[number]]
    > extends infer R
        ? number extends T["length"]
            ? R
            : Required<R>
        : never;

export interface SimplifiedTrack {
    artists: SimplifiedArtist[];
    available_markets: string[];
    disc_number: number;
    duration_ms: number;
    episode: boolean;
    explicit: boolean;
    external_urls: ExternalUrls;
    href: string;
    id: string;
    is_local: boolean;
    name: string;
    preview_url: string | null;
    track: boolean;
    track_number: number;
    type: "track";
    uri: string;
    is_playable?: boolean;
    linked_from?: LinkedFrom;
    restrictions?: Restrictions;
}

export interface Album extends SimplifiedAlbum {
    artists: Artist[];
    tracks: Page<SimplifiedTrack>;
}
