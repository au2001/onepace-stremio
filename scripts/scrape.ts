import * as fs from "fs/promises";
import {
  getArcPrefix,
  getCoveredAnimeEpisodes,
  log,
  readJSON,
  saveStream,
  saveVideo,
  writeJSON,
} from "./utils";
import { getVideo } from "./parse";
import { Video } from "./types";
import KAI from "./kai.json";
import { fetchArcs } from "./sheets";

(async () => {
  log("Fetching episodes...");

  const arcs = await fetchArcs();

  log(`Got ${arcs.length} arcs, fetching videos...`);

  let { meta } =
    (await readJSON<{
      meta: { videos: Video[] };
    }>("meta/series/onepace.json")) ?? {};

  const coveredAnimeEpisodes = new Set<number>();

  const videos = await Promise.all(
    arcs.flatMap((arc) => {
      return arc.episodes.map(async (episode) => {
        const [newVideo, newStream] = await getVideo(arc, episode);

        const index =
          meta?.videos.findIndex((video) => video.id === newVideo.id) ?? -1;
        const [video] =
          meta !== undefined && index > -1
            ? meta.videos.splice(index, 1)
            : [undefined];
        saveVideo(arc, newVideo, video);

        if (await saveStream(arc, newVideo, newStream)) {
          getCoveredAnimeEpisodes(episode.animeEpisodes).forEach((episode) =>
            coveredAnimeEpisodes.add(episode),
          );
        }

        return newVideo;
      });
    }),
  );

  log(`Got ${videos.length} videos, filling KAIs...`);

  let maxEpisodeNumbers: Record<number, number> = {};

  videos.push(
    ...(
      await Promise.all(
        KAI.episodes.map(async (episode, fileIdx) => {
          const kaiAnimeEpisodes = getCoveredAnimeEpisodes(
            episode.anime_episodes,
          );
          if (
            [...kaiAnimeEpisodes].every((episode) =>
              coveredAnimeEpisodes.has(episode),
            )
          ) {
            return [];
          }

          const arc = arcs.find((arc) => arc.title === episode.arc);
          if (arc === undefined)
            throw new Error(`Unknown KAI arc: ${episode.arc}`);

          maxEpisodeNumbers[arc.number] ??= Math.max(
            ...videos
              .filter((video) => video.season === arc.number)
              .map((video) => video.episode),
            0,
          );

          const episodeNumber = ++maxEpisodeNumbers[arc.number];

          const newVideo: Video = {
            season: arc.number,
            episode: episodeNumber,
            id: `${getArcPrefix(arc)}_${episodeNumber}`,
            title: episode.title,
            thumbnail: episode.thumbnail,
            released: episode.released,
          };

          const index =
            meta?.videos.findIndex((video) => video.id === newVideo.id) ?? -1;
          const [video] =
            meta !== undefined && index > -1
              ? meta?.videos.splice(index, 1)
              : [undefined];
          saveVideo(arc, newVideo, video);

          await saveStream(arc, newVideo, {
            infoHash: KAI.infoHash,
            fileIdx,
          });

          return newVideo;
        }),
      )
    ).flat(),
  );

  log(`Got ${videos.length} videos with KAIs, saving metadata...`);

  videos.sort((a, b) =>
    a.season !== b.season ? a.season - b.season : a.episode - b.episode,
  );

  await Promise.all(
    meta?.videos.map(async (video) => {
      log(`${video.title} removed`);

      try {
        await fs.unlink(`stream/series/${video.id}.json`);
      } catch (e: any) {
        if (!("code" in e) || e.code !== "ENOENT") throw e;
      }
    }) ?? [],
  );

  await writeJSON("meta/series/onepace.json", {
    meta: { ...meta, videos },
  });

  log("Done.");
})();
