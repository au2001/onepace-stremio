import fs from "fs/promises";
import path from "path";
import { Arc, Download, Episode } from "./types";
import { google } from "googleapis";
import "dotenv/config";
import { RateLimiter } from "limiter";

const EPISODES = "1HQRMJgu_zArp-sLnvFMDzOyjdsht87eFLECxMK858lA";
const DESCRIPTIONS = "1M0Aa2p5x7NioaH9-u8FyHq6rH3t5s6Sccs8GoC6pHAM";

export async function fetchArcs() {
  const { spreadsheets } = google.sheets({
    version: "v4",
    auth: process.env.GOOGLE_API_KEY,
  });

  const {
    data: { sheets: [{ data: [{ rowData: overview }] = [] }] = [] },
  } = await spreadsheets.get({
    spreadsheetId: EPISODES,
    ranges: ["B2:B"],
    includeGridData: true,
  });

  const {
    data: { sheets },
  } = await spreadsheets.get({
    spreadsheetId: EPISODES,
    ranges: overview?.flatMap(({ values: [row] = [] }) => {
      if (row.hyperlink === undefined) return [];
      const title = (row?.formattedValue ?? "").replace(
        /\s+\((TBR|WIP)\)$/,
        "",
      );
      return `'${title}'!B2:G`;
    }),
    includeGridData: true,
  });

  return (
    await Promise.all<Arc | []>(
      sheets?.map(
        async (
          { properties: { title } = {}, data: [{ rowData }] = [] },
          i,
        ) => ({
          number: i + 1,
          title: title ?? "",
          episodes: (
            await Promise.all<Episode | []>(
              rowData?.flatMap(
                async (
                  {
                    values: [
                      title,
                      ,
                      animeEpisodes,
                      releaseDate,
                      ,
                      torrent,
                    ] = [undefined],
                  },
                  i,
                ) => {
                  if (torrent?.formattedValue === undefined) return [];
                  if (title?.formattedValue?.match(/ \(G8\)$/)) return [];

                  const download = await fetchNyaaDownload(torrent.hyperlink ?? "");

                  // TODO: Fetch description & image
                  return {
                    number: i + 1,
                    title: title?.formattedValue ?? "",
                    releaseDate: new Date(releaseDate?.formattedValue ?? ""),
                    animeEpisodes: animeEpisodes?.formattedValue ?? "",
                    download: { ...download, crc32: torrent.formattedValue ?? "" },
                  };
                },
              ) ?? [],
            )
          ).flat(),
        }),
      ) ?? [],
    )
  ).flat();
}

const limiter = new RateLimiter({ tokensPerInterval: 1, interval: 1000 });

let NYAA_CACHE: Record<string, string | Promise<string>> | undefined;
const NYAA_CACHE_FILE = path.join(__dirname, "../cache/nyaa.json");

async function fetchNyaaDownload(url: string): Promise<Omit<Download, "crc32">> {
  if (NYAA_CACHE === undefined) {
    try {
      const raw = await fs.readFile(NYAA_CACHE_FILE, "utf-8");
      NYAA_CACHE = JSON.parse(raw);
    } catch (e) {
      if (!(e instanceof Error) || !("code" in e) || e.code !== "ENOENT") {
        throw e;
      }
    }

    NYAA_CACHE ??= {};
  }

  let [, id] = url.match(/^https:\/\/nyaa.si\/view\/(\d+)$/) ?? [undefined];
  if (id !== undefined && id in NYAA_CACHE) {
    const infoHash = await NYAA_CACHE[id];
    return {
      infoHash,
      uri: `https://nyaa.si/download/${id}.torrent`,
    };
  };

  let [, infoHash] = url.match(/^https:\/\/nyaa.si\/\?q=([0-9a-f]+)$/) ?? [undefined];
  if (infoHash !== undefined && infoHash in NYAA_CACHE) {
    const id = await NYAA_CACHE[infoHash];
    return {
      infoHash,
      uri: `https://nyaa.si/download/${id}.torrent`,
    };
  };

  if (id === undefined && infoHash === undefined) {
    throw new Error(`Unsupported nyaa.si URL format: ${url}`);
  }

  const promise = (async () => {
    await limiter.removeTokens(1);
    const res = await fetch(url);
    const text = await res.text();
    if (!res.ok) throw new Error(text);

    const [, id] = res.url.match(/^https:\/\/nyaa.si\/view\/(\d+)$/) ?? [undefined];
    if (id === undefined) throw new Error(text);

    const [, infoHash] = text.match(/<kbd>([0-9a-f]{40})<\/kbd>/) ?? [undefined];
    if (infoHash === undefined) throw new Error(text);

    return [id, infoHash] as const;
  })();

  if (id !== undefined) {
    NYAA_CACHE[id] = promise.then(([, infoHash]) => infoHash);
  } else if (infoHash !== undefined) {
    NYAA_CACHE[infoHash] = promise.then(([id, ]) => id);
  }

  [id, infoHash] = await promise;
  NYAA_CACHE[id] = infoHash;
  NYAA_CACHE[infoHash] = id;

  void (async () => {
    await fs.mkdir(path.dirname(NYAA_CACHE_FILE), {
      recursive: true,
    });

    await fs.writeFile(
      NYAA_CACHE_FILE,
      JSON.stringify(NYAA_CACHE, (_, value) =>
        value instanceof Promise ? undefined : value,
      ),
    );
  })();

  return {
    infoHash,
    uri: `https://nyaa.si/download/${id}.torrent`,
  };
}
