export interface Arc {
  number: number;
  title: string;
  episodes: Episode[];
}

export interface Episode {
  number: number;
  title: string;
  description?: string;
  releaseDate: Date;
  animeEpisodes: string;
  image?: string;
  download: Download;
}

export interface Download {
  infoHash: string;
  uri: string;
  crc32: string;
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
