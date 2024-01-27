import parseTorrent from "parse-torrent";
import { RateLimiter } from "limiter";
import { Arc, Episode, Stream, Video } from "./types";
import { getArcPrefix } from "./utils";

const limiter = new RateLimiter({ tokensPerInterval: 3, interval: 1000 });

const cache: Record<string, Promise<parseTorrent.Instance | undefined>> = {};
export const fetchTorrent = async (infoHash: string) =>
  await (cache[infoHash] ??= new Promise(async (resolve, reject) => {
    await limiter.removeTokens(1);
    parseTorrent.remote(
      `https://api.onepace.net/download/torrent.php?hash=${infoHash}`,
      (err, torrent) => (err ? reject(err) : resolve(torrent)),
    );
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

  const thumbnail =
    episode.images.length !== 0
      ? `https://onepace.net/images/episodes/${episode.images[0].src}`
      : "https://onepace.net/images/unreleased-placeholder-16x9.jpg";

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
          download.type === "TORRENT" || download.type === "MAGNET"
            ? new URL(download.uri).searchParams.get("hash") ?? []
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
    };

    return [video, stream];
  }

  return [video, undefined];
};