export const PLAYER_PACKAGES: Record<string, string> = {
  'VLC Media Player': 'org.videolan.vlc',
  'MX Player Pro': 'com.mxtech.videoplayer.pro',
  'MX Player': 'com.mxtech.videoplayer.ad',
  'MPV Player': 'is.xyz.mpv',
  'Kodi': 'org.xbmc.kodi',
  'Just Player': 'com.brouken.player',
  'Nova Video Player': 'org.courville.nova',
  'IJK Player': 'tv.danmaku.ijk.media.example',
  'PotPlayer': 'com.potplayer.video.player',
  'KMPlayer': 'com.kmplayer',
  'ExoPlayer': 'com.google.android.exoplayer2'
};

export const getPlayerPackage = (playerName: string): string => {
  if (!playerName) return '';
  if (PLAYER_PACKAGES[playerName]) return PLAYER_PACKAGES[playerName];

  try {
    const customMap = JSON.parse(localStorage.getItem('achour_custom_players_map') || '{}');
    if (customMap[playerName]) return customMap[playerName];
  } catch (e) {}

  return '';
};

export const saveCustomPlayerPackage = (playerName: string, packageName: string) => {
  if (!playerName || !packageName) return;
  try {
    const customMap = JSON.parse(localStorage.getItem('achour_custom_players_map') || '{}');
    customMap[playerName] = packageName;
    localStorage.setItem('achour_custom_players_map', JSON.stringify(customMap));
    PLAYER_PACKAGES[playerName] = packageName;
  } catch (e) {}
};
