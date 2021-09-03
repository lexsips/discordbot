import {
    Manager,
    Plugin,
    SearchQuery,
    SearchResult,
    TrackUtils,
    Track,
    UnresolvedTrack
} from "erela.js";
import resolver from "./resolver";
import { Result, SpotifyOptions } from "./typings";


const check = (options?: SpotifyOptions) => {
    if (
        typeof options?.convertUnresolved !== "undefined" &&
        typeof options?.convertUnresolved !== "boolean"
    ) {
        throw new TypeError(
            "Spotify option \"convertUnresolved\" must be a boolean.",
        );
    }
    if (
        typeof options?.strategy !== "undefined" &&
        typeof options?.strategy !== "string"
    ) {
        throw new TypeError(
            "Spotify option \"strategy\" must be a string.",
        );
    }

    if (
        typeof options?.strategy !== "undefined" &&
        options?.strategy === "API" &&
        !options?.clientSecret
    ) {
        throw new TypeError(
            "Spotify option \"clientSecret\" required if strategy set to API.",
        );
    }
    if (
        typeof options?.strategy !== "undefined" &&
        options?.strategy === "API" &&
        !options?.clientId
    ) {
        throw new TypeError(
            "Spotify option \"clientId\" required if strategy set to API.",
        );
    }
    if (
        typeof options?.playlistPageLimit !== "undefined" &&
        typeof options?.playlistPageLimit !== "number" 
    ) {
        throw new TypeError(
            "Spotify option \"playlistPageLimit\" must be a number.",
        );
    }
    if (
        typeof options?.albumPageLimit !== "undefined" &&
        typeof options?.albumPageLimit !== "number"
    ) {
        throw new TypeError(
            "Spotify option \"albumPageLimit\" must be a number.",
        );
    }

    if (
        typeof options?.showPageLimit !== "undefined" &&
        typeof options?.showPageLimit !== "number"
    ) {
        throw new TypeError(
            "Spotify option \"showPageLimit\" must be a number.",
        );
    }
    if (
        typeof options?.maxCacheLifeTime !== "undefined" &&
        typeof options?.maxCacheLifeTime !== "number"
    ) {
        throw new TypeError(
            "Spotify option \"maxCacheLifeTime\" must be a number.",
        );
    }
}

export class Spotify extends Plugin {
    public readonly resolver = new resolver(this)
    public spotifyMatch = /(?:https:\/\/open\.spotify\.com\/|spotify:)(?:.+)?(track|playlist|artist|episode|show|album)[\/:]([A-Za-z0-9]+)/;

    //@ts-expect-error _search is persistent
    private _search: (query: string | SearchQuery, requester?: unknown) => Promise<SearchResult>;
    private readonly functions = {
        track: this.resolver.getTrack,
        album: this.resolver.getAlbum,
        playlist: this.resolver.getPlaylist,
        artist: this.resolver.getArtist,
        show: this.resolver.getShow,
        episode: this.resolver.getEpisode
    };
    public manager: Manager | undefined;
    public constructor(public options?: SpotifyOptions) {
        super();
        check(options);
        this.options = {
            ...options,
        };
        if (this.options?.strategy === "API") {
            this.resolver.renew()
        }
    }
    
    public async load(manager: Manager) { 
        this.manager = manager;
        this._search = manager.search.bind(manager);
        manager.search = this.search.bind(this);
    }

    private async search(query: string | SearchQuery, requester?: unknown): Promise<SearchResult> {
        const finalQuery = (query as SearchQuery).query || query as string;
        const [ , type, id ] = finalQuery.match(this.spotifyMatch) ?? [];
        
        if (type in this.functions) {
            try {
                const func = this.functions[type as keyof Spotify['functions']];

                if (func) {
                    const data: Result = await func.fetch(finalQuery, id);
                    const loadType = type === "track" || type === "episode" ? "TRACK_LOADED" : "PLAYLIST_LOADED";
                    const name = [ "playlist", "album", 'artist', 'episode', 'show' ].includes(type) ? data.name : null;
                    const tracks = await Promise.all(data.tracks.map(async (query: any) => {
                        let track = TrackUtils.buildUnresolved(query, requester);      
                        if (this.options?.convertUnresolved) {
                            try {
                                track = await this.resolver.resolve(track, requester) as UnresolvedTrack
                            } catch {
                                return null;
                            }
                        }
                        return track;
                    }).filter(track => !!track));
                    //@ts-expect-error type mabok
                    return resolver.buildSearch(loadType, tracks, null, name);
                }
                const msg = "Incorrect type for Spotify URL, must be one of \"track\", \"album\", \"artist\", \"show\", \"episode\" or \"playlist\".";
                //@ts-expect-error type mabok
                return resolver.buildSearch("LOAD_FAILED", [], msg, null);
            } catch (e) {
                //@ts-expect-error type mabok
                return resolver.buildSearch(e.loadType ?? "LOAD_FAILED", [], e.message ?? null, null);
            }
    }
    return this._search(query, requester);
    }
}


