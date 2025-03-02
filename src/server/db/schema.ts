// Example model schema from the Drizzle docs
// https://orm.drizzle.team/docs/sql-schema-declaration

import { sql } from "drizzle-orm";
import {
    bigserial,
    boolean,
    index,
    integer,
    pgEnum,
    pgTableCreator,
    primaryKey,
    timestamp,
    uniqueIndex,
    varchar,
} from "drizzle-orm/pg-core";

export const createTable = pgTableCreator((name) => name);

export const artists = createTable("artist", {
    id: varchar("id", { length: 256 }).primaryKey(),
    name: varchar("name", { length: 256 }).notNull(),
    imageUrl: varchar("image_url", { length: 256 }),
    createdAt: timestamp("created_at", { withTimezone: true })
        .default(sql`CURRENT_TIMESTAMP`)
        .notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).$onUpdate(
        () => new Date(),
    ),
});

export const albums = createTable("album", {
    id: varchar("id", { length: 256 }).primaryKey(),
    name: varchar("name", { length: 256 }).notNull(),
    albumType: varchar("album_type", { length: 50 }).notNull(),
    releaseDate: timestamp("release_date", {
        withTimezone: true,
    }).notNull(),
    totalTracks: integer("total_tracks").notNull(),
    imageUrl: varchar("image_url", { length: 256 }),
    createdAt: timestamp("created_at", { withTimezone: true })
        .default(sql`CURRENT_TIMESTAMP`)
        .notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).$onUpdate(
        () => new Date(),
    ),
});

// Linking table for artists and albums
export const artistAlbums = createTable(
    "artist_albums",
    {
        artistId: varchar("artist_id", { length: 256 })
            .notNull()
            .references(() => artists.id),
        albumId: varchar("album_id", { length: 256 })
            .notNull()
            .references(() => albums.id),
    },
    (table) => ({
        artistAlbumsKey: primaryKey({
            columns: [table.artistId, table.albumId],
        }),
        artistIdIndex: index("aa_artist_id_idx").on(table.artistId),
        albumIdIndex: index("aa_album_id_idx").on(table.albumId),
    }),
);

export const tracks = createTable("track", {
    id: varchar("id", { length: 256 }).primaryKey(),
    name: varchar("name", { length: 256 }).notNull(),
    albumId: varchar("album_id", { length: 256 }).references(() => albums.id),
    durationMs: integer("duration_ms"),
    popularity: integer("popularity"),
    createdAt: timestamp("created_at", { withTimezone: true })
        .default(sql`CURRENT_TIMESTAMP`)
        .notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).$onUpdate(
        () => new Date(),
    ),
});

// Linking table for artists and tracks
export const artistTracks = createTable(
    "artist_tracks",
    {
        artistId: varchar("artist_id", { length: 256 })
            .notNull()
            .references(() => artists.id),
        trackId: varchar("track_id", { length: 256 })
            .notNull()
            .references(() => tracks.id),
        isPrimaryArtist: boolean("is_primary_artist").notNull().default(false),
    },
    (table) => ({
        artistTracksKey: primaryKey({
            columns: [table.artistId, table.trackId],
        }),
        artistIdIndex: index("at_artist_id_idx").on(table.artistId),
        trackIdIndex: index("at_track_id_idx").on(table.trackId),
    }),
);

// This will store the user's clerk ID, and spotify id, and the refresh and access tokens
export const users = createTable(
    "user",
    {
        // id is the clerk ID
        id: varchar("id", { length: 256 }).primaryKey(),
        spotifyId: varchar("spotify_id", { length: 256 }).notNull().unique(),
        // premium users' data is fetched more frequently (e.g. every 20 seconds instead of 1 minute)
        premiumUser: boolean("premium_user").notNull().default(false),
        enabled: boolean("enabled").notNull().default(true),
        createdAt: timestamp("created_at", { withTimezone: true })
            .default(sql`CURRENT_TIMESTAMP`)
            .notNull(),
        updatedAt: timestamp("updated_at", { withTimezone: true }).$onUpdate(
            () => new Date(),
        ),
    },
    (table) => ({
        spotifyIdIndex: index("u_spotify_id_idx").on(table.spotifyId),
    }),
);

export const friendStatus = pgEnum("friend_status", [
    "pending",
    "accepted",
    "rejected",
]);

export const friends = createTable(
    "friends",
    {
        id: bigserial("id", { mode: "bigint" }).primaryKey(),
        // The user who "sent" the friend request
        userId: varchar("user_id", { length: 256 })
            .notNull()
            .references(() => users.id, { onDelete: "cascade" }),
        // The user who "accepted" the friend request
        friendId: varchar("friend_id", { length: 256 })
            .notNull()
            .references(() => users.id, { onDelete: "cascade" }),
        status: friendStatus("status").notNull(),
        createdAt: timestamp("created_at", { withTimezone: true })
            .default(sql`CURRENT_TIMESTAMP`)
            .notNull(),
        updatedAt: timestamp("updated_at", { withTimezone: true }).$onUpdate(
            () => new Date(),
        ),
    },
    (table) => ({
        userIdIndex: index("f_user_id_idx").on(table.userId),
        friendIdIndex: index("f_friend_id_idx").on(table.friendId),
        uniqueFriendship: uniqueIndex("unique_friendship_idx").on(
            table.userId,
            table.friendId,
        ),
    }),
);

// Finally, the table which stores the user's listening history
export const listeningHistory = createTable(
    "listening_history",
    {
        id: bigserial("id", { mode: "bigint" }).primaryKey(),
        userId: varchar("user_id", { length: 256 })
            .notNull()
            .references(() => users.id, { onDelete: "cascade" }),
        trackId: varchar("track_id", { length: 256 })
            .notNull()
            .references(() => tracks.id, { onDelete: "cascade" }),
        playedAt: timestamp("played_at", { withTimezone: true })
            .default(sql`CURRENT_TIMESTAMP`)
            .notNull(),
        progressMs: integer("progress_ms").notNull(),
        deviceName: varchar("device_name", { length: 256 }),
        deviceType: varchar("device_type", { length: 256 }),
        imported: boolean("imported").notNull().default(false),
    },
    (table) => ({
        userIdIndex: index("lh_user_id_idx").on(table.userId),
        trackIdIndex: index("lh_track_id_idx").on(table.trackId),
    }),
);

export const streamingUploads = createTable("streaming_uploads", {
    id: bigserial("id", { mode: "bigint" }).primaryKey(),
    userId: varchar("user_id", { length: 256 })
        .notNull()
        .references(() => users.id),
    fileUrl: varchar("file_url", { length: 256 }).notNull(),
    fileName: varchar("file_name", { length: 256 }).notNull(),
    processed: boolean("processed").notNull().default(false),
    invalidFile: boolean("invalid_file").notNull().default(false),
    createdAt: timestamp("created_at", { withTimezone: true })
        .default(sql`CURRENT_TIMESTAMP`)
        .notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).$onUpdate(
        () => new Date(),
    ),
});
