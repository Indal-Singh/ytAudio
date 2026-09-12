export interface Track {
  id: string;
  title: string;
  uploader: string;
  duration: number;
  duration_string: string;
  thumbnail: string;
  audioUrl?: string;
  url?: string;
  format?: string;
  lastPosition?: number;
  playedAt?: number;
}

export interface LastSessionState {
  track: Track;
  position: number;
  duration: number;
  timestamp: number;
}

export interface RewindPlaylist {
  id: string;
  seedId: string;
  title: string;
  seedTitle: string;
  seedArtist: string;
  thumbnail: string;
  trackCount: number;
  tracks: Track[];
  playedAt: number;
}

export interface PlayerContextType {
  currentTrack: Track | null;
  isPlaying: boolean;
  isLoading: boolean;
  getCurrentTime: () => number;
  subscribeTime: (listener: (t: number) => void) => () => void;
  duration: number;
  volume: number;
  isMuted: boolean;
  playbackRate: number;
  isLooping: boolean;
  isShuffling: boolean;
  queue: Track[];
  queueIndex: number;
  history: Track[];
  rewindPlaylists: RewindPlaylist[];
  restoreRewindPlaylist: (id: string, startIndex?: number) => Promise<void>;
  removeRewindPlaylist: (id: string) => void;
  clearRewindPlaylists: () => void;
  lastSession: LastSessionState | null;
  showVisualizer: boolean;
  showDirectModal: boolean;
  showQueueDrawer: boolean;
  showVideoModal: boolean;
  showDownloadModal: boolean;
  showFullscreenPlayer: boolean;
  downloadTrack: Track | null;
  error: string | null;
  analyser: AnalyserNode | null;
  playTrack: (
    track: Track,
    startTime?: number,
    options?: { fromQueue?: boolean; surroundingList?: Track[] }
  ) => Promise<void>;
  playFromQueue: (index: number) => Promise<void>;
  resumeLastSession: () => Promise<void>;
  dismissLastSession: () => void;
  togglePlay: () => void;
  pauseAudio: () => void;
  resumeAudio: () => void;
  syncTimeAndPlay: (seconds: number, autoPlay?: boolean) => void;
  seek: (seconds: number) => void;
  skipBy: (seconds: number) => void;
  setVolume: (val: number) => void;
  toggleMute: () => void;
  setPlaybackRate: (rate: number) => void;
  toggleLoop: () => void;
  toggleShuffle: () => void;
  isAutoplay: boolean;
  toggleAutoplay: () => void;
  playNext: () => void;
  playPrev: () => void;
  addToQueue: (track: Track) => void;
  addToPlayNext: (track: Track) => void;
  removeFromQueue: (index: number) => void;
  moveInQueue: (fromIndex: number, toIndex: number) => void;
  clearQueue: () => void;
  clearHistory: () => void;
  setShowVisualizer: (val: boolean | ((prev: boolean) => boolean)) => void;
  setShowDirectModal: (val: boolean) => void;
  setShowQueueDrawer: (val: boolean | ((prev: boolean) => boolean)) => void;
  setShowVideoModal: (val: boolean) => void;
  setShowDownloadModal: (val: boolean) => void;
  setShowFullscreenPlayer: (val: boolean | ((prev: boolean) => boolean)) => void;
  openDownloadModal: (track?: Track) => void;
  playDirectUrl: (urlOrId: string) => Promise<void>;
  isFindingRelated: boolean;
  loadMoreRelatedSongs: () => Promise<void>;
}

export type PlaybackStatus = {
  currentId: string | null;
  isPlaying: boolean;
  isLoading: boolean;
};

export type PlayerActions = {
  playTrack: (
    track: Track,
    startTime?: number,
    options?: { fromQueue?: boolean; surroundingList?: Track[] }
  ) => Promise<void>;
  playFromQueue: (index: number) => Promise<void>;
  togglePlay: () => void;
  addToQueue: (track: Track) => void;
  addToPlayNext: (track: Track) => void;
  openDownloadModal: (track?: Track) => void;
};
