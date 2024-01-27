export interface Download {
  type: string;
  uri: string;
}

export interface Translation {
  language_code: string;
  title: string;
  description: string;
}

export interface Image {
  src: string;
}

export interface Episode {
  part: number;
  invariant_title: string;
  released_at: string;
  manga_chapters: string;
  anime_episodes?: string;
  translations: Translation[];
  images: Image[];
  downloads: Download[];
}

export interface Arc {
  part: number;
  invariant_title: string;
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
}
