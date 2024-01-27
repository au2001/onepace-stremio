import * as fs from "fs/promises";
import {
  getArcPrefix,
  getCoveredAnimeEpisodes,
  readJSON,
  saveStream,
  saveVideo,
  writeJSON,
} from "./utils";
import { Arc, Video } from "./types";
import KAI from "./kai.json";
import { getVideo } from "./parse";

(async () => {
  const response = await fetch("https://onepace.net/watch");
  const html = await response.text();
  const [, data] =
    html.match(
      /<script id="__NEXT_DATA__" type="application\/json">(.*?)<\/script>/,
    ) ?? [];

  const {
    props: {
      pageProps: { arcs },
    },
  } = JSON.parse(data) as { props: { pageProps: { arcs: Arc[] } } };

  let { meta } = await readJSON<{
    meta: { videos: Video[] };
  }>("meta/series/onepace.json");

  const coveredAnimeEpisodes = new Set<number>();

  const videos = await Promise.all(
    arcs.flatMap((arc) =>
      arc.part < 100
        ? arc.episodes.map(async (episode) => {
            const [newVideo, newStream] = await getVideo(arc, episode);

            const index = meta.videos.findIndex(
              (video) => video.id === newVideo.id,
            );
            const [video] =
              index > -1 ? meta.videos.splice(index, 1) : [undefined];
            saveVideo(newVideo, video);

            if (await saveStream(newVideo.id, newStream)) {
              getCoveredAnimeEpisodes(episode.anime_episodes).forEach(
                (episode) => coveredAnimeEpisodes.add(episode),
              );
            }

            return newVideo;
          })
        : [],
    ),
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
            id: `${getArcPrefix(arc)}_${episodeNumber}`,
            season: arc.part,
            episode: episodeNumber,
            title: episode.title,
            thumbnail: episode.thumbnail,
            released: episode.released,
          };

          const index = meta.videos.findIndex(
            (video) => video.id === newVideo.id,
          );
          const [video] =
            index > -1 ? meta.videos.splice(index, 1) : [undefined];
          saveVideo(newVideo, video);

          await saveStream(newVideo.id, {
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
    meta.videos.map(async (video) => {
      console.warn(`${video.title} removed`);

      try {
        await fs.unlink(`stream/series/${video.id}.json`);
      } catch (e: any) {
        if (!("code" in e) || e.code !== "ENOENT") throw e;
      }
    }),
  );

  await writeJSON("meta/series/onepace.json", {
    meta: { ...meta, videos },
  });

  console.log(`Found ${videos.length} total episodes`);
})();
