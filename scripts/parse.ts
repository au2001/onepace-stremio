import fs from "fs/promises";
import path from "path";
import parseTorrent from "parse-torrent";
import { RateLimiter } from "limiter";
import { Arc, Episode, Stream, Video } from "./types";
import { getArcPrefix } from "./utils";
import { getSubtitles } from "./subtitles";

const limiter = new RateLimiter({ tokensPerInterval: 1, interval: 1000 });

const cache: Record<string, Promise<parseTorrent.Instance>> = {};
export const fetchTorrent = async (infoHash: string, uri: string) =>
  await (cache[infoHash] ??= new Promise(async (resolve, reject) => {
    const cacheFile = path.join(__dirname, "../cache", `${infoHash}.torrent`);

    try {
      const buffer = await fs.readFile(cacheFile);
      resolve(parseTorrent(buffer) as parseTorrent.Instance);
      return;
    } catch (e) {
      if (!(e instanceof Error) || !("code" in e) || e.code !== "ENOENT") {
        reject(e);
        return;
      }
    }

    try {
      await limiter.removeTokens(1);
      parseTorrent.remote(uri, async (err, torrent) => {
        try {
          if (torrent === undefined) throw err;

          const buffer = parseTorrent.toTorrentFile(torrent);
          await fs.mkdir(path.dirname(cacheFile), { recursive: true });
          await fs.writeFile(cacheFile, buffer);

          resolve(torrent);
        } catch (e) {
          reject(e);
        }
      });
    } catch (e) {
      reject(e);
    }
  }));

export const getVideo = async (
  arc: Arc,
  episode: Episode,
): Promise<[Video, Stream | undefined]> => {
  const video: Video = {
    season: arc.number,
    episode: episode.number,
    id: `${getArcPrefix(arc)}_${episode.number}`,
    title: episode.title,
    thumbnail: episode.image,
    overview: episode?.description,
    released: episode.releaseDate.toISOString(),
  };

  const torrent = await fetchTorrent(
    episode.download.infoHash,
    episode.download.uri,
  );
  const index =
    torrent.files?.findIndex((file) =>
      file.name.endsWith(`[${episode.download.crc32}].mkv`),
    ) ?? -1;

  if (index !== -1) {
    const fileIdx =
      torrent.files !== undefined && torrent.files.length > 1
        ? index
        : undefined;

    const stream: Stream = {
      infoHash: torrent.infoHash,
      fileIdx,
      subtitles: await getSubtitles(arc, video),
    };

    return [video, stream];
  }

  return [video, undefined];
};
