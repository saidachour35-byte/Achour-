import React, { useRef, useState, useEffect, useCallback, useMemo } from 'react';
import { ParsedChannel } from './LivePlayer';
import { Star, Play, Film, Clapperboard } from 'lucide-react';

interface VirtualizedListProps {
  items: ParsedChannel[];
  selectedChannelId?: string | null;
  activePlayingMovieId?: string | null;
  favorites: string[];
  isRtl: boolean;
  mediaType: 'live' | 'movie' | 'series' | 'favorites';
  onSelectChannel: (channel: ParsedChannel) => void;
  onDoubleClickChannel?: (channel: ParsedChannel) => void;
  onHighlightChannel?: (channel: ParsedChannel) => void;
  onToggleFavorite: (streamId: string) => void;
  onReorderChannel?: (item: any) => void;
  onMoveChannel?: (streamId: string, direction: 'up' | 'down', e: React.MouseEvent) => void;
  fetchMediaDetails?: (ch: ParsedChannel) => void;
}

const ITEM_HEIGHT = 50; // height of each live channel item in px
const GRID_ROW_HEIGHT = 190; // height of each movie/series poster row in px
const OVERSCAN = 15; // Increased buffer for faster logo appearance during scroll

// Custom long press hook with touch-movement cancellation for smooth scrolling
const useLongPress = (callback: () => void, ms = 500, enabled = true) => {
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const isLongPress = useRef(false);
  const startPos = useRef<{ x: number; y: number } | null>(null);

  const start = useCallback((clientX?: number, clientY?: number) => {
    if (!enabled) return;
    isLongPress.current = false;
    if (clientX !== undefined && clientY !== undefined) {
      startPos.current = { x: clientX, y: clientY };
    }
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => {
      isLongPress.current = true;
      callback();
    }, ms);
  }, [callback, ms, enabled]);

  const stop = useCallback(() => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
    startPos.current = null;
    if (isLongPress.current) {
      setTimeout(() => {
        isLongPress.current = false;
      }, 350);
    }
  }, []);

  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    if (!startPos.current || e.touches.length === 0) return;
    const touch = e.touches[0];
    const dx = Math.abs(touch.clientX - startPos.current.x);
    const dy = Math.abs(touch.clientY - startPos.current.y);
    if (dx > 6 || dy > 6) {
      stop();
    }
  }, [stop]);

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (!startPos.current) return;
    const dx = Math.abs(e.clientX - startPos.current.x);
    const dy = Math.abs(e.clientY - startPos.current.y);
    if (dx > 8 || dy > 8) {
      stop();
    }
  }, [stop]);

  const onClick = useCallback((e: React.MouseEvent | React.TouchEvent) => {
    if (isLongPress.current) {
      e.preventDefault();
      e.stopPropagation();
    }
  }, []);

  const onKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (!enabled) return;
    if (e.key === 'Enter' || e.key === 'Select' || e.keyCode === 13 || e.keyCode === 23 || e.key === ' ') {
      if (!timerRef.current) {
        start();
      }
    }
  }, [start, enabled]);

  const onKeyUp = useCallback((e: React.KeyboardEvent) => {
    if (!enabled) return;
    if (e.key === 'Enter' || e.key === 'Select' || e.keyCode === 13 || e.keyCode === 23 || e.key === ' ') {
      stop();
    }
  }, [stop, enabled]);

  return {
    onMouseDown: (e: React.MouseEvent) => start(e.clientX, e.clientY),
    onMouseMove: handleMouseMove,
    onMouseUp: stop,
    onMouseLeave: stop,
    onTouchStart: (e: React.TouchEvent) => {
      if (e.touches.length > 0) {
        start(e.touches[0].clientX, e.touches[0].clientY);
      }
    },
    onTouchMove: handleTouchMove,
    onTouchEnd: stop,
    onTouchCancel: stop,
    onKeyDown,
    onKeyUp,
    onContextMenu: (e: React.MouseEvent) => {
      if (enabled) {
        e.preventDefault();
        e.stopPropagation();
        callback();
      }
    },
    onClick,
    isLongPressActive: () => isLongPress.current
  };
};

const LiveChannelRow: React.FC<{
  ch: ParsedChannel;
  idx: number;
  top: number;
  isSelected: boolean;
  isFav: boolean;
  isRtl: boolean;
  mediaType?: string;
  onSelectChannel: (channel: ParsedChannel) => void;
  onDoubleClickChannel?: (channel: ParsedChannel) => void;
  onHighlightChannel?: (channel: ParsedChannel) => void;
  onToggleFavorite: (streamId: string) => void;
  onReorderChannel?: (item: any) => void;
}> = React.memo(({
  ch,
  idx,
  top,
  isSelected,
  isFav,
  isRtl,
  mediaType = 'live',
  onSelectChannel,
  onDoubleClickChannel,
  onHighlightChannel,
  onToggleFavorite,
  onReorderChannel
}) => {
  const longPress = useLongPress(() => {
    if (onReorderChannel) {
      onReorderChannel({ ...ch, realIdx: idx });
    }
  }, 450, !!onReorderChannel);

  const handleItemClick = (e: React.MouseEvent | React.TouchEvent) => {
    if (longPress.isLongPressActive && longPress.isLongPressActive()) {
      e.preventDefault();
      e.stopPropagation();
      return;
    }
    onSelectChannel(ch);
  };

  const { isLongPressActive, ...longPressHandlers } = longPress;

  return (
    <div
      style={{
        position: 'absolute',
        top: `${top}px`,
        left: 0,
        right: 0,
        height: `${ITEM_HEIGHT - 6}px`
      }}
      className="px-2"
    >
      <div
        role="button"
        data-tv-focusable="true"
        data-tv-pane="channels"
        data-index={idx}
        tabIndex={0}
        {...longPressHandlers}
        onFocus={() => {
          if (onHighlightChannel) onHighlightChannel(ch);
        }}
        onClick={handleItemClick}
        onDoubleClick={(e) => {
          e.stopPropagation();
          onSelectChannel(ch);
          if (onDoubleClickChannel) onDoubleClickChannel(ch);
        }}
        className={`w-full h-full flex items-center gap-2 px-2 rounded-xl border transition-all relative group cursor-pointer outline-none focus:outline-none focus:ring-4 focus:ring-gold focus:ring-inset focus:bg-gold/25 focus:z-30 ${
          isSelected
            ? 'bg-gold/15 text-white border-gold/40 shadow-inner font-semibold'
            : 'border-transparent text-zinc-300 hover:bg-white/5 hover:text-white'
        } ${isRtl ? 'flex-row-reverse text-right' : 'text-left'}`}

        title={mediaType === 'live' ? (isRtl ? 'اضغط مطولاً أو انقر بالزر الأيمن لنقل القناة أو تغيير رقمها' : 'Long press or right click to reorder channel position') : undefined}
      >
        {/* Channel Number (Pure span, focusable only via parent channel container) */}
        <span
          className="w-7 text-[11px] text-gold font-mono font-black shrink-0 text-center select-none"
          tabIndex={-1}
        >
          {idx + 1}
        </span>

        {/* Channel Icon */}
        <div className="w-8 h-8 rounded-lg bg-black/60 flex items-center justify-center overflow-hidden shrink-0 border border-white/10 shadow-sm">
          {(ch.stream_icon || ch.logo || ch.cover) ? (
            <img
              src={ch.stream_icon || ch.logo || ch.cover}
              referrerPolicy="no-referrer"
              decoding="async"
              loading="lazy"
              className="w-full h-full object-cover"
              onError={(e) => (e.currentTarget.style.display = 'none')}
              alt=""
            />
          ) : (
            <Play size={12} className={isSelected ? 'text-gold fill-gold' : 'text-zinc-500'} />
          )}
        </div>

        {/* Channel Name & Group */}
        <div className="flex flex-col flex-1 min-w-0 justify-center py-0.5">
          <span 
            className={`text-xs sm:text-[13px] font-bold truncate leading-normal transition-colors ${
              isSelected ? 'text-white' : 'text-zinc-200 group-hover:text-white'
            }`}
            title={ch.name}
          >
            {ch.name}
          </span>
          <span className="text-[9px] sm:text-[10px] font-semibold text-gold/70 truncate leading-none mt-0.5">
            {ch.category_name || 'General'}
          </span>
        </div>

      </div>
    </div>
  );
});

export const VirtualizedChannelList: React.FC<VirtualizedListProps> = ({
  items,
  selectedChannelId,
  activePlayingMovieId,
  favorites,
  isRtl,
  mediaType,
  onSelectChannel,
  onDoubleClickChannel,
  onHighlightChannel,
  onToggleFavorite,
  onReorderChannel,
  onMoveChannel,
  fetchMediaDetails
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [scrollTop, setScrollTop] = useState(0);
  const [containerHeight, setContainerHeight] = useState(600);
  const [columnCount, setColumnCount] = useState(5);

  // ResizeObserver to track container dimensions and grid columns
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const updateDimensions = () => {
      const h = container.clientHeight || 600;
      const w = container.clientWidth || 800;
      setContainerHeight(h);

      if (w < 400) setColumnCount(3);
      else if (w < 640) setColumnCount(4);
      else if (w < 900) setColumnCount(5);
      else if (w < 1200) setColumnCount(6);
      else setColumnCount(7);
    };

    updateDimensions();

    const observer = new ResizeObserver(() => {
      updateDimensions();
    });
    observer.observe(container);

    return () => observer.disconnect();
  }, []);

  const scrollRafRef = useRef<number | null>(null);
  const handleScroll = useCallback((e: React.UIEvent<HTMLDivElement>) => {
    const nextScrollTop = e.currentTarget.scrollTop;
    if (scrollRafRef.current) cancelAnimationFrame(scrollRafRef.current);
    scrollRafRef.current = requestAnimationFrame(() => {
      setScrollTop(nextScrollTop);
    });
  }, []);

  useEffect(() => {
    return () => {
      if (scrollRafRef.current) cancelAnimationFrame(scrollRafRef.current);
    };
  }, []);

  // Auto-scroll to selected item if selected via D-Pad remote control
  useEffect(() => {
    if (!selectedChannelId || !containerRef.current) return;
    const index = items.findIndex(c => c.stream_id === selectedChannelId);
    if (index === -1) return;

    const container = containerRef.current;
    if (mediaType === 'live' || mediaType === 'favorites') {
      const itemTop = index * ITEM_HEIGHT;
      const itemBottom = itemTop + ITEM_HEIGHT;
      const viewTop = container.scrollTop;
      const viewBottom = viewTop + containerHeight;

      if (itemTop < viewTop) {
        container.scrollTop = itemTop;
      } else if (itemBottom > viewBottom) {
        container.scrollTop = itemBottom - containerHeight;
      }
    } else {
      const rowIndex = Math.floor(index / columnCount);
      const rowTop = rowIndex * GRID_ROW_HEIGHT;
      const rowBottom = rowTop + GRID_ROW_HEIGHT;
      const viewTop = container.scrollTop;
      const viewBottom = viewTop + containerHeight;

      if (rowTop < viewTop) {
        container.scrollTop = rowTop;
      } else if (rowBottom > viewBottom) {
        container.scrollTop = rowBottom - containerHeight;
      }
    }
  }, [selectedChannelId, items, containerHeight, mediaType, columnCount]);

  // Virtualization math for LIVE TV (List Mode)
  const listVirtualBounds = useMemo(() => {
    const totalCount = items.length;
    const totalHeight = totalCount * ITEM_HEIGHT;

    const startIndex = Math.max(0, Math.floor(scrollTop / ITEM_HEIGHT) - OVERSCAN);
    const endIndex = Math.min(totalCount, Math.ceil((scrollTop + containerHeight) / ITEM_HEIGHT) + OVERSCAN);

    const visibleItems = items.slice(startIndex, endIndex).map((item, i) => ({
      item,
      originalIndex: startIndex + i,
      top: (startIndex + i) * ITEM_HEIGHT
    }));

    return { totalHeight, visibleItems };
  }, [items, scrollTop, containerHeight]);

  // Virtualization math for VOD / MOVIES / SERIES (Grid Mode)
  const gridVirtualBounds = useMemo(() => {
    const totalItems = items.length;
    const totalRows = Math.ceil(totalItems / columnCount);
    const totalHeight = totalRows * GRID_ROW_HEIGHT;

    const startRow = Math.max(0, Math.floor(scrollTop / GRID_ROW_HEIGHT) - OVERSCAN);
    const endRow = Math.min(totalRows, Math.ceil((scrollTop + containerHeight) / GRID_ROW_HEIGHT) + OVERSCAN);

    const visibleRows: { rowIndex: number; top: number; rowItems: { item: ParsedChannel; originalIndex: number }[] }[] = [];

    for (let r = startRow; r < endRow; r++) {
      const rowItems: { item: ParsedChannel; originalIndex: number }[] = [];
      for (let c = 0; c < columnCount; c++) {
        const itemIdx = r * columnCount + c;
        if (itemIdx < totalItems) {
          rowItems.push({ item: items[itemIdx], originalIndex: itemIdx });
        }
      }
      visibleRows.push({
        rowIndex: r,
        top: r * GRID_ROW_HEIGHT,
        rowItems
      });
    }

    return { totalHeight, visibleRows };
  }, [items, scrollTop, containerHeight, columnCount]);

  if (items.length === 0) {
    return (
      <div className="w-full h-full flex flex-col items-center justify-center p-8 text-center text-zinc-500">
        <Film size={36} className="mb-2 opacity-40 text-gold" />
        <span className="text-xs font-bold">{isRtl ? 'لا توجد قنوات متاحة' : 'No channels available'}</span>
      </div>
    );
  }

  return (
    <div
      ref={containerRef}
      onScroll={handleScroll}
      data-channel-list-container="true"
      className="relative w-full h-full overflow-y-auto overflow-x-hidden no-scrollbar"
      tabIndex={0}
    >
      {mediaType === 'movie' || mediaType === 'series' ? (
        /* VIRTUALIZED POSTER GRID FOR MOVIES & SERIES */
        <div style={{ height: `${gridVirtualBounds.totalHeight}px`, position: 'relative', width: '100%' }}>
          {gridVirtualBounds.visibleRows.map(row => (
            <div
              key={`row-${row.rowIndex}`}
              style={{
                position: 'absolute',
                top: `${row.top}px`,
                left: 0,
                right: 0,
                height: `${GRID_ROW_HEIGHT - 12}px`,
                display: 'grid',
                gridTemplateColumns: `repeat(${columnCount}, minmax(0, 1fr))`,
                gap: '12px',
                padding: '0 4px'
              }}
            >
              {row.rowItems.map(({ item: ch, originalIndex: idx }) => {
                const isSelected = selectedChannelId === ch.stream_id || activePlayingMovieId === ch.stream_id;
                const isFav = favorites.includes(ch.stream_id);

                return (
                  <div
                    key={`${ch.stream_id}-${idx}`}
                    data-tv-focusable="true"
                    data-tv-pane="channels"
                    data-index={idx}
                    tabIndex={0}
                    onClick={() => {
                      onSelectChannel(ch);
                      if (fetchMediaDetails) fetchMediaDetails(ch);
                    }}
                    className={`relative h-full rounded-2xl border-2 overflow-hidden cursor-pointer group transition-all duration-150 shadow-md outline-none focus:outline-none focus:border-gold focus:border-4 focus:ring-4 focus:ring-gold focus:scale-105 focus:shadow-[0_0_35px_rgba(229,160,13,0.9)] focus:z-50 ${
                      isSelected
                        ? 'border-gold bg-gold/20 shadow-[0_0_20px_rgba(212,175,55,0.6)]'
                        : 'border-white/20 hover:border-gold/80 bg-zinc-950'
                    }`}
                    title={isRtl ? 'انقر لعرض قصة الفيلم والتشغيل' : 'Click to view details & play'}
                  >
                    {(ch.stream_icon || ch.logo || ch.cover) ? (
                      <img
                        src={ch.stream_icon || ch.logo || ch.cover}
                        referrerPolicy="no-referrer"
                        decoding="async"
                        loading="lazy"
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                        onError={(e) => { e.currentTarget.style.display = 'none'; }}
                        alt={ch.name}
                      />
                    ) : (
                      <div className="w-full h-full bg-gradient-to-br from-zinc-900 via-zinc-950 to-black flex flex-col items-center justify-center p-3 text-center border border-white/5">
                        {mediaType === 'movie' ? (
                          <Film size={28} className="text-gold/60 mb-2" />
                        ) : (
                          <Clapperboard size={28} className="text-gold/60 mb-2" />
                        )}
                        <span className="text-[10px] font-bold text-zinc-300 line-clamp-2 leading-tight">{ch.name}</span>
                      </div>
                    )}

                    <div className="absolute inset-0 bg-gradient-to-t from-black via-black/30 to-transparent opacity-85 group-hover:opacity-95 transition-opacity" />

                    <div className="absolute top-2 left-2 right-2 flex items-center justify-end z-10">
                      <span className="px-1.5 py-0.5 rounded-md bg-black/60 backdrop-blur-md border border-white/10 text-[8px] font-mono font-bold text-gold uppercase">
                        {mediaType === 'series' ? 'SERIES' : 'VOD'}
                      </span>
                    </div>

                    <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all duration-300 z-10 pointer-events-none">
                      <div className="w-10 h-10 rounded-full bg-gold text-black flex items-center justify-center shadow-2xl scale-75 group-hover:scale-100 transition-transform">
                        <Play size={18} className="fill-black ml-0.5" />
                      </div>
                    </div>

                    <div className="absolute bottom-0 left-0 right-0 p-2 z-10 flex flex-col gap-0.5">
                      <span className="text-[10px] sm:text-[11px] font-black text-white line-clamp-1 leading-tight drop-shadow-md">
                        {ch.name}
                      </span>
                      <span className="text-[8px] font-mono text-gold/70 truncate">
                        {ch.category_name || (mediaType === 'movie' ? 'أفلام' : 'مسلسلات')}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          ))}
        </div>
      ) : (
        /* VIRTUALIZED LIST FOR LIVE CHANNELS */
        <div style={{ height: `${listVirtualBounds.totalHeight}px`, position: 'relative', width: '100%' }}>
          {listVirtualBounds.visibleItems.map(({ item: ch, originalIndex: idx, top }) => (
            <LiveChannelRow
              key={`${ch.stream_id}-${idx}`}
              ch={ch}
              idx={idx}
              top={top}
              isSelected={selectedChannelId === ch.stream_id}
              isFav={favorites.includes(ch.stream_id)}
              isRtl={isRtl}
              mediaType={mediaType}
              onSelectChannel={onSelectChannel}
              onDoubleClickChannel={onDoubleClickChannel}
              onHighlightChannel={onHighlightChannel}
              onToggleFavorite={onToggleFavorite}
              onReorderChannel={onReorderChannel}
            />
          ))}
        </div>
      )}
    </div>
  );
};

export default VirtualizedChannelList;
