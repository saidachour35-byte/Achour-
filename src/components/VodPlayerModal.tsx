import React, { useState, useEffect, useRef, useCallback } from 'react';
import { createPortal } from 'react-dom';
import Hls from 'hls.js';

import {
  X,
  Play,
  Pause,
  RotateCcw,
  RotateCw,
  Sliders,
  Subtitles as SubtitleIcon,
  Languages,
  Maximize2,
  ListVideo,
  Clock,
  Sparkles,
  ChevronRight,
  ChevronLeft,
  Check,
  Zap,
  Settings,
  PlayCircle,
  Volume2,
  VolumeX,
  Tv,
  Star,
  Info
} from 'lucide-react';
import { VodItem, SeriesEpisode } from '../types';
import { pushBackHandler, BackPriority, parseTVKeyEvent } from '../utils/tvNavigation';
import { useI18n } from '../utils/i18n';
import { getPlatformUrl } from '../utils/platform';

export interface VodPlayerModalProps {
  item?: VodItem;
  media?: any;
  episodes?: SeriesEpisode[];
  episodesList?: any[];
  itemsList?: any[];
  epgData?: Record<string, any[]>;
  currentEpisodeIndex?: number;
  mediaType?: 'movie' | 'series' | 'live';
  activePlaylist?: any;
  settings?: any;
  isRtl?: boolean;
  onClose: () => void;
  onSelectEpisode?: (index: number) => void;
  onSelectMedia?: (media: any) => void;
  onToggleFavorite?: (media: any) => void;
  isFavorite?: boolean;
  isPreview?: boolean;
  containerId?: string;
}



type AspectRatioMode = 'fit' | 'fill' | 'zoom' | '16:9' | '4:3';
type ActivePopup = 'none' | 'audio' | 'subtitles' | 'quality' | 'aspect' | 'speed' | 'sleep' | 'episodes' | 'subtitle-settings';

const extractAudioTracksFromManifest = (manifestText: string, streamUrl: string) => {
  const tracks: Array<{ id: number; name: string; lang: string }> = [];
  const regex = /#EXT-X-MEDIA:TYPE=AUDIO[^\n]*?NAME="([^"]+)"[^\n]*?(?:LANGUAGE="([^"]+)")?/gi;
  let match;
  let idx = 0;
  while ((match = regex.exec(manifestText)) !== null) {
    const name = match[1];
    const lang = match[2] || name;
    tracks.push({
      id: idx++,
      name: name,
      lang: lang
    });
  }
  if (tracks.length === 0 && streamUrl) {
    try {
      const u = new URL(streamUrl);
      const audioParam = u.searchParams.get('audio') || u.searchParams.get('lang') || u.searchParams.get('audio_track');
      if (audioParam) {
        tracks.push({
          id: 0,
          name: `Audio (${audioParam})`,
          lang: audioParam
        });
      }
    } catch (e) {}
  }
  return tracks;
};

export const VodPlayerModal: React.FC<VodPlayerModalProps> = ({
  item,
  media,
  episodes,
  episodesList,
  itemsList,
  epgData,
  currentEpisodeIndex = 0,
  mediaType = 'movie',
  activePlaylist,
  settings,
  isRtl: propIsRtl,
  onClose,
  onSelectEpisode,
  onSelectMedia,
  onToggleFavorite,
  isFavorite = false,
  isPreview = false,
  containerId
}) => {
  const { t, isRtl } = useI18n(settings?.language || 'ar');
  const [portalTarget, setPortalTarget] = useState<HTMLElement | null>(null);

  useEffect(() => {
    if (containerId) {
      const el = document.getElementById(containerId);
      setPortalTarget(el);
    } else {
      setPortalTarget(null);
    }
  }, [containerId]);

  const activeVod = item || media || {};
  const vodEpisodes = episodes || episodesList || [];
  const isLive = mediaType === 'live';

  // Live Clock for Satellite Receiver Infobar
  const [liveClock, setLiveClock] = useState<Date>(new Date());
  useEffect(() => {
    if (!isLive) return;
    const timer = setInterval(() => setLiveClock(new Date()), 1000);
    return () => clearInterval(timer);
  }, [isLive]);

  const getCurrentProgram = (ch: any) => {
    if (!ch || !epgData) return null;
    const cid = ch.stream_id || ch.id || ch.name;
    const programs = epgData[cid] || epgData[ch.name];
    if (!programs) return null;
    const now = new Date();
    return programs.find((p: any) => p.start <= now && p.stop >= now);
  };

  const getNextProgram = (ch: any) => {
    if (!ch || !epgData) return null;
    const cid = ch.stream_id || ch.id || ch.name;
    const programs = epgData[cid] || epgData[ch.name];
    if (!programs) return null;
    const now = new Date();
    return programs.find((p: any) => p.start > now);
  };

  const channelIndex = (itemsList && itemsList.length > 0)
    ? (itemsList.findIndex((ch: any) => String(ch.stream_id || ch.id) === String(activeVod.stream_id || activeVod.id)) + 1)
    : 1;

  const currentProg = getCurrentProgram(activeVod);
  const nextProg = getNextProgram(activeVod);

  let currentProgPercent = 0;
  if (currentProg && currentProg.start && currentProg.stop) {
    const s = new Date(currentProg.start).getTime();
    const e = new Date(currentProg.stop).getTime();
    const n = new Date().getTime();
    if (e > s) {
      currentProgPercent = Math.min(100, Math.max(0, ((n - s) / (e - s)) * 100));
    }
  }

  const formatTimeHHMM = (d: any) => {
    if (!d) return '';
    const dateObj = new Date(d);
    if (isNaN(dateObj.getTime())) return String(d);
    return dateObj.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false });
  };

  // Video element and container refs
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const hlsRef = useRef<Hls | null>(null);
  const controlsTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const autoNextTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const lastFocusedElementRef = useRef<HTMLElement | null>(null);

  // Playback States
  const [isPlaying, setIsPlaying] = useState<boolean>(true);
  const [currentTime, setCurrentTime] = useState<number>(0);
  const [duration, setDuration] = useState<number>(0);
  const [buffered, setBuffered] = useState<number>(0);
  const [volume, setVolume] = useState<number>(1);
  const [isMuted, setIsMuted] = useState<boolean>(false);
  const [playbackSpeed, setPlaybackSpeed] = useState<number>(1);
  const [aspectRatio, setAspectRatio] = useState<AspectRatioMode>('fit');
  const [showControls, setShowControls] = useState<boolean>(false);
  const [isSeeking, setIsSeeking] = useState<boolean>(false);

  // Resume State
  const [showResumePrompt, setShowResumePrompt] = useState<boolean>(false);
  const [savedResumeTime, setSavedResumeTime] = useState<number>(0);

  // Auto-Next Episode State
  const [showAutoNextPrompt, setShowAutoNextPrompt] = useState<boolean>(false);
  const [autoNextCountdown, setAutoNextCountdown] = useState<number>(10);

  // Popups & Active Drawers
  const [activePopup, setActivePopup] = useState<ActivePopup>('none');

  // HLS & Stream Specs
  const [audioTracks, setAudioTracks] = useState<Array<{ id: number; name: string; lang: string }>>([]);
  const [selectedAudioTrack, setSelectedAudioTrack] = useState<number>(-1);
  
  const [hlsQualities, setHlsQualities] = useState<Array<{ id: number; height: number; bitrate: number; name: string }>>([]);
  const [selectedQuality, setSelectedQuality] = useState<number>(-1); // -1 is Auto
  const [realResolution, setRealResolution] = useState<string>('');

  // Subtitle States
  const [subtitles, setSubtitles] = useState<Array<{ id: number; name: string; lang: string; mode: string }>>([]);
  const [selectedSubtitle, setSelectedSubtitle] = useState<number>(-1); // -1 is Off
  const [subSyncOffset, setSubSyncOffset] = useState<number>(0); // Seconds offset (-5 to +5)
  const [subFontSize, setSubFontSize] = useState<'sm' | 'md' | 'lg' | 'xl'>('lg');
  const [subColor, setSubColor] = useState<string>('#FFFFFF');
  const [subBg, setSubBg] = useState<'none' | 'semi' | 'black'>('semi');

  // Sleep Timer
  const [sleepTimerMinutes, setSleepTimerMinutes] = useState<number | null>(null);
  const [sleepTimerTimeLeft, setSleepTimerTimeLeft] = useState<number | null>(null);

  // Direct Seeking Overlay State
  const [seekNotice, setSeekNotice] = useState<string | null>(null);
  const seekNoticeTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Key debouncing
  const lastKeyTimeRef = useRef<number>(0);

  // Stream URL resolver
  const vodId = activeVod.id || activeVod.stream_id || activeVod.title || 'vod_1';
  const streamUrl = activeVod.stream_url || activeVod.url || activeVod.direct_source || '';
  const isSeries = mediaType === 'series' || (vodEpisodes && vodEpisodes.length > 0);
  const currentEpisode = isSeries ? vodEpisodes[currentEpisodeIndex] : null;
  const rawActiveStreamUrl = currentEpisode?.stream_url || currentEpisode?.url || currentEpisode?.direct_source || streamUrl;

  let playUrl = rawActiveStreamUrl;
  if (isLive && playUrl) {
    if (playUrl.includes('/live/') && playUrl.endsWith('.ts')) {
      playUrl = playUrl.replace(/\.ts$/, '.m3u8');
    } else if (playUrl.endsWith('.ts')) {
      playUrl = playUrl.replace(/\.ts$/, '.m3u8');
    }
  }

  const activeStreamUrl = (playUrl && (playUrl.startsWith('http://') || playUrl.startsWith('https://')) && !playUrl.includes('/api/proxy/stream'))
    ? getPlatformUrl('stream', playUrl, { vpnRegion: settings?.vpnRegion || 'auto' })
    : playUrl;
  
  const displayTitle = isSeries
    ? `${activeVod.title || activeVod.name || (isRtl ? 'مسلسل' : 'Series')} - S${currentEpisode?.season_num || 1} E${currentEpisode?.episode_num || currentEpisodeIndex + 1}: ${currentEpisode?.title || currentEpisode?.name || ''}`
    : activeVod.title || activeVod.name || (isRtl ? 'عرض فيديو' : 'Video');

  // 1. Initialize Player & Load Stream
  useEffect(() => {
    const video = videoRef.current;
    if (!video || !activeStreamUrl) return;

    // Check for saved progress (Movies & Series VOD only - NEVER for Live TV!)
    if (!isLive) {
      const progressKey = `vod_progress_${vodId}_${currentEpisodeIndex}`;
      const savedProgress = localStorage.getItem(progressKey);
      if (savedProgress) {
        const parsedTime = parseFloat(savedProgress);
        if (!isNaN(parsedTime) && parsedTime > 15) {
          setSavedResumeTime(parsedTime);
          setShowResumePrompt(true);
        }
      }
    }

    const isHls = isLive || activeStreamUrl.includes('.m3u8') || activeStreamUrl.includes('smil:') || !activeStreamUrl.match(/\.(mp4|mkv|avi|mov|webm)(\?.*)?$/i);

    if (Hls.isSupported() && isHls) {
      if (hlsRef.current) {
        try {
          hlsRef.current.stopLoad();
          hlsRef.current.detachMedia();
          hlsRef.current.destroy();
        } catch (e) {}
        hlsRef.current = null;
      }

      const hls = new Hls({
        enableWorker: true,
        lowLatencyMode: false,
        backBufferLength: 30,
        maxBufferLength: isLive ? 30 : 60,
        maxMaxBufferLength: isLive ? 60 : 120,
        maxBufferSize: 128 * 1024 * 1024,
        liveSyncDurationCount: 3,
        liveMaxLatencyDurationCount: isLive ? 10 : Infinity,
        maxBufferHole: 1.0,
        highBufferWatchdogPeriod: 0,
        maxStarvationDelay: 4,
        nudgeOffset: 0.1,
        nudgeMaxRetry: 5,
        manifestLoadingMaxRetry: 5,
        manifestLoadingRetryDelay: 500,
        levelLoadingMaxRetry: 5,
        levelLoadingRetryDelay: 500,
        startLevel: -1,
        capLevelToPlayerSize: false,
        testBandwidth: false,
        appendErrorMaxRetry: 5
      });

      hlsRef.current = hls;
      hls.loadSource(activeStreamUrl);
      hls.attachMedia(video);

      hls.on(Hls.Events.MANIFEST_PARSED, (_, data) => {
        const qualities = data.levels.map((lvl, index) => ({
          id: index,
          height: lvl.height || 0,
          bitrate: lvl.bitrate || 0,
          name: lvl.height ? `${lvl.height}p` : `Level ${index + 1}`
        }));
        setHlsQualities(qualities);

        let extractedTracks: Array<{ id: number; name: string; lang: string }> = [];
        if (hls.audioTracks && hls.audioTracks.length > 0) {
          extractedTracks = hls.audioTracks.map((tr, index) => ({
            id: index,
            name: tr.name || tr.lang || (isRtl ? `الصوت ${index + 1}` : `Audio ${index + 1}`),
            lang: tr.lang || ''
          }));
          setSelectedAudioTrack(hls.audioTrack);
        }

        if (hls.subtitleTracks && hls.subtitleTracks.length > 0) {
          const subTracks = hls.subtitleTracks.map((st, index) => ({
            id: index,
            name: st.name || st.lang || (isRtl ? `الترجمة ${index + 1}` : `Subtitle ${index + 1}`),
            lang: st.lang || '',
            mode: 'disabled'
          }));
          setSubtitles(subTracks);
        }

        if (!isLive && activeStreamUrl.includes('.m3u8')) {
          fetch(activeStreamUrl)
            .then(res => res.text())
            .then(text => {
              const manifestAudioTracks = extractAudioTracksFromManifest(text, activeStreamUrl);
              if (manifestAudioTracks.length > 0) {
                setAudioTracks(manifestAudioTracks);
              } else if (extractedTracks.length > 0) {
                setAudioTracks(extractedTracks);
              }
            })
            .catch(() => {
              if (extractedTracks.length > 0) setAudioTracks(extractedTracks);
            });
        } else {
          if (extractedTracks.length > 0) setAudioTracks(extractedTracks);
        }

        if (isPlaying) {
          video.play().catch(() => setIsPlaying(false));
        }
      });

      hls.on(Hls.Events.FRAG_BUFFERED, () => {
        if (video.paused && isPlaying) {
          video.play().catch(() => {});
        }
      });

      hls.on(Hls.Events.FRAG_PARSED, () => {
        if (video.paused && isPlaying) {
          video.play().catch(() => {});
        }
      });

      hls.on(Hls.Events.LEVEL_SWITCHED, (_, data) => {
        const level = hls.levels[data.level];
        if (level && level.height) {
          setRealResolution(`${level.width || 1280}x${level.height}`);
        }
      });

      hls.on(Hls.Events.AUDIO_TRACK_SWITCHED, (_, data) => {
        setSelectedAudioTrack(data.id);
      });

      hls.on(Hls.Events.SUBTITLE_TRACK_SWITCH, (_, data) => {
        setSelectedSubtitle(data.id);
      });

      let hlsErrorCount = 0;
      hls.on(Hls.Events.ERROR, (_, data) => {
        if (data.details === Hls.ErrorDetails.BUFFER_STALLED_ERROR || data.details === Hls.ErrorDetails.BUFFER_NUDGE_ON_STALL) {
          if (video && video.paused && isPlaying) {
            video.play().catch(() => {});
          }
          return;
        }
        if (data.fatal) {
          hlsErrorCount++;
          console.warn('[VodPlayerModal] HLS Fatal Error:', data.type, data.details, 'count:', hlsErrorCount);
          if (hlsErrorCount <= 2 && data.type === Hls.ErrorTypes.MEDIA_ERROR) {
            hls.recoverMediaError();
          } else if (hlsErrorCount <= 2 && data.type === Hls.ErrorTypes.NETWORK_ERROR) {
            hls.startLoad();
          } else {
            // Fall back directly to native video element src (uses Android WebView's native ExoPlayer)
            console.warn('[VodPlayerModal] Falling back to direct video element src:', activeStreamUrl);
            try {
              hls.destroy();
            } catch (e) {}
            hlsRef.current = null;
            if (video) {
              video.src = activeStreamUrl || rawActiveStreamUrl;
              if (isPlaying) {
                video.play().catch(err => {
                  console.warn('[VodPlayerModal] Direct video play failed, trying raw URL fallback:', err);
                  if (video && rawActiveStreamUrl && rawActiveStreamUrl !== activeStreamUrl) {
                    video.src = rawActiveStreamUrl;
                    video.play().catch(() => setIsPlaying(false));
                  } else {
                    setIsPlaying(false);
                  }
                });
              }
            }
          }
        }
      });
    } else {
      video.src = activeStreamUrl || rawActiveStreamUrl;
      if (isPlaying) {
        video.play().catch(() => setIsPlaying(false));
      }
    }

    return () => {
      if (hlsRef.current) {
        try {
          hlsRef.current.stopLoad();
          hlsRef.current.detachMedia();
          hlsRef.current.destroy();
        } catch (e) {}
        hlsRef.current = null;
      }
      if (video) {
        try {
          video.pause();
          video.removeAttribute('src');
          video.load();
        } catch (e) {}
      }
    };
  }, [activeStreamUrl, currentEpisodeIndex, vodId]);

  // 2. Video Events
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const updateResolutionMeta = () => {
      if (video.videoWidth && video.videoHeight) {
        const w = video.videoWidth;
        const h = video.videoHeight;
        let resLabel = `${w}x${h}`;
        if (w >= 3840) resLabel = `4K UHD (${w}x${h})`;
        else if (w >= 1920) resLabel = `1080p FHD (${w}x${h})`;
        else if (w >= 1280) resLabel = `720p HD (${w}x${h})`;
        else resLabel = `SD (${w}x${h})`;
        setRealResolution(resLabel);
      }
    };

    const handleLoadedMetaData = () => {
      setDuration(video.duration || 0);
      updateResolutionMeta();

      const tracks: Array<{ id: number; name: string; lang: string; mode: string }> = [];
      for (let i = 0; i < video.textTracks.length; i++) {
        const track = video.textTracks[i];
        tracks.push({
          id: i,
          name: track.label || track.language || (isRtl ? `ترجمة ${i + 1}` : `Subtitle ${i + 1}`),
          lang: track.language || '',
          mode: track.mode
        });
      }
      setSubtitles(tracks);
    };

    video.addEventListener('resize', updateResolutionMeta);

    const handleTimeUpdate = () => {
      if (!isSeeking) {
        setCurrentTime(video.currentTime);
        if (Math.floor(video.currentTime) % 5 === 0 && video.duration > 0) {
          const progressKey = `vod_progress_${vodId}_${currentEpisodeIndex}`;
          localStorage.setItem(progressKey, video.currentTime.toString());
        }
      }

      if (video.buffered.length > 0) {
        setBuffered(video.buffered.end(video.buffered.length - 1));
      }
    };

    const handleEnded = () => {
      setIsPlaying(false);
      if (isSeries && currentEpisodeIndex < (vodEpisodes.length - 1)) {
        handleNextEpisode();
      }
    };

    video.addEventListener('loadedmetadata', handleLoadedMetaData);
    video.addEventListener('timeupdate', handleTimeUpdate);
    video.addEventListener('ended', handleEnded);

    return () => {
      video.removeEventListener('loadedmetadata', handleLoadedMetaData);
      video.removeEventListener('timeupdate', handleTimeUpdate);
      video.removeEventListener('ended', handleEnded);
    };
  }, [isSeeking, isSeries, currentEpisodeIndex, vodEpisodes.length, vodId, isRtl]);

  // 3. Auto-Next Countdown
  useEffect(() => {
    if (!showAutoNextPrompt) return;

    if (autoNextCountdown <= 0) {
      handleNextEpisode();
      setShowAutoNextPrompt(false);
      return;
    }

    autoNextTimeoutRef.current = setTimeout(() => {
      setAutoNextCountdown((prev) => prev - 1);
    }, 1000);

    return () => {
      if (autoNextTimeoutRef.current) clearTimeout(autoNextTimeoutRef.current);
    };
  }, [showAutoNextPrompt, autoNextCountdown]);

  // 4. Sleep Timer
  useEffect(() => {
    if (sleepTimerMinutes === null) {
      setSleepTimerTimeLeft(null);
      return;
    }

    setSleepTimerTimeLeft(sleepTimerMinutes * 60);
    const interval = setInterval(() => {
      setSleepTimerTimeLeft((prev) => {
        if (prev === null || prev <= 1) {
          clearInterval(interval);
          if (videoRef.current) {
            videoRef.current.pause();
            setIsPlaying(false);
          }
          setSleepTimerMinutes(null);
          return null;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [sleepTimerMinutes]);

  // 5. Controls Auto-Hide
  const resetControlsTimeout = useCallback(() => {
    setShowControls(true);
    if (controlsTimeoutRef.current) {
      clearTimeout(controlsTimeoutRef.current);
    }
    controlsTimeoutRef.current = setTimeout(() => {
      if (isPlaying && activePopup === 'none' && !showResumePrompt && !showAutoNextPrompt) {
        setShowControls(false);
      }
    }, 5000);
  }, [isPlaying, activePopup, showResumePrompt, showAutoNextPrompt]);

  useEffect(() => {
    resetControlsTimeout();
    return () => {
      if (controlsTimeoutRef.current) clearTimeout(controlsTimeoutRef.current);
    };
  }, [isPlaying, activePopup, resetControlsTimeout]);

  // Actions
  const togglePlayPause = () => {
    const video = videoRef.current;
    if (!video) return;

    if (isLive) {
      setShowControls((prev) => !prev);
      return;
    }

    if (isPlaying) {
      video.pause();
      setIsPlaying(false);
      setShowControls(true);
    } else {
      video.play().then(() => setIsPlaying(true)).catch(() => setIsPlaying(false));
      resetControlsTimeout();
    }
  };

  const toggleMute = () => {
    const video = videoRef.current;
    if (!video) return;
    video.muted = !isMuted;
    setIsMuted(!isMuted);
  };

  const handleSeekChange = (newTime: number) => {
    const video = videoRef.current;
    if (!video) return;
    video.currentTime = newTime;
    setCurrentTime(newTime);
  };

  const handleSkipTime = (seconds: number) => {
    const video = videoRef.current;
    if (!video) return;
    const maxDur = duration || video.duration || 0;
    const target = Math.max(0, Math.min(maxDur > 0 ? maxDur : 86400, video.currentTime + seconds));
    
    if (hlsRef.current) {
      try {
        hlsRef.current.startLoad(target);
      } catch (e) {}
    }

    try {
      video.currentTime = target;
      setCurrentTime(target);
    } catch (e) {}

    const formattedTarget = formatTime(target);
    const directionText = seconds > 0 ? `+${Math.abs(seconds)}s ⏩` : `-${Math.abs(seconds)}s ⏪`;
    setSeekNotice(`${directionText} (${formattedTarget})`);

    if (seekNoticeTimeoutRef.current) {
      clearTimeout(seekNoticeTimeoutRef.current);
    }
    seekNoticeTimeoutRef.current = setTimeout(() => {
      setSeekNotice(null);
    }, 1200);

    resetControlsTimeout();
  };

  const handleSelectAudioTrack = (trackId: number) => {
    if (hlsRef.current) {
      hlsRef.current.audioTrack = trackId;
      setSelectedAudioTrack(trackId);
    }
    setActivePopup('none');
  };

  const handleSelectQuality = (qualityId: number) => {
    if (hlsRef.current) {
      hlsRef.current.currentLevel = qualityId;
      setSelectedQuality(qualityId);
    }
    setActivePopup('none');
  };

  const handleSelectSubtitle = (subId: number) => {
    const video = videoRef.current;
    if (!video) return;

    for (let i = 0; i < video.textTracks.length; i++) {
      video.textTracks[i].mode = i === subId ? 'showing' : 'disabled';
    }
    setSelectedSubtitle(subId);
    setActivePopup('none');
  };

  const handleSubSyncChange = (delta: number) => {
    const video = videoRef.current;
    setSubSyncOffset((prev) => {
      const next = parseFloat((prev + delta).toFixed(1));
      if (video) {
        for (let i = 0; i < video.textTracks.length; i++) {
          const track = video.textTracks[i];
          if (track.cues) {
            for (let j = 0; j < track.cues.length; j++) {
              const cue = track.cues[j] as VTTCue;
              cue.startTime += delta;
              cue.endTime += delta;
            }
          }
        }
      }
      return next;
    });
  };

  const handleResumeConfirm = (resume: boolean) => {
    setShowResumePrompt(false);
    const video = videoRef.current;
    if (!video) return;

    if (resume && savedResumeTime > 0) {
      video.currentTime = savedResumeTime;
      setCurrentTime(savedResumeTime);
    } else {
      video.currentTime = 0;
      setCurrentTime(0);
      const progressKey = `vod_progress_${vodId}_${currentEpisodeIndex}`;
      localStorage.removeItem(progressKey);
    }
    video.play().then(() => setIsPlaying(true)).catch(() => {});
  };

  const handleNextEpisode = () => {
    if (isSeries && currentEpisodeIndex < vodEpisodes.length - 1) {
      if (onSelectEpisode) {
        onSelectEpisode(currentEpisodeIndex + 1);
      } else if (onSelectMedia && vodEpisodes[currentEpisodeIndex + 1]) {
        onSelectMedia(vodEpisodes[currentEpisodeIndex + 1]);
      }
      setShowAutoNextPrompt(false);
    }
  };

  const handlePrevEpisode = () => {
    if (isSeries && currentEpisodeIndex > 0) {
      if (onSelectEpisode) {
        onSelectEpisode(currentEpisodeIndex - 1);
      } else if (onSelectMedia && vodEpisodes[currentEpisodeIndex - 1]) {
        onSelectMedia(vodEpisodes[currentEpisodeIndex - 1]);
      }
    }
  };

  const handlePrevChannel = () => {
    if (itemsList && itemsList.length > 0) {
      const curIdx = itemsList.findIndex((ch: any) => String(ch.stream_id || ch.id) === String(activeVod.stream_id || activeVod.id));
      if (curIdx > 0) {
        if (onSelectMedia) onSelectMedia(itemsList[curIdx - 1]);
      } else if (curIdx === 0) {
        if (onSelectMedia) onSelectMedia(itemsList[itemsList.length - 1]);
      }
    }
  };

  const handleNextChannel = () => {
    if (itemsList && itemsList.length > 0) {
      const curIdx = itemsList.findIndex((ch: any) => String(ch.stream_id || ch.id) === String(activeVod.stream_id || activeVod.id));
      if (curIdx >= 0 && curIdx < itemsList.length - 1) {
        if (onSelectMedia) onSelectMedia(itemsList[curIdx + 1]);
      } else if (curIdx === itemsList.length - 1) {
        if (onSelectMedia) onSelectMedia(itemsList[0]);
      }
    }
  };

  // Register pushBackHandler for TV remote and Android Phone back button
  useEffect(() => {
    if (isPreview) return; // No back handler in preview mode
    const unregister = pushBackHandler(() => {
      if (showResumePrompt) {
        handleResumeConfirm(false);
        return true;
      }
      if (showAutoNextPrompt) {
        setShowAutoNextPrompt(false);
        return true;
      }
      if (activePopup !== 'none') {
        setActivePopup('none');
        return true;
      }
      onClose();
      return true;
    }, BackPriority.MODAL);

    return unregister;
  }, [showResumePrompt, showAutoNextPrompt, activePopup, onClose]);


  // D-Pad Remote Navigation Key Handler
  useEffect(() => {
    if (isPreview) return; // No remote navigation in preview mode
    const handleKeyDown = (e: KeyboardEvent) => {
      const now = Date.now();
      if (now - lastKeyTimeRef.current < 120) return;
      lastKeyTimeRef.current = now;

      resetControlsTimeout();

      const action = parseTVKeyEvent(e);
      const key = e.key;

      resetControlsTimeout();

      // Remote Color Keys
      if (action === 'RED' || e.key === 'r' || e.key === 'Red' || e.keyCode === 403) {
        e.preventDefault();
        setActivePopup(prev => prev === 'audio' ? 'none' : 'audio');
        return;
      }
      if (action === 'GREEN' || e.key === 'g' || e.key === 'Green' || e.keyCode === 404) {
        e.preventDefault();
        setActivePopup(prev => prev === 'subtitles' ? 'none' : 'subtitles');
        return;
      }
      if (action === 'YELLOW' || e.key === 'y' || e.key === 'Yellow' || e.keyCode === 405) {
        e.preventDefault();
        setActivePopup(prev => prev === 'quality' ? 'none' : 'quality');
        return;
      }
      if (action === 'BLUE' || e.key === 'b' || e.key === 'Blue' || e.keyCode === 406) {
        e.preventDefault();
        setActivePopup(prev => prev === 'aspect' ? 'none' : 'aspect');
        return;
      }

      // Live TV Dedicated Zapping Keys
      if (isLive) {
        if (action === 'CHANNEL_UP') {
          e.preventDefault();
          handlePrevChannel();
          return;
        }
        if (action === 'CHANNEL_DOWN') {
          e.preventDefault();
          handleNextChannel();
          return;
        }
      }

      if (action === 'BACK') {
        e.preventDefault();
        e.stopPropagation();

        if (showResumePrompt) {
          handleResumeConfirm(false);
          return;
        }

        if (showAutoNextPrompt) {
          setShowAutoNextPrompt(false);
          return;
        }

        if (activePopup !== 'none') {
          setActivePopup('none');
          if (lastFocusedElementRef.current) {
            lastFocusedElementRef.current.focus();
          }
          return;
        }

        if (showControls) {
          setShowControls(false);
          return;
        }

        onClose();
        return;
      }

      // If a popup (Audio, Subtitles, Aspect, EPG) is active, navigate inside the popup
      if (activePopup !== 'none') {
        const popupEl = containerRef.current?.querySelector('.vod-popup-container, .vod-drawer-container');
        if (popupEl) {
          const focusableItems = Array.from(
            popupEl.querySelectorAll<HTMLElement>('button, [tabindex="0"]')
          ).filter(el => el.offsetWidth > 0 && el.offsetHeight > 0);

          if (focusableItems.length > 0) {
            const activeIdx = focusableItems.findIndex((el) => el === document.activeElement);

            if (action === 'DOWN') {
              e.preventDefault();
              const nextIdx = activeIdx < focusableItems.length - 1 ? activeIdx + 1 : 0;
              focusableItems[nextIdx]?.focus();
            } else if (action === 'UP') {
              e.preventDefault();
              const prevIdx = activeIdx > 0 ? activeIdx - 1 : focusableItems.length - 1;
              focusableItems[prevIdx]?.focus();
            } else if (action === 'RIGHT' || action === 'LEFT') {
              e.preventDefault();
            } else if (action === 'SELECT') {
              e.preventDefault();
              if (document.activeElement instanceof HTMLElement) {
                document.activeElement.click();
              }
            }
          }
        }
        return;
      }

      // If controls are hidden, pressing any direction or OK shows controls and focuses control buttons
      if (!showControls) {
        if (['UP', 'DOWN', 'SELECT'].includes(action)) {
          e.preventDefault();
          setShowControls(true);
          setTimeout(() => {
            const playBtn = containerRef.current?.querySelector<HTMLElement>('.vod-bottom-play-btn, [data-tv-row="main"]');
            const subBtn = containerRef.current?.querySelector<HTMLElement>('[data-tv-row="sub"]');
            (playBtn || subBtn)?.focus();
          }, 50);
          return;
        }

        if (isLive) {
          if (action === 'RIGHT') {
            e.preventDefault();
            handleNextChannel();
            return;
          } else if (action === 'LEFT') {
            e.preventDefault();
            handlePrevChannel();
            return;
          }
        }
      }

      // If controls are visible: navigate the on-screen buttons
      const currentActive = document.activeElement as HTMLElement;
      const isSeekbarFocused = currentActive && currentActive.classList.contains('vod-seekbar-input');
      const mainRowItems = Array.from(containerRef.current?.querySelectorAll<HTMLElement>('[data-tv-row="main"]') || []);
      const subRowItems = Array.from(containerRef.current?.querySelectorAll<HTMLElement>('[data-tv-row="sub"]') || []);

      if (action === 'DOWN') {
        e.preventDefault();
        setShowControls(true);
        if (isSeekbarFocused) {
          const playBtn = containerRef.current?.querySelector<HTMLElement>('.vod-bottom-play-btn') || mainRowItems[0];
          playBtn?.focus();
        } else if (currentActive && currentActive.getAttribute('data-tv-row') === 'main') {
          // Move from main capsule row down to bottom sub row (Audio, Subtitles, Back, EPG)
          if (subRowItems.length > 0) {
            subRowItems[0]?.focus();
          }
        } else {
          // Default to sub-row or play button
          if (subRowItems.length > 0) {
            subRowItems[0]?.focus();
          } else if (mainRowItems.length > 0) {
            mainRowItems[0]?.focus();
          }
        }
      } else if (action === 'UP') {
        e.preventDefault();
        setShowControls(true);
        if (currentActive && currentActive.getAttribute('data-tv-row') === 'sub') {
          // Move from sub row up to main capsule row
          const playBtn = containerRef.current?.querySelector<HTMLElement>('.vod-bottom-play-btn') || mainRowItems[0];
          playBtn?.focus();
        } else if (currentActive && currentActive.getAttribute('data-tv-row') === 'main' && !isSeekbarFocused) {
          // Move up to seekbar if present in VOD
          const seekbar = containerRef.current?.querySelector<HTMLElement>('.vod-seekbar-input');
          if (seekbar) {
            seekbar.focus();
          }
        } else {
          const playBtn = containerRef.current?.querySelector<HTMLElement>('.vod-bottom-play-btn') || mainRowItems[0];
          playBtn?.focus();
        }
      } else if (action === 'RIGHT') {
        e.preventDefault();
        setShowControls(true);
        if (isSeekbarFocused) {
          handleSkipTime(10);
        } else if (currentActive && currentActive.getAttribute('data-tv-row') === 'sub') {
          const curSubIdx = subRowItems.indexOf(currentActive);
          const nextIdx = (curSubIdx + 1) % subRowItems.length;
          subRowItems[nextIdx]?.focus();
        } else if (currentActive && currentActive.getAttribute('data-tv-row') === 'main') {
          const curMainIdx = mainRowItems.indexOf(currentActive);
          const nextIdx = (curMainIdx + 1) % mainRowItems.length;
          mainRowItems[nextIdx]?.focus();
        } else {
          const playBtn = containerRef.current?.querySelector<HTMLElement>('.vod-bottom-play-btn') || mainRowItems[0] || subRowItems[0];
          playBtn?.focus();
        }
      } else if (action === 'LEFT') {
        e.preventDefault();
        setShowControls(true);
        if (isSeekbarFocused) {
          handleSkipTime(-10);
        } else if (currentActive && currentActive.getAttribute('data-tv-row') === 'sub') {
          const curSubIdx = subRowItems.indexOf(currentActive);
          const prevIdx = (curSubIdx - 1 + subRowItems.length) % subRowItems.length;
          subRowItems[prevIdx]?.focus();
        } else if (currentActive && currentActive.getAttribute('data-tv-row') === 'main') {
          const curMainIdx = mainRowItems.indexOf(currentActive);
          const prevIdx = (curMainIdx - 1 + mainRowItems.length) % mainRowItems.length;
          mainRowItems[prevIdx]?.focus();
        } else {
          const playBtn = containerRef.current?.querySelector<HTMLElement>('.vod-bottom-play-btn') || mainRowItems[0] || subRowItems[0];
          playBtn?.focus();
        }
      } else if (action === 'SELECT') {
        e.preventDefault();
        if (currentActive && currentActive.tagName === 'BUTTON' && !currentActive.classList.contains('vod-seekbar-input')) {
          currentActive.click();
        } else {
          togglePlayPause();
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [showControls, activePopup, showResumePrompt, showAutoNextPrompt, isPlaying, duration, isLive, resetControlsTimeout]);

  const openPopup = (type: ActivePopup, triggerEl?: HTMLElement | null) => {
    if (triggerEl) {
      lastFocusedElementRef.current = triggerEl;
    }
    setActivePopup(type);
    setShowControls(true);

    setTimeout(() => {
      const popup = containerRef.current?.querySelector('.vod-popup-container, .vod-drawer-container');
      const firstBtn = popup?.querySelector<HTMLElement>('button, [tabindex="0"]');
      if (firstBtn) firstBtn.focus();
    }, 50);
  };

  const formatTime = (seconds: number): string => {
    if (isNaN(seconds) || seconds < 0) return '00:00';
    const hrs = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = Math.floor(seconds % 60);

    const pad = (num: number) => num.toString().padStart(2, '0');

    if (hrs > 0) {
      return `${pad(hrs)}:${pad(mins)}:${pad(secs)}`;
    }
    return `${pad(mins)}:${pad(secs)}`;
  };

  const getAspectRatioClass = () => {
    switch (aspectRatio) {
      case 'fill':
        return 'object-cover w-full h-full';
      case 'zoom':
        return 'object-none scale-125 w-full h-full';
      case '16:9':
        return 'object-contain aspect-video w-full h-full';
      case '4:3':
        return 'object-contain aspect-[4/3] w-full h-full';
      case 'fit':
      default:
        return 'object-contain w-full h-full';
    }
  };

  const playerJSX = (
    <div
      ref={containerRef}
      className={`${
        isPreview 
          ? 'relative w-full h-full' 
          : 'fixed inset-0 z-50'
      } bg-black flex items-center justify-center overflow-hidden select-none font-sans text-white outline-none border-0 ring-0 shadow-none`}
      onMouseMove={isPreview ? undefined : resetControlsTimeout}
      onClick={isPreview ? undefined : resetControlsTimeout}
    >

      {/* 1. Main Video Container */}
      <div className="relative w-full h-full flex items-center justify-center bg-black outline-none border-0 ring-0 shadow-none">
        <video
          ref={videoRef}
          style={{ backgroundColor: '#000000' }}
          poster="data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7"
          className={`transition-all duration-300 outline-none border-0 ring-0 shadow-none ${getAspectRatioClass()}`}
          playsInline
          autoPlay
          onClick={togglePlayPause}
        />

        <style>{`
          video::cue {
            font-size: ${
              subFontSize === 'sm'
                ? '1rem'
                : subFontSize === 'md'
                ? '1.35rem'
                : subFontSize === 'lg'
                ? '1.8rem'
                : '2.4rem'
            } !important;
            color: ${subColor} !important;
            background-color: ${
              subBg === 'none'
                ? 'transparent'
                : subBg === 'black'
                ? 'rgba(0, 0, 0, 0.95)'
                : 'rgba(0, 0, 0, 0.65)'
            } !important;
            text-shadow: 0 2px 4px rgba(0,0,0,0.8);
            font-family: inherit;
          }
        `}</style>

        {/* Top Right Logo Badge (Matches screenshot top right) */}
        {isLive && !isPreview && showControls && (activeVod.stream_icon || activeVod.logo || activeVod.cover) && (
          <div className="absolute top-5 right-5 z-40 bg-black/70 backdrop-blur-md px-3 py-1.5 rounded-xl border border-white/10 shadow-xl flex items-center gap-2">
            <img 
              src={activeVod.stream_icon || activeVod.logo || activeVod.cover} 
              alt=""
              referrerPolicy="no-referrer"
              className="h-6 sm:h-7 object-contain max-w-[120px]"
              onError={(e) => { e.currentTarget.style.display = 'none'; }}
            />
          </div>
        )}

        {/* 2. Sleep Timer Badge */}
        {sleepTimerTimeLeft !== null && !isPreview && showControls && (
          <div className="absolute top-4 left-4 z-40 bg-black/80 backdrop-blur-md px-3 py-1.5 rounded-full border border-gold/40 text-gold flex items-center gap-2 text-xs font-mono shadow-lg">
            <Clock className="w-3.5 h-3.5 animate-pulse" />
            <span>إيقاف تلقائي: {formatTime(sleepTimerTimeLeft)}</span>
          </div>
        )}

        {/* 2b. Direct Seeking Overlay Badge (Movies & Series VOD) */}
        {seekNotice && !isPreview && (
          <div className="absolute inset-0 z-40 flex items-center justify-center pointer-events-none">
            <div className="bg-black/85 backdrop-blur-md px-6 py-3.5 rounded-2xl border-2 border-gold text-gold flex items-center gap-3 text-lg font-mono font-black shadow-[0_0_35px_rgba(229,160,13,0.65)] animate-pulse">
              <span>{seekNotice}</span>
            </div>
          </div>
        )}

        {/* 3. Auto-Next Episode Overlay */}
        {showAutoNextPrompt && !isPreview && (
          <div className="absolute inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-6">
            <div className="bg-gray-900 border border-gold/40 rounded-2xl p-6 max-w-md w-full text-center shadow-2xl space-y-4">
              <div className="w-14 h-14 bg-gold/10 text-gold rounded-full flex items-center justify-center mx-auto border border-gold/30">
                <Play className="w-7 h-7 fill-current mr-0.5" />
              </div>
              <h3 className="text-xl font-bold text-white">الحلقة التالية بعد {autoNextCountdown} ثوانٍ</h3>
              <p className="text-sm text-gray-300">
                {vodEpisodes[currentEpisodeIndex + 1]?.title || `الحلقة ${currentEpisodeIndex + 2}`}
              </p>
              <div className="flex items-center justify-center gap-3 pt-2">
                <button
                  onClick={handleNextEpisode}
                  tabIndex={0}
                  className="px-6 py-2.5 rounded-xl bg-gold hover:bg-gold-light text-black font-bold text-sm shadow-lg transition-transform active:scale-95 focus:ring-2 focus:ring-inset focus:ring-gold"
                >
                  تشغيل الآن
                </button>
                <button
                  onClick={() => setShowAutoNextPrompt(false)}
                  tabIndex={0}
                  className="px-5 py-2.5 rounded-xl bg-gray-800 hover:bg-gray-700 text-gray-200 text-sm font-semibold border border-gray-700 focus:ring-2 focus:ring-inset focus:ring-gold"
                >
                  إلغاء
                </button>
              </div>
            </div>
          </div>
        )}

        {/* 4. Resume Last Position Prompt (Movies & Series VOD Only - NEVER for Live TV) */}
        {!isLive && showResumePrompt && !isPreview && (
          <div className="absolute inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-6">
            <div className="bg-gray-900 border border-gold/40 rounded-2xl p-6 max-w-md w-full text-center shadow-2xl space-y-4">
              <div className="w-14 h-14 bg-gold/10 text-gold rounded-full flex items-center justify-center mx-auto border border-gold/30">
                <RotateCcw className="w-7 h-7" />
              </div>
              <h3 className="text-xl font-bold text-white">استئناف المشاهدة</h3>
              <p className="text-sm text-gray-300">
                هل ترغب في مواصلة العرض من الدقيقة <span className="text-gold font-mono font-bold">{formatTime(savedResumeTime)}</span>؟
              </p>
              <div className="flex items-center justify-center gap-3 pt-2">
                <button
                  onClick={() => handleResumeConfirm(true)}
                  tabIndex={0}
                  className="px-6 py-2.5 rounded-xl bg-gold hover:bg-gold-light text-black font-bold text-sm shadow-lg transition-transform active:scale-95 focus:ring-2 focus:ring-inset focus:ring-gold"
                >
                  متابعة من حيث توقفت
                </button>
                <button
                  onClick={() => handleResumeConfirm(false)}
                  tabIndex={0}
                  className="px-5 py-2.5 rounded-xl bg-gray-800 hover:bg-gray-700 text-gray-200 text-sm font-semibold border border-gray-700 focus:ring-2 focus:ring-inset focus:ring-gold"
                >
                  بدء من البداية
                </button>
              </div>
            </div>
          </div>
        )}

        {/* 7. Player Bottom Footer Controls Bar */}
        <div
          className={`absolute bottom-0 inset-x-0 z-30 p-3 sm:p-5 bg-gradient-to-t from-black via-black/85 to-transparent transition-opacity duration-300 ${
            showControls && !isPreview ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'
          }`}
        >
          {isLive ? (
            <div className="w-full max-w-4xl mx-auto flex flex-col items-center gap-2.5 font-sans dir-ltr select-none">
              {/* Outer Horizontal Bar with Navigation Chevrons */}
              <div className="w-full flex items-center justify-between gap-2">
                {/* Outer Left Chevron Button (<) */}
                <button
                  onClick={handlePrevChannel}
                  data-tv-focusable="true"
                  data-tv-row="main"
                  tabIndex={0}
                  className="w-9 h-9 sm:w-10 sm:h-10 rounded-full bg-black/80 hover:bg-black/95 backdrop-blur-md border border-white/20 text-white flex items-center justify-center shrink-0 shadow-lg transition-all active:scale-90 focus:ring-2 focus:ring-inset focus:ring-[var(--theme-primary,#e5a00d)]"
                >
                  <ChevronLeft className="w-5 h-5" />
                </button>

                {/* Main Dark Capsule Bar */}
                <div className="flex-1 bg-[#121214]/90 backdrop-blur-2xl rounded-3xl border border-white/15 p-2 sm:p-2.5 shadow-[0_12px_40px_rgba(0,0,0,0.9)] flex items-center justify-between gap-2.5 sm:gap-3.5 min-w-0">
                  {/* 1. Channel Number Box (008) */}
                  <div className="px-3 py-1.5 bg-[var(--theme-primary,#e5a00d)] text-black font-mono font-black text-sm sm:text-base rounded-2xl shrink-0 shadow-inner flex items-center justify-center">
                    {String(channelIndex).padStart(3, '0')}
                  </div>

                  {/* 2. Channel Logo */}
                  <div className="w-10 h-10 sm:w-11 sm:h-11 rounded-2xl bg-white border border-white/20 p-1 flex items-center justify-center overflow-hidden shrink-0 shadow-md">
                    {(activeVod.stream_icon || activeVod.logo || activeVod.cover) ? (
                      <img
                        src={activeVod.stream_icon || activeVod.logo || activeVod.cover}
                        alt=""
                        referrerPolicy="no-referrer"
                        className="w-full h-full object-contain"
                        onError={(e) => { e.currentTarget.style.display = 'none'; }}
                      />
                    ) : (
                      <Zap className="w-5 h-5 text-black" />
                    )}
                  </div>

                  {/* 3. Channel Name, EPG Title & Progress Bar */}
                  <div className="flex flex-col flex-1 min-w-0 justify-center">
                    <h2 className="text-xs sm:text-sm md:text-base font-extrabold text-white truncate leading-tight">
                      {activeVod.name || activeVod.title || (isRtl ? 'قناة مباشرة' : 'Live Channel')}
                    </h2>
                    <span className="text-[11px] font-bold text-zinc-300 truncate mt-0.5">
                      {currentProg?.title || activeVod.category_name || (isRtl ? 'بث مباشر حي' : 'Live Broadcast')}
                    </span>
                    {/* EPG Progress Bar */}
                    <div className="w-full h-1 bg-white/20 rounded-full overflow-hidden mt-1.5">
                      <div
                        className="h-full bg-[var(--theme-primary,#e5a00d)] rounded-full transition-all duration-300 shadow-[0_0_8px_var(--theme-primary,#e5a00d)]"
                        style={{ width: `${currentProgPercent || 100}%` }}
                      />
                    </div>
                  </div>

                  {/* 4. Live Tag & Time */}
                  <div className="flex flex-col items-end shrink-0 gap-1 pl-1">
                    <span className="px-2 py-0.5 rounded-full bg-[var(--theme-primary,#e5a00d)]/20 border border-[var(--theme-primary,#e5a00d)]/50 text-[var(--theme-primary,#e5a00d)] font-black text-[10px] uppercase tracking-wider flex items-center gap-1">
                      <span className="w-1.5 h-1.5 rounded-full bg-[var(--theme-primary,#e5a00d)] animate-ping" />
                      LIVE
                    </span>
                    <span className="text-[10px] sm:text-xs font-mono font-bold text-zinc-300">
                      {currentProg && currentProg.start && currentProg.stop
                        ? `${formatTimeHHMM(currentProg.start)} - ${formatTimeHHMM(currentProg.stop)}`
                        : liveClock.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false })}
                    </span>
                  </div>

                  {/* Divider */}
                  <div className="w-px h-8 bg-white/20 shrink-0 hidden sm:block" />

                  {/* 5. Resolution Pill */}
                  <div className="px-2.5 py-1 rounded-full border border-white/30 bg-white/5 text-white font-extrabold text-xs shrink-0 hidden sm:block">
                    {realResolution?.includes('4K') ? '4K' : realResolution?.includes('1080') ? 'FHD' : 'HD'}
                  </div>

                  {/* 6. Favorite Star Button */}
                  {onToggleFavorite && (
                    <button
                      onClick={() => onToggleFavorite(activeVod)}
                      data-tv-focusable="true"
                      data-tv-row="main"
                      tabIndex={0}
                      className="p-1.5 rounded-full hover:bg-white/10 transition-transform active:scale-125 focus:ring-2 focus:ring-inset focus:ring-[var(--theme-primary,#e5a00d)] shrink-0"
                    >
                      <Star className={`w-5 h-5 ${isFavorite ? 'text-amber-400 fill-amber-400' : 'text-zinc-400'}`} />
                    </button>
                  )}
                </div>

                {/* Outer Right Chevron Button (>) */}
                <button
                  onClick={handleNextChannel}
                  data-tv-focusable="true"
                  data-tv-row="main"
                  tabIndex={0}
                  className="w-9 h-9 sm:w-10 sm:h-10 rounded-full bg-black/80 hover:bg-black/95 backdrop-blur-md border border-white/20 text-white flex items-center justify-center shrink-0 shadow-lg transition-all active:scale-90 focus:ring-2 focus:ring-inset focus:ring-[var(--theme-primary,#e5a00d)]"
                >
                  <ChevronRight className="w-5 h-5" />
                </button>
              </div>

              {/* Bottom Sub-Buttons Row (Replaces "إيقاف" with "EPG" as requested!) */}
              <div className="flex items-center justify-between w-full max-w-xl px-2">
                <div className="flex items-center gap-2 mx-auto">
                  {/* Button 1: Back (رجوع) */}
                  <button
                    onClick={onClose}
                    data-tv-focusable="true"
                    data-tv-row="sub"
                    tabIndex={0}
                    className="px-4 py-1.5 rounded-full bg-black/80 hover:bg-white/15 border border-white/20 text-white text-xs font-bold flex items-center gap-2 focus:ring-2 focus:ring-inset focus:ring-[var(--theme-primary,#e5a00d)] active:scale-95 transition-all shadow-md"
                  >
                    <RotateCcw className="w-3.5 h-3.5 text-zinc-300" />
                    <span>{isRtl ? 'رجوع' : 'Back'}</span>
                  </button>

                  {/* Button 2: EPG */}
                  <button
                    onClick={() => {
                      const evt = new CustomEvent('open_epg_grid');
                      window.dispatchEvent(evt);
                    }}
                    data-tv-focusable="true"
                    data-tv-row="sub"
                    tabIndex={0}
                    className="px-5 py-1.5 rounded-full bg-[var(--theme-primary,#e5a00d)] text-black text-xs font-black flex items-center gap-2 focus:ring-2 focus:ring-inset focus:ring-white active:scale-95 transition-all shadow-lg"
                  >
                    <Tv className="w-3.5 h-3.5" />
                    <span>EPG</span>
                  </button>

                  {/* Button 3: Info (معلومات) */}
                  <button
                    onClick={(e) => openPopup('quality', e.currentTarget)}
                    data-tv-focusable="true"
                    data-tv-row="sub"
                    tabIndex={0}
                    className="px-4 py-1.5 rounded-full bg-black/80 hover:bg-white/15 border border-white/20 text-white text-xs font-bold flex items-center gap-2 focus:ring-2 focus:ring-inset focus:ring-[var(--theme-primary,#e5a00d)] active:scale-95 transition-all shadow-md"
                  >
                    <Info className="w-3.5 h-3.5 text-zinc-300" />
                    <span>{isRtl ? 'معلومات' : 'Info'}</span>
                  </button>
                </div>

                {/* Bottom Right Signal Tag */}
                <div className="hidden sm:flex items-center gap-1 text-[10px] font-mono text-zinc-400 bg-black/60 px-2 py-0.5 rounded-full border border-white/10 shrink-0">
                  <Zap className="w-3 h-3 text-[var(--theme-primary,#e5a00d)]" />
                  <span>1080p</span>
                </div>
              </div>
            </div>
          ) : (
            /* MOVIE AND SERIES FLOATING INFOBAR OSD (MATCHING USER REFERENCE SCREENSHOT) */
            <div className="w-full max-w-5xl mx-auto flex flex-col items-center gap-2.5 font-sans dir-ltr select-none">
              {/* Main Horizontal Row */}
              <div className="w-full flex items-center justify-center">
                {/* Main Dark Capsule Bar */}
                <div className="w-full bg-[#121214]/90 backdrop-blur-2xl rounded-3xl border border-white/15 p-2 sm:p-2.5 shadow-[0_12px_40px_rgba(0,0,0,0.9)] flex items-center justify-between gap-2.5 sm:gap-3.5 min-w-0">
                  {/* 1. Media Poster Box */}
                  <div className="w-10 h-12 sm:w-12 sm:h-14 rounded-xl border border-white/20 bg-black overflow-hidden shrink-0 shadow-md flex items-center justify-center">
                    {(activeVod.stream_icon || activeVod.cover || activeVod.logo) ? (
                      <img
                        src={activeVod.stream_icon || activeVod.cover || activeVod.logo}
                        alt=""
                        referrerPolicy="no-referrer"
                        className="w-full h-full object-cover"
                        onError={(e) => { e.currentTarget.style.display = 'none'; }}
                      />
                    ) : (
                      <Tv className="w-5 h-5 text-zinc-500" />
                    )}
                  </div>

                  {/* 2. Media Title, Subtitle & Seekbar with Timestamps */}
                  <div className="flex flex-col flex-1 min-w-0 justify-center">
                    <h2 className="text-xs sm:text-sm md:text-base font-extrabold text-white truncate leading-tight">
                      {displayTitle}
                    </h2>
                    <span className="text-[11px] font-bold text-zinc-400 truncate mt-0.5">
                      {activeVod.category_name || (isSeries ? (isRtl ? 'مسلسلات' : 'Series') : (isRtl ? 'أفلام' : 'Movies'))}
                    </span>
                    
                    {/* Progress Slider & Timestamps */}
                    <div className="flex items-center gap-2 mt-1.5 w-full">
                      <div className="relative flex-1 flex items-center">
                        <input
                          type="range"
                          min={0}
                          max={duration || 100}
                          value={currentTime}
                          onChange={(e) => handleSeekChange(parseFloat(e.target.value))}
                          data-tv-focusable="true"
                          data-tv-row="main"
                          tabIndex={0}
                          className="vod-seekbar-input w-full h-1.5 bg-white/20 rounded-full appearance-none cursor-pointer accent-[var(--theme-primary,#e5a00d)] focus:outline-none focus:ring-2 focus:ring-inset focus:ring-[var(--theme-primary,#e5a00d)]"
                          style={{
                            background: `linear-gradient(to right, var(--theme-primary, #e5a00d) ${
                              (currentTime / (duration || 1)) * 100
                            }%, rgba(255, 255, 255, 0.2) ${(currentTime / (duration || 1)) * 100}%)`
                          }}
                        />
                      </div>
                      <span className="text-[10px] sm:text-xs font-mono font-bold text-zinc-300 shrink-0">
                        {formatTime(currentTime)} / {formatTime(duration)}
                      </span>
                    </div>
                  </div>

                  {/* 3. Playback Control Buttons (Prev, Play/Pause, Next) */}
                  <div className="flex items-center gap-1 sm:gap-1.5 shrink-0">
                    <button
                      onClick={() => handleSkipTime(-10)}
                      data-tv-focusable="true"
                      data-tv-row="main"
                      tabIndex={0}
                      className="vod-bottom-btn w-9 h-9 sm:w-10 sm:h-10 rounded-full bg-white/10 hover:bg-white/20 border border-white/10 text-white flex items-center justify-center transition-all active:scale-90 focus:outline-none focus:ring-4 focus:ring-inset focus:ring-gold focus:scale-110 focus:bg-white/30"
                      title="-10s"
                    >
                      <RotateCcw className="w-4 h-4" />
                    </button>

                    <button
                      onClick={togglePlayPause}
                      data-tv-focusable="true"
                      data-tv-row="main"
                      tabIndex={0}
                      className="vod-bottom-btn vod-bottom-play-btn w-11 h-11 sm:w-12 sm:h-12 rounded-full bg-[var(--theme-primary,#e5a00d)] hover:brightness-110 text-black flex items-center justify-center font-black shadow-lg shadow-[var(--theme-primary,#e5a00d)]/30 transition-all active:scale-90 focus:outline-none focus:ring-4 focus:ring-inset focus:ring-white focus:scale-110"
                      title={isPlaying ? 'إيقاف مؤقت' : 'تشغيل'}
                    >
                      {isPlaying ? <Pause className="w-5 h-5 fill-current" /> : <Play className="w-5 h-5 fill-current ml-0.5" />}
                    </button>

                    <button
                      onClick={() => handleSkipTime(10)}
                      data-tv-focusable="true"
                      data-tv-row="main"
                      tabIndex={0}
                      className="vod-bottom-btn w-9 h-9 sm:w-10 sm:h-10 rounded-full bg-white/10 hover:bg-white/20 border border-white/10 text-white flex items-center justify-center transition-all active:scale-90 focus:outline-none focus:ring-4 focus:ring-inset focus:ring-gold focus:scale-110 focus:bg-white/30"
                      title="+10s"
                    >
                      <RotateCw className="w-4 h-4" />
                    </button>
                  </div>

                  {/* Divider */}
                  <div className="w-px h-8 bg-white/20 shrink-0 hidden sm:block" />

                  {/* 4. Action Buttons (CC, Fullscreen/Aspect, Favorite) */}
                  <div className="flex items-center gap-1.5 shrink-0">
                    <button
                      onClick={(e) => openPopup('subtitles', e.currentTarget)}
                      data-tv-focusable="true"
                      data-tv-row="main"
                      tabIndex={0}
                      className="vod-bottom-btn w-9 h-9 rounded-2xl border border-white/20 bg-white/10 hover:bg-white/20 text-white text-xs font-black flex items-center justify-center focus:outline-none focus:ring-4 focus:ring-inset focus:ring-gold focus:scale-110 focus:bg-white/30"
                      title={t('subtitles')}
                    >
                      CC
                    </button>

                    <button
                      onClick={(e) => openPopup('aspect', e.currentTarget)}
                      data-tv-focusable="true"
                      data-tv-row="main"
                      tabIndex={0}
                      className="vod-bottom-btn w-9 h-9 rounded-2xl border border-white/20 bg-white/10 hover:bg-white/20 text-white flex items-center justify-center focus:outline-none focus:ring-4 focus:ring-inset focus:ring-gold focus:scale-110 focus:bg-white/30"
                      title={t('aspect_ratio')}
                    >
                      <Maximize2 className="w-4 h-4" />
                    </button>

                    {onToggleFavorite && (
                      <button
                        onClick={() => onToggleFavorite(activeVod)}
                        data-tv-focusable="true"
                        data-tv-row="main"
                        tabIndex={0}
                        className="vod-bottom-btn p-1.5 rounded-full hover:bg-white/10 transition-transform active:scale-125 focus:outline-none focus:ring-4 focus:ring-inset focus:ring-gold focus:scale-125 focus:bg-white/20 shrink-0"
                      >
                        <Star className={`w-5 h-5 ${isFavorite ? 'text-amber-400 fill-amber-400' : 'text-zinc-400'}`} />
                      </button>
                    )}
                  </div>
                </div>
              </div>

              {/* Bottom Sub-Buttons Row (Audio, Subtitles, Next Episode, Back) */}
              <div className="flex items-center justify-center gap-2 sm:gap-3 flex-wrap">
                {/* Audio Button */}
                <button
                  onClick={(e) => openPopup('audio', e.currentTarget)}
                  data-tv-focusable="true"
                  data-tv-row="sub"
                  tabIndex={0}
                  className="vod-bottom-btn px-5 py-2 rounded-full bg-black/85 hover:bg-white/15 border border-white/20 text-white text-xs font-black flex items-center gap-2 focus:outline-none focus:ring-4 focus:ring-inset focus:ring-gold focus:bg-gold focus:text-black focus:scale-105 active:scale-95 transition-all shadow-md"
                >
                  <Languages className="w-4 h-4" />
                  <span>{isRtl ? 'الصوت' : 'Audio'}</span>
                </button>

                {/* Subtitles Button */}
                <button
                  onClick={(e) => openPopup('subtitles', e.currentTarget)}
                  data-tv-focusable="true"
                  data-tv-row="sub"
                  tabIndex={0}
                  className="vod-bottom-btn px-5 py-2 rounded-full bg-black/85 hover:bg-white/15 border border-white/20 text-white text-xs font-black flex items-center gap-2 focus:outline-none focus:ring-4 focus:ring-inset focus:ring-gold focus:bg-gold focus:text-black focus:scale-105 active:scale-95 transition-all shadow-md"
                >
                  <SubtitleIcon className="w-4 h-4" />
                  <span>{isRtl ? 'الترجمة' : 'Subtitles'}</span>
                </button>

                {/* Next Episode Button (Series only) */}
                {isSeries && (
                  <button
                    onClick={handleNextEpisode}
                    disabled={currentEpisodeIndex >= vodEpisodes.length - 1}
                    data-tv-focusable="true"
                    data-tv-row="sub"
                    tabIndex={0}
                    className="vod-bottom-btn px-5 py-2 rounded-full bg-black/85 hover:bg-white/15 border border-white/20 text-white text-xs font-black flex items-center gap-2 disabled:opacity-40 focus:outline-none focus:ring-4 focus:ring-inset focus:ring-gold focus:bg-gold focus:text-black focus:scale-105 active:scale-95 transition-all shadow-md"
                  >
                    <Tv className="w-4 h-4" />
                    <span>{isRtl ? 'الحلقة التالية' : 'Next Episode'}</span>
                  </button>
                )}

                {/* Back Button */}
                <button
                  onClick={onClose}
                  data-tv-focusable="true"
                  data-tv-row="sub"
                  tabIndex={0}
                  className="vod-bottom-btn px-5 py-2 rounded-full bg-black/85 hover:bg-white/15 border border-white/20 text-white text-xs font-black flex items-center gap-2 focus:outline-none focus:ring-4 focus:ring-inset focus:ring-gold focus:bg-gold focus:text-black focus:scale-105 active:scale-95 transition-all shadow-md"
                >
                  <RotateCcw className="w-4 h-4" />
                  <span>{isRtl ? 'رجوع' : 'Back'}</span>
                </button>
              </div>
            </div>
          )}
        </div>

        {/* 8. POPUPS */}
        {activePopup === 'audio' && (
          <div className="vod-popup-container absolute bottom-24 right-6 z-40 bg-gray-900/95 backdrop-blur-xl border border-gold/40 rounded-2xl p-4 w-72 shadow-2xl space-y-3 animate-in fade-in slide-in-from-bottom-2 duration-200">
            <div className="flex items-center justify-between border-b border-gray-800 pb-2">
              <h4 className="text-sm font-bold text-gold flex items-center gap-2">
                <Languages className="w-4 h-4" />
                {t('select_audio')}
              </h4>
              <button
                onClick={() => setActivePopup('none')}
                className="text-gray-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="space-y-1 max-h-56 overflow-y-auto no-scrollbar">
              {audioTracks.length > 0 ? (
                audioTracks.map((tr) => (
                  <button
                    key={tr.id}
                    onClick={() => handleSelectAudioTrack(tr.id)}
                    tabIndex={0}
                    className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-medium transition-colors focus:ring-2 focus:ring-inset focus:ring-gold ${
                      selectedAudioTrack === tr.id
                        ? 'bg-gold/20 text-gold border border-gold/40'
                        : 'text-gray-200 hover:bg-gray-800'
                    }`}
                  >
                    <span>{tr.name}</span>
                    {selectedAudioTrack === tr.id && <Check className="w-4 h-4" />}
                  </button>
                ))
              ) : (
                <div className="p-3 text-center text-xs text-gray-400">
                  {isRtl ? 'يتوفر المسار الافتراضي للبث فقط' : 'Default track only'}
                </div>
              )}
            </div>
          </div>
        )}

        {activePopup === 'subtitles' && (
          <div className="vod-popup-container absolute bottom-24 right-6 z-40 bg-gray-900/95 backdrop-blur-xl border border-gold/40 rounded-2xl p-4 w-80 shadow-2xl space-y-3 animate-in fade-in slide-in-from-bottom-2 duration-200">
            <div className="flex items-center justify-between border-b border-gray-800 pb-2">
              <h4 className="text-sm font-bold text-gold flex items-center gap-2">
                <SubtitleIcon className="w-4 h-4" />
                {t('sub_settings')}
              </h4>
              <button
                onClick={() => setActivePopup('none')}
                className="text-gray-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-1 max-h-40 overflow-y-auto no-scrollbar">
              <button
                onClick={() => handleSelectSubtitle(-1)}
                tabIndex={0}
                className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-medium transition-colors focus:ring-2 focus:ring-inset focus:ring-gold ${
                  selectedSubtitle === -1
                    ? 'bg-gold/20 text-gold border border-gold/40'
                    : 'text-gray-200 hover:bg-gray-800'
                }`}
              >
                <span>{t('off')}</span>
                {selectedSubtitle === -1 && <Check className="w-4 h-4" />}
              </button>

              {subtitles.map((sub) => (
                <button
                  key={sub.id}
                  onClick={() => handleSelectSubtitle(sub.id)}
                  tabIndex={0}
                  className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-medium transition-colors focus:ring-2 focus:ring-inset focus:ring-gold ${
                    selectedSubtitle === sub.id
                      ? 'bg-gold/20 text-gold border border-gold/40'
                      : 'text-gray-200 hover:bg-gray-800'
                  }`}
                >
                  <span>{sub.name}</span>
                  {selectedSubtitle === sub.id && <Check className="w-4 h-4" />}
                </button>
              ))}
            </div>

            <button
              onClick={() => setActivePopup('subtitle-settings')}
              tabIndex={0}
              className="w-full flex items-center justify-center gap-2 py-2 rounded-xl bg-gray-800 hover:bg-gray-700 text-xs font-semibold text-gold border border-gray-700 focus:ring-2 focus:ring-inset focus:ring-gold"
            >
              <Settings className="w-3.5 h-3.5" />
              {isRtl ? 'تخصيص الحجم / اللون / المزامنة' : 'Customize Size / Color / Sync'}
            </button>
          </div>
        )}

        {activePopup === 'subtitle-settings' && (
          <div className="vod-popup-container absolute bottom-24 right-6 z-40 bg-gray-900/95 backdrop-blur-xl border border-gold/40 rounded-2xl p-4 w-80 shadow-2xl space-y-4 animate-in fade-in slide-in-from-bottom-2 duration-200">
            <div className="flex items-center justify-between border-b border-gray-800 pb-2">
              <h4 className="text-sm font-bold text-gold flex items-center gap-2">
                <Settings className="w-4 h-4" />
                {isRtl ? 'تخصيص مظهر الترجمة' : 'Customize Subtitle Style'}
              </h4>
              <button
                onClick={() => setActivePopup('subtitles')}
                className="text-gray-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs text-gray-300 font-medium block">{isRtl ? 'تزامن الترجمة (ثوانٍ):' : 'Subtitle Offset (sec):'}</label>
              <div className="flex items-center justify-between bg-gray-800/80 rounded-xl p-2 border border-gray-700">
                <button
                  onClick={() => handleSubSyncChange(-0.5)}
                  tabIndex={0}
                  className="px-3 py-1 bg-gray-700 hover:bg-gray-600 rounded-lg text-xs font-bold text-gold focus:ring-2 focus:ring-inset focus:ring-gold"
                >
                  -0.5s
                </button>
                <span className="text-xs font-mono font-bold text-white">{subSyncOffset > 0 ? `+${subSyncOffset}` : subSyncOffset}s</span>
                <button
                  onClick={() => handleSubSyncChange(0.5)}
                  tabIndex={0}
                  className="px-3 py-1 bg-gray-700 hover:bg-gray-600 rounded-lg text-xs font-bold text-gold focus:ring-2 focus:ring-inset focus:ring-gold"
                >
                  +0.5s
                </button>
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs text-gray-300 font-medium block">{isRtl ? 'حجم الخط:' : 'Font Size:'}</label>
              <div className="grid grid-cols-4 gap-1.5">
                {(['sm', 'md', 'lg', 'xl'] as const).map((sz) => (
                  <button
                    key={sz}
                    onClick={() => setSubFontSize(sz)}
                    tabIndex={0}
                    className={`py-1.5 rounded-lg text-xs font-bold uppercase border focus:ring-2 focus:ring-inset focus:ring-gold ${
                      subFontSize === sz
                        ? 'bg-gold text-black border-gold'
                        : 'bg-gray-800 text-gray-300 border-gray-700'
                    }`}
                  >
                    {sz}
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs text-gray-300 font-medium block">{isRtl ? 'لون النص:' : 'Text Color:'}</label>
              <div className="flex items-center gap-2">
                {[
                  { name: isRtl ? 'أبيض' : 'White', color: '#FFFFFF' },
                  { name: isRtl ? 'أصفر' : 'Yellow', color: '#FFD700' },
                  { name: isRtl ? 'سماوي' : 'Cyan', color: '#00FFFF' },
                  { name: isRtl ? 'أخضر' : 'Green', color: '#00FF00' }
                ].map((c) => (
                  <button
                    key={c.color}
                    onClick={() => setSubColor(c.color)}
                    tabIndex={0}
                    className="w-7 h-7 rounded-full border-2 focus:ring-2 focus:ring-inset focus:ring-gold flex items-center justify-center"
                    style={{ backgroundColor: c.color, borderColor: subColor === c.color ? 'var(--theme-primary, #e5a00d)' : 'transparent' }}
                  >
                    {subColor === c.color && <Check className="w-4 h-4 text-black" />}
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs text-gray-300 font-medium block">{isRtl ? 'خلفية النص:' : 'Text Background:'}</label>
              <div className="grid grid-cols-3 gap-1.5">
                {[
                  { id: 'none', name: isRtl ? 'بدون' : 'None' },
                  { id: 'semi', name: isRtl ? 'شفافة' : 'Semi' },
                  { id: 'black', name: isRtl ? 'سوداء' : 'Black' }
                ].map((bg) => (
                  <button
                    key={bg.id}
                    onClick={() => setSubBg(bg.id as any)}
                    tabIndex={0}
                    className={`py-1.5 rounded-lg text-xs font-bold border focus:ring-2 focus:ring-inset focus:ring-gold ${
                      subBg === bg.id
                        ? 'bg-gold text-black border-gold'
                        : 'bg-gray-800 text-gray-300 border-gray-700'
                    }`}
                  >
                    {bg.name}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {activePopup === 'quality' && (
          <div className="vod-popup-container absolute bottom-24 right-6 z-40 bg-gray-900/95 backdrop-blur-xl border border-gold/40 rounded-2xl p-4 w-72 shadow-2xl space-y-3 animate-in fade-in slide-in-from-bottom-2 duration-200">
            <div className="flex items-center justify-between border-b border-gray-800 pb-2">
              <h4 className="text-sm font-bold text-gold flex items-center gap-2">
                <Zap className="w-4 h-4" />
                {t('quality')}
              </h4>
              <button
                onClick={() => setActivePopup('none')}
                className="text-gray-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-1 max-h-56 overflow-y-auto no-scrollbar">
              <button
                onClick={() => handleSelectQuality(-1)}
                tabIndex={0}
                className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-medium transition-colors focus:ring-2 focus:ring-inset focus:ring-gold ${
                  selectedQuality === -1
                    ? 'bg-gold/20 text-gold border border-gold/40'
                    : 'text-gray-200 hover:bg-gray-800'
                }`}
              >
                <span>{isRtl ? 'تلقائي' : 'Auto'}</span>
                {selectedQuality === -1 && <Check className="w-4 h-4" />}
              </button>

              {hlsQualities.map((q) => (
                <button
                  key={q.id}
                  onClick={() => handleSelectQuality(q.id)}
                  tabIndex={0}
                  className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-medium transition-colors focus:ring-2 focus:ring-inset focus:ring-gold ${
                    selectedQuality === q.id
                      ? 'bg-gold/20 text-gold border border-gold/40'
                      : 'text-gray-200 hover:bg-gray-800'
                  }`}
                >
                  <span>{q.name}</span>
                  {selectedQuality === q.id && <Check className="w-4 h-4" />}
                </button>
              ))}
            </div>
          </div>
        )}

        {activePopup === 'aspect' && (
          <div className="vod-popup-container absolute bottom-24 right-6 z-40 bg-gray-900/95 backdrop-blur-xl border border-gold/40 rounded-2xl p-4 w-64 shadow-2xl space-y-3 animate-in fade-in slide-in-from-bottom-2 duration-200">
            <div className="flex items-center justify-between border-b border-gray-800 pb-2">
              <h4 className="text-sm font-bold text-gold flex items-center gap-2">
                <Maximize2 className="w-4 h-4" />
                {t('aspect_ratio')}
              </h4>
              <button
                onClick={() => setActivePopup('none')}
                className="text-gray-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-1">
              {[
                { id: 'fit', label: isRtl ? 'تناسب تلقائي (Fit)' : 'Auto Fit' },
                { id: 'fill', label: isRtl ? 'تعبئة الشاشة (Fill)' : 'Full Fill' },
                { id: 'zoom', label: isRtl ? 'تكبير (Zoom)' : 'Zoom' },
                { id: '16:9', label: '16:9' },
                { id: '4:3', label: '4:3' }
              ].map((mode) => (
                <button
                  key={mode.id}
                  onClick={() => {
                    setAspectRatio(mode.id as AspectRatioMode);
                    setActivePopup('none');
                  }}
                  tabIndex={0}
                  className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-medium transition-colors focus:ring-2 focus:ring-inset focus:ring-gold ${
                    aspectRatio === mode.id
                      ? 'bg-gold/20 text-gold border border-gold/40'
                      : 'text-gray-200 hover:bg-gray-800'
                  }`}
                >
                  <span>{mode.label}</span>
                  {aspectRatio === mode.id && <Check className="w-4 h-4" />}
                </button>
              ))}
            </div>
          </div>
        )}

        {activePopup === 'speed' && (
          <div className="vod-popup-container absolute bottom-24 right-6 z-40 bg-gray-900/95 backdrop-blur-xl border border-gold/40 rounded-2xl p-4 w-64 shadow-2xl space-y-3 animate-in fade-in slide-in-from-bottom-2 duration-200">
            <div className="flex items-center justify-between border-b border-gray-800 pb-2">
              <h4 className="text-sm font-bold text-gold flex items-center gap-2">
                <Sliders className="w-4 h-4" />
                {t('speed')}
              </h4>
              <button
                onClick={() => setActivePopup('none')}
                className="text-gray-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-1">
              {[0.5, 0.75, 1, 1.25, 1.5, 2].map((speed) => (
                <button
                  key={speed}
                  onClick={() => {
                    if (videoRef.current) videoRef.current.playbackRate = speed;
                    setPlaybackSpeed(speed);
                    setActivePopup('none');
                  }}
                  tabIndex={0}
                  className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-medium transition-colors focus:ring-2 focus:ring-inset focus:ring-gold ${
                    playbackSpeed === speed
                      ? 'bg-gold/20 text-gold border border-gold/40'
                      : 'text-gray-200 hover:bg-gray-800'
                  }`}
                >
                  <span>{speed === 1 ? (isRtl ? 'سرعة طبيعية (1.0x)' : 'Normal (1.0x)') : `${speed}x`}</span>
                  {playbackSpeed === speed && <Check className="w-4 h-4" />}
                </button>
              ))}
            </div>
          </div>
        )}

        {activePopup === 'sleep' && (
          <div className="vod-popup-container absolute bottom-24 right-6 z-40 bg-gray-900/95 backdrop-blur-xl border border-gold/40 rounded-2xl p-4 w-64 shadow-2xl space-y-3 animate-in fade-in slide-in-from-bottom-2 duration-200">
            <div className="flex items-center justify-between border-b border-gray-800 pb-2">
              <h4 className="text-sm font-bold text-gold flex items-center gap-2">
                <Clock className="w-4 h-4" />
                {t('sleep_timer')}
              </h4>
              <button
                onClick={() => setActivePopup('none')}
                className="text-gray-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-1">
              {[
                { label: isRtl ? 'إيقاف المؤقت' : 'Off', min: null },
                { label: isRtl ? 'بعد 15 دقيقة' : '15 min', min: 15 },
                { label: isRtl ? 'بعد 30 دقيقة' : '30 min', min: 30 },
                { label: isRtl ? 'بعد 45 دقيقة' : '45 min', min: 45 },
                { label: isRtl ? 'بعد 60 دقيقة' : '60 min', min: 60 }
              ].map((opt) => (
                <button
                  key={opt.label}
                  onClick={() => {
                    setSleepTimerMinutes(opt.min);
                    setActivePopup('none');
                  }}
                  tabIndex={0}
                  className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-medium transition-colors focus:ring-2 focus:ring-inset focus:ring-gold ${
                    sleepTimerMinutes === opt.min
                      ? 'bg-gold/20 text-gold border border-gold/40'
                      : 'text-gray-200 hover:bg-gray-800'
                  }`}
                >
                  <span>{opt.label}</span>
                  {sleepTimerMinutes === opt.min && <Check className="w-4 h-4" />}
                </button>
              ))}
            </div>
          </div>
        )}

        {activePopup === 'episodes' && isSeries && (
          <div className="vod-drawer-container absolute inset-y-0 right-0 z-50 w-80 sm:w-96 bg-gray-900/95 backdrop-blur-2xl border-l border-gold/30 p-5 shadow-2xl flex flex-col animate-in slide-in-from-right duration-300">
            <div className="flex items-center justify-between pb-4 border-b border-gray-800">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <ListVideo className="w-5 h-5 text-gold" />
                {t('episodes')}
              </h3>
              <button
                onClick={() => setActivePopup('none')}
                className="p-1 rounded-lg text-gray-400 hover:text-white hover:bg-gray-800"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto space-y-2 py-4 no-scrollbar">
              {vodEpisodes.map((ep, idx) => {
                const isCurrent = idx === currentEpisodeIndex;
                return (
                  <button
                    key={ep.id || idx}
                    onClick={() => {
                      if (onSelectEpisode) {
                        onSelectEpisode(idx);
                      } else if (onSelectMedia) {
                        onSelectMedia(ep);
                      }
                      setActivePopup('none');
                    }}
                    tabIndex={0}
                    className={`w-full p-3 rounded-xl border text-right transition-all flex items-center justify-between gap-3 focus:ring-2 focus:ring-inset focus:ring-gold ${
                      isCurrent
                        ? 'bg-gold/20 border-gold text-gold shadow-md'
                        : 'bg-gray-800/60 border-gray-700/60 text-gray-200 hover:bg-gray-800'
                    }`}
                  >
                    <div className="min-w-0">
                      <div className="text-xs font-bold truncate">
                        S{ep.season_num || 1} E{ep.episode_num || idx + 1}: {ep.title || ep.name || `الحلقة ${idx + 1}`}
                      </div>
                      {ep.duration && (
                        <div className="text-[10px] text-gray-400 mt-0.5">{ep.duration}</div>
                      )}
                    </div>
                    {isCurrent ? (
                      <div className="w-7 h-7 rounded-full bg-gold text-black flex items-center justify-center shrink-0">
                        <Play className="w-4 h-4 fill-current" />
                      </div>
                    ) : (
                      <div className="w-7 h-7 rounded-full bg-gray-700 text-gray-300 flex items-center justify-center shrink-0">
                        <PlayCircle className="w-4 h-4" />
                      </div>
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );

  if (portalTarget) {
    return createPortal(playerJSX, portalTarget);
  }

  return playerJSX;
};

export default VodPlayerModal;
