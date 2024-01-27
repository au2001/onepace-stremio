import * as fs from "fs/promises";
import * as prettier from "prettier";
import { Arc, Stream, Video } from "./types";
import ARC_PREFIXES from "./arcs.json";

export const readJSON = async <T>(path: string) =>
  JSON.parse((await fs.readFile(path)).toString()) as T;

export const writeJSON = async (path: string, data: any) =>
  await fs.writeFile(
    path,
    await prettier.format(JSON.stringify(data, null, "  "), { parser: "json" }),
  );

export const getArcPrefix = (arc: Arc) => {
  if (!(arc.invariant_title in ARC_PREFIXES))
    throw new Error(`New arc ${arc.invariant_title} doesn't have a prefix`);

  return ARC_PREFIXES[arc.invariant_title as keyof typeof ARC_PREFIXES];
};

export const getCoveredAnimeEpisodes = (string?: string) => {
  const animeEpisodes = new Set<number>();

  for (const range of string?.split(", ") ?? []) {
    if (/^[1-9]\d*( \(Intro\))?$/.test(range)) {
      animeEpisodes.add(parseInt(range));
    } else if (/^[1-9]\d*-[1-9]\d*$/.test(range)) {
      const [min, max] = range.split("-").map((boundary) => parseInt(boundary));
      for (let episode = min; episode <= max; ++episode)
        animeEpisodes.add(episode);
    } else if (
      /^Episode of (Nami|Luffy|Merry|Sabo|East Blue|Sky Island)$/.test(range)
    ) {
      // https://onepiece.fandom.com/wiki/Category:Specials
    } else {
      throw new Error(`Unknown anime episode range: ${range}`);
    }
  }

  return animeEpisodes;
};

export const saveVideo = (newVideo: Video, video?: Video) => {
  if (video !== undefined) {
    if (video.season !== newVideo.season) {
      throw new Error(
        `${video.id}'s season changed from ${video.season} to ${newVideo.season}`,
      );
    }
    if (video.episode !== newVideo.episode) {
      throw new Error(
        `${video.id}'s episode changed from ${video.episode} to ${newVideo.episode}`,
      );
    }
    if (video.id !== newVideo.id) {
      throw new Error(
        `${video.id}'s id changed from ${video.id} to ${newVideo.id}`,
      );
    }
    if (video.title !== newVideo.title) {
      console.warn(
        `${video.id}'s title changed from ${video.title} to ${newVideo.title}`,
      );
    }
    if (video.thumbnail !== newVideo.thumbnail) {
      console.warn(
        `${video.id}'s thumbnail changed from ${video.thumbnail} to ${newVideo.thumbnail}`,
      );
    }
    if (video.overview !== newVideo.overview) {
      console.warn(
        `${video.id}'s overview changed from ${video.overview} to ${newVideo.overview}`,
      );
    }
    if (video.released !== newVideo.released) {
      console.warn(
        `${video.id}'s released changed from ${video.released} to ${newVideo.released}`,
      );
    }
  } else {
    console.warn(`${newVideo.id} added`);
  }
};

export const saveStream = async (id: string, newStream?: Stream) => {
  let stream: Stream | undefined;
  try {
    const { streams } = await readJSON<{ streams: Stream[] }>(
      `stream/series/${id}.json`,
    );
    stream = streams[0];
  } catch (e: any) {
    if (!("code" in e) || e.code !== "ENOENT") throw e;
  }

  const streamId = `${stream?.infoHash}${stream?.fileIdx !== undefined ? `:${stream?.fileIdx}` : ""}`;
  const newStreamId = `${newStream?.infoHash}${newStream?.fileIdx !== undefined ? `:${newStream?.fileIdx}` : ""}`;
  if (newStream !== undefined) {
    if (stream !== undefined) {
      if (stream.infoHash !== newStream.infoHash) {
        console.warn(
          `${id}'s stream infoHash changed from ${streamId} to ${newStreamId}`,
        );
      } else if (stream.fileIdx !== newStream.fileIdx) {
        console.warn(
          `${id}'s stream fileIdx changed from ${stream.fileIdx} to ${newStream.fileIdx}`,
        );
      }
    } else {
      console.warn(`${id}'s stream created at ${newStreamId}`);
    }

    await writeJSON(`stream/series/${id}.json`, {
      streams: [newStream],
    });

    return true;
  } else if (stream !== undefined) {
    console.warn(`${id}'s stream removed from ${streamId}`);

    try {
      await fs.unlink(`stream/series/${id}.json`);
    } catch (e: any) {
      if (!("code" in e) || e.code !== "ENOENT") throw e;
    }
  }

  return false;
};
