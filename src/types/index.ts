
export type Language = 'ar' | 'en' | 'de' | 'fr';
export type TimeFormat = '12h' | '24h';
export type ViewMode = 'list' | 'grid';
export type PlaylistType = 'm3u' | 'xtream' | 'stalker' | 'portal';

export interface Channel {
  id: string;
  stream_id: string;
  name: string;
  logo?: string;
  stream_icon?: string;
  cover?: string;
  category: string;
  category_id: string;
  url: string;
  type: 'live' | 'movie' | 'series';
  isFavorite?: boolean;
  epg_channel_id?: string;
  tvg_id?: string;
  tvg_name?: string;
  container_extension?: string;
  series_id?: string;
  season_num?: number;
  episode_num?: number;
  category_name?: string;
}

export interface Playlist {
  id: string;
  name: string;
  type: PlaylistType;
  url?: string;
  portal?: string;
  username?: string;
  password?: string;
  macAddress?: string;
  m3uContent?: string;
  expDate?: string | number | null;
  userId?: string;
  isProtected?: boolean;
  pin?: string;
  epgUrl?: string;
}

export interface AppSettings {
  language: Language;
  hiddenCategories: string[];
  hiddenLiveCategories: string[];
  hiddenMovieCategories: string[];
  hiddenSeriesCategories: string[];
  timeFormat: TimeFormat;
  viewMode: ViewMode;
  useExternalPlayer: boolean;
  externalPlayers: string[];
  selectedPlayer: string;
  installedPlayers: string[];
  activePlaylistId: string | null;
  searchHistory: {
    movies: string[];
    series: string[];
  };
  royalThemeColor?: string;
  icon3DStyle?: string;
  backgroundStyle?: string;
  customBackground?: string | { type: 'image' | 'video'; url: string; name: string; } | null;
  vpnEnabled?: boolean;
  vpnRegion?: string;
  vpnMode?: string;
  dashboardLayout?: string;
  splashSoundTrack?: string;
  splashStyle?: string;
  iconScale?: 'small' | 'medium' | 'large';
  zoomScale?: number;
  categoryOrders?: Record<string, string[]>;
  channelOrders?: Record<string, string[]>;
  parentalPassword?: string;
}

export interface VodItem extends Channel {
  info?: any;
}

export interface SeriesEpisode {
  id: string;
  stream_id: string;
  name: string;
  title?: string;
  url: string;
  stream_url?: string;
  direct_source?: string;
  container_extension?: string;
  season_num?: number;
  episode_num?: number;
  info?: any;
}

export interface EPGProgram {
  start: string;
  stop: string;
  title: string;
  description?: string;
  channelId: string;
}

export interface EPGData {
  [channelId: string]: EPGProgram[];
}

