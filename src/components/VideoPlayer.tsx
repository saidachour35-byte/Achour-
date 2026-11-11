import React, { useEffect, useRef } from 'react';
import videojs from 'video.js';
import 'video.js/dist/video-js.css';

interface VideoPlayerProps {
  url: string;
  onReady?: (player: any) => void;
}

export const VideoPlayer: React.FC<VideoPlayerProps> = ({ url, onReady }) => {
  const videoRef = useRef<HTMLDivElement>(null);
  const playerRef = useRef<any>(null);

  useEffect(() => {
    if (!videoRef.current) return;

    const videoElement = document.createElement("video-js");
    videoElement.classList.add('vjs-big-play-centered');
    videoRef.current.appendChild(videoElement);

    const player: any = videojs(videoElement, {
      autoplay: true,
      controls: true,
      responsive: true,
      fluid: true,
      html5: {
        vhs: {
          overrideNative: true,
          maxBufferLength: 30,
          maxMaxBufferLength: 60,
          limitRenditionByPlayerDimensions: true,
          useBandwidthFromLocalStorage: true
        }
      },
      sources: [{
        src: url || 'https://vjs.zencdn.net/v/oceans.mp4',
        type: url.includes('.m3u8') ? 'application/x-mpegURL' : 'video/mp4'
      }]
    }, () => {
      onReady && onReady(player);
    });

    player.on('error', () => {
      console.error('VideoJS Error:', player.error());
    });
    playerRef.current = player;

    return () => {
      if (playerRef.current) {
        playerRef.current.dispose();
        playerRef.current = null;
      }
    };
  }, [url]);

  return (
    <div data-vjs-player className="w-full h-full">
      <div ref={videoRef} />
    </div>
  );
};
