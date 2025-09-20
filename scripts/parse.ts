import fs from "fs/promises";
import path from "path";
import parseTorrent from "parse-torrent";
import { RateLimiter } from "limiter";
import { Arc, DownloadType, Episode, Stream, Video } from "./types";
import { getArcPrefix } from "./utils";
import { getSubtitles } from "./subtitles";

const limiter = new RateLimiter({ tokensPerInterval: 3, interval: 1000 });

const cache: Record<string, Promise<parseTorrent.Instance>> = {};
export const fetchTorrent = async (infoHash: string) =>
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
      parseTorrent.remote(
        `https://onepace.net/torrents/${infoHash}.torrent`,
        async (err, torrent) => {
          try {
            if (torrent === undefined) throw err;

            const buffer = parseTorrent.toTorrentFile(torrent);
            await fs.mkdir(path.dirname(cacheFile), { recursive: true });
            await fs.writeFile(cacheFile, buffer);

            resolve(torrent);
          } catch (e) {
            reject(e);
          }
        },
      );
    } catch (e) {
      reject(e);
    }
  }));

export const getVideo = async (
  arc: Arc,
  episode: Episode,
): Promise<[Video, Stream | undefined]> => {
  const translation = episode.translations.find(
    (translation) => translation.language_code === "en",
  );

  const released =
    episode.downloads.length !== 0
      ? new Date(episode.released_at).toISOString()
      : undefined;

  const title =
    released !== undefined
      ? translation?.title ?? episode.invariant_title
      : "Unreleased";

  const image =
    episode.images.find((image) => image.mimeType === "image/webp") ??
    episode.images[0];

  const thumbnail = `https://onepace.net/images/${image !== undefined ? `episodes/${image.src}` : "unreleased-placeholder-16x9.jpg"}`;

  const overview =
    released !== undefined ? translation?.description ?? undefined : undefined;

  const video: Video = {
    season: arc.part,
    episode: episode.part,
    id: `${getArcPrefix(arc)}_${episode.part}`,
    title,
    thumbnail,
    overview,
    released,
  };

  const infoHashes = new Set(
    released !== undefined
      ? [...arc.downloads, ...episode.downloads].flatMap((download) =>
          download.type === DownloadType.Torrent
            ? /^\/torrents\/([0-9a-f]{40})\.torrent$/.exec(download.uri)?.[1] ??
              []
            : download.type === DownloadType.Magnet
              ? /^magnet:\?xt=urn:btih:([0-9a-f]{40})(?:&|$)/.exec(
                  download.uri,
                )?.[1] ?? []
              : [],
        )
      : [],
  );

  for (const infoHash of infoHashes) {
    const torrent = await fetchTorrent(infoHash);
    if (torrent?.files === undefined) continue;

    const index =
      torrent.files.findIndex((file) =>
        [
          ` ${episode.part.toString().padStart(2, "0")} `,
          ` ${episode.manga_chapters} `,
          `[${episode.manga_chapters?.replace(/ cover stories$/, "")}]`,
        ].some((str) => file.name.includes(str)),
      ) ?? -1;
    if (index === -1) continue;

    const fileIdx = torrent.files.length > 1 ? index : undefined;

    const stream: Stream = {
      infoHash,
      fileIdx,
      subtitles: await getSubtitles(arc, video),
    };

    return [video, stream];
  }

  return [video, undefined];
};
