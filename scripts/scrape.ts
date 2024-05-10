import * as fs from "fs/promises";
import { GraphQLClient } from "graphql-request";
import {
  getArcPrefix,
  getCoveredAnimeEpisodes,
  readJSON,
  saveStream,
  saveVideo,
  writeJSON,
} from "./utils";
import { getVideo } from "./parse";
import { Video } from "./types";
import { getSdk } from "./generated/graphql";
import KAI from "./kai.json";

(async () => {
  const client = new GraphQLClient("https://onepace.net/api/graphql");
  const sdk = getSdk(client);
  const { arcs } = await sdk.getArcs();

  let { meta } =
    (await readJSON<{
      meta: { videos: Video[] };
    }>("meta/series/onepace.json")) ?? {};

  const coveredAnimeEpisodes = new Set<number>();

  const videos = await Promise.all(
    arcs.flatMap((arc) => {
      if (arc.part === 99) return [];

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
          getCoveredAnimeEpisodes(episode.anime_episodes).forEach((episode) =>
            coveredAnimeEpisodes.add(episode),
          );
        }

        return newVideo;
      });
    }),
  );

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

          const arc = arcs.find((arc) => arc.invariant_title === episode.arc);
          if (arc === undefined)
            throw new Error(`Unknown KAI arc: ${episode.arc}`);

          maxEpisodeNumbers[arc.part] ??= Math.max(
            ...videos
              .filter((video) => video.season === arc.part)
              .map((video) => video.episode),
            0,
          );

          const episodeNumber = ++maxEpisodeNumbers[arc.part];

          const newVideo: Video = {
            season: arc.part,
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

  videos.sort((a, b) =>
    a.season !== b.season ? a.season - b.season : a.episode - b.episode,
  );

  await Promise.all(
    meta?.videos.map(async (video) => {
      console.error(`${video.title} removed`);

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
})();
