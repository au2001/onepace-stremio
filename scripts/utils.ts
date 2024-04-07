import * as fs from "fs/promises";
import * as prettier from "prettier";
import { Stream, Video } from "./types";
import { Arc } from "./generated/graphql";
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
    } else if (/^.+ \(movie \d+\)$/.test(range)) {
      // https://onepiece.fandom.com/wiki/Category:One_Piece_Movies
    } else {
      throw new Error(`Unknown anime episode range: ${range}`);
    }
  }

  return animeEpisodes;
};

export const saveVideo = (arc: Arc, newVideo: Video, video?: Video) => {
  if (video !== undefined) {
    let updated = false;

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
      console.error(
        `${video.id}'s title changed from ${video.title} to ${newVideo.title}`,
      );
      updated = true;
    }
    if (video.thumbnail !== newVideo.thumbnail) {
      console.error(
        `${video.id}'s thumbnail changed from ${video.thumbnail} to ${newVideo.thumbnail}`,
      );
      updated = true;
    }
    if (video.overview !== newVideo.overview) {
      console.error(
        `${video.id}'s overview changed from ${video.overview} to ${newVideo.overview}`,
      );
      updated = true;
    }
    if (video.released !== newVideo.released) {
      console.error(
        `${video.id}'s released changed from ${video.released} to ${newVideo.released}`,
      );
      updated = true;
    }

    if (
      updated &&
      newVideo.released !== undefined &&
      video.released !== undefined
    ) {
      console.log(
        `Update: ${arc.invariant_title} episode ${video.episode} "${video.title}" metadata changed.`,
      );
    }
  } else {
    console.error(`${newVideo.id} added`);
  }
};

export const saveStream = async (
  arc: Arc,
  video: Video,
  newStream?: Stream,
) => {
  let stream: Stream | undefined;
  try {
    const { streams } = await readJSON<{ streams: Stream[] }>(
      `stream/series/${video.id}.json`,
    );
    stream = streams[0];
  } catch (e: any) {
    if (!("code" in e) || e.code !== "ENOENT") throw e;
  }

  const streamId = `${stream?.infoHash}${stream?.fileIdx !== undefined ? `:${stream?.fileIdx}` : ""}`;
  const newStreamId = `${newStream?.infoHash}${newStream?.fileIdx !== undefined ? `:${newStream?.fileIdx}` : ""}`;
  if (newStream !== undefined) {
    if (stream !== undefined) {
      let updated = false;

      if (stream.infoHash !== newStream.infoHash) {
        console.error(
          `${video.id}'s stream infoHash changed from ${streamId} to ${newStreamId}`,
        );
        updated = true;
      } else if (stream.fileIdx !== newStream.fileIdx) {
        console.error(
          `${video.id}'s stream fileIdx changed from ${stream.fileIdx} to ${newStream.fileIdx}`,
        );
        updated = true;
      }

      if (updated) {
        console.log(
          `Update: ${arc.invariant_title} episode ${video.episode} "${video.title}" re-released.`,
        );
      }
    } else {
      console.error(`${video.id}'s stream created at ${newStreamId}`);
      console.log(
        `NEW RELEASE! ${arc.invariant_title} episode ${video.episode} "${video.title}" available.`,
      );
    }

    await writeJSON(`stream/series/${video.id}.json`, {
      streams: [newStream],
    });

    return true;
  } else if (stream !== undefined) {
    console.error(`${video.id}'s stream removed from ${streamId}`);

    try {
      await fs.unlink(`stream/series/${video.id}.json`);
    } catch (e: any) {
      if (!("code" in e) || e.code !== "ENOENT") throw e;
    }
  }

  return false;
};
