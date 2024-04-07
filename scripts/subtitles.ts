import fs from "fs/promises";
import path from "path";
import ffmpeg from "fluent-ffmpeg";
import { Subtitle, Video } from "./types";
import { Arc } from "./generated/graphql";

const LANG_CODES = {
  Deutsch: "de",
  English: "en",
  Italian: "it",
  Portugues: "pt",
};
const LOCAL_DIR = path.join(__dirname, "./subtitles/main/Release/Final Subs");
const PUBLIC_URL = "https://onepace.arl.sh/";

let cache: Promise<string[]> | undefined = undefined;
const listFiles = async (): Promise<string[]> =>
  await (cache ??= fs.readdir(LOCAL_DIR));

const convert = async (input: string, output: string) =>
  await new Promise((resolve, reject) => {
    ffmpeg()
      .input(path.join(LOCAL_DIR, input))
      .output(output)
      .on("error", reject)
      .on("end", resolve)
      .run();
  });

const removeComments = async (file: string) => {
  let data = (await fs.readFile(file)).toString();

  data = data.replace(/\{[^\}]*\}/gm, "");

  await fs.writeFile(file, data);
};

export const getSubtitles = async (arc: Arc, video: Video) => {
  const filter = ` ${arc.invariant_title} ${video.episode.toString().padStart(2, "0")} `;
  const langs = new Set<string>();

  let subtitles: Subtitle[] = [];

  for (const input of await listFiles()) {
    if (!input.endsWith(".ass") || !input.includes(filter)) continue;

    const langName = input.match(/] ([^\[\]]+)\.ass$/)?.[1] ?? "English";
    if (!(langName in LANG_CODES))
      throw new Error(`Unknown subtitle language ${langName} for ${video.id}`);

    const lang = LANG_CODES[langName as keyof typeof LANG_CODES];
    if (langs.has(lang)) continue;
    langs.add(lang);

    const id = `${video.id}_${lang}`;
    const output = path.join("./static/", `${id}.srt`);
    const file = path.join(__dirname, "..", output);

    await convert(input, file);
    await removeComments(file);

    subtitles.push({
      id,
      lang,
      url: new URL(output, PUBLIC_URL).toString(),
    });
  }

  return subtitles;
};
