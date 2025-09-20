export enum DownloadType {
  Magnet,
  Torrent,
  Direct,
  Pixeldrain,
  Telegram,
}

export interface DownloadTranslation {
  language_code: string;
  text: string;
}

export interface Download {
  id: string;
  type: DownloadType;
  uri: string;
  translations: DownloadTranslation[];
}

export interface Image {
  src: string;
  mimeType: string;
  width: number;
}

export interface EpisodeTranslation {
  language_code: string;
  title: string;
  description: string;
  includes_sub: boolean;
  includes_dub: boolean;
}

export interface Episode {
  id: string;
  part: number;
  invariant_title: string;
  released_at: string;
  duration: string;
  resolution: string;
  manga_chapters: string;
  anime_episodes: string;
  translations: EpisodeTranslation[];
  images: Image[];
  downloads: Download[];
}

export interface Arc {
  id: string;
  part: number;
  invariant_title: string;
  released_at: string;
  duration: string;
  resolution: string;
  manga_chapters: string;
  anime_episodes: string;
  translations: EpisodeTranslation[];
  images: Image[];
  episodes: Episode[];
  downloads: Download[];
}

export interface Video {
  season: number;
  episode: number;
  id: string;
  title: string;
  thumbnail?: string;
  overview?: string;
  released?: string;
}

export interface Stream {
  infoHash: string;
  fileIdx?: number;
  subtitles?: Subtitle[];
}

export interface Subtitle {
  id: string;
  url: string;
  lang: string;
}
