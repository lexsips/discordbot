"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.EpisodeManager = void 0;
const collection_1 = __importDefault(require("@discordjs/collection"));
const spotify_url_info_1 = require("spotify-url-info");
const resolver_1 = __importDefault(require("../resolver"));
class EpisodeManager {
    constructor(plugin) {
        this.plugin = plugin;
        this.cache = new collection_1.default();
        if (plugin.options?.maxCacheLifeTime) {
            setInterval(() => {
                this.cache.clear();
            }, plugin.options?.maxCacheLifeTime);
        }
    }
    async fetch(url, id) {
        if (this.plugin.options?.cacheTrack) {
            if (this.cache.has(id))
                return { tracks: this.cache.get(id) };
            if (this.plugin.options.strategy === "API") {
                const data = await this.plugin.resolver.makeRequest(`/episodes/${id}?market=US`);
                const track = resolver_1.default.buildUnresolved(data);
                this.cache.set(id, [track]);
                return { tracks: [track] };
            }
            const tracks = await (0, spotify_url_info_1.getTracks)(url);
            const unresolvedTrack = tracks.map(track => track && resolver_1.default.buildUnresolved(track)) ?? [];
            this.cache.set(id, unresolvedTrack);
            return { tracks: unresolvedTrack };
        }
        if (this.plugin.options?.strategy === "API") {
            const data = await this.plugin.resolver.makeRequest(`/episodes/${id}?market=US`);
            const track = resolver_1.default.buildUnresolved(data);
            return { tracks: [track] };
        }
        const tracks = await (0, spotify_url_info_1.getTracks)(url);
        const unresolvedTrack = tracks.map(track => track && resolver_1.default.buildUnresolved(track)) ?? [];
        return { tracks: unresolvedTrack };
    }
}
exports.EpisodeManager = EpisodeManager;
//# sourceMappingURL=Episode.js.map