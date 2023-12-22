declare module "m3u8-parser" {
  export class Parser {
    constructor();
    push(chunk: string): void;
    end(): void;
    manifest: Manifest;
  }
}

interface Manifest {
  allowCache: boolean;
  discontinuityStarts: any[];
  dateRanges: any[];
  segments: any[];
  mediaGroups?: {
    AUDIO: {};
    VIDEO: {};
    "CLOSED-CAPTIONS": {};
    SUBTITLES: {};
  };
  playlists?: Playlist[];
}

interface Playlist {
  attributes: Attributes;
  uri: string;
  timeline: number;
}

interface Attributes {
  "FRAME-RATE": number;
  VIDEO: string;
  CODECS: string;
  RESOLUTION: Resolution;
  BANDWIDTH: number;
}

interface Resolution {
  width: number;
  height: number;
}
