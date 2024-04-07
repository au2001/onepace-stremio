import fs from "fs/promises";
import path from "path";
import { Subtitle } from "./types";
import { Arc, Episode } from "./generated/graphql";

const LANG_CODES = {
  Deutsch: "de",
  English: "en",
  Italian: "it",
  Portugues: "pt",
};
const BASE_URL =
  "https://raw.githubusercontent.com/one-pace/one-pace-public-subtitles/main/";
const PATH = "./main/Release/Final Subs";

let cache: Promise<string[]> | undefined = undefined;
export const listFiles = async (): Promise<string[]> =>
  await (cache ??= fs.readdir(path.join(__dirname, "./subtitles/", PATH)));

export const getSubtitles = async (arc: Arc, episode: Episode) => {
  const filter = ` ${arc.invariant_title} ${episode.part.toString().padStart(2, "0")} `;

  return (await listFiles()).flatMap<Subtitle>((file) => {
    if (!file.includes(filter) || !file.endsWith(".ass")) return [];

    const lang = file.match(/] ([^\[\]]+)\.ass$/)?.[1] ?? "English";
    if (!(lang in LANG_CODES)) {
      throw new Error(
        `Unknown subtitle language ${lang} for ${arc.invariant_title} ${episode.part}`,
      );
    }

    const url = path.join(BASE_URL, encodeURI(PATH), encodeURI(file));

    return {
      id: file,
      lang: LANG_CODES[lang as keyof typeof LANG_CODES],
      url: url,
    };
  });
};
