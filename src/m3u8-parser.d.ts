declare module "m3u8-parser" {
  // https://github.com/videojs/m3u8-parser#parsed-output
  interface Manifest {
    allowCache: boolean;
    endList?: boolean;
    mediaSequence?: number;
    dateRanges: [];
    discontinuitySequence?: number;
    playlistType?: string;
    custom?: {};
    playlists?: {
      attributes: {
        "FRAME-RATE": number;
        VIDEO: string;
        CODECS: string;
        RESOLUTION: {
          width: number;
          height: number;
        };
        BANDWIDTH: number;
      };
      uri: string;
      timeline: number;
    }[];
    mediaGroups?: {
      AUDIO: {};
      VIDEO: {};
      "CLOSED-CAPTIONS": {};
      SUBTITLES: {};
    };
    dateTimeString?: string;
    dateTimeObject?: Date;
    targetDuration?: number;
    totalDuration?: number;
    discontinuityStarts: number[];
    segments: {
      title: string;
      byterange: {
        length: number;
        offset: number;
      };
      duration: number;
      programDateTime: number;
      attributes: {};
      discontinuity: number;
      uri: string;
      timeline: number;
      key: {
        method: string;
        uri: string;
        iv: string;
      };
      map: {
        uri: string;
        byterange: {
          length: number;
          offset: number;
        };
      };
      "cue-out": string;
      "cue-out-cont": string;
      "cue-in": string;
      custom: {};
    }[];
  }

  export class Parser {
    constructor();
    push(chunk: string): void;
    end(): void;
    manifest: Manifest;
  }
}
