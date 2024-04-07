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
