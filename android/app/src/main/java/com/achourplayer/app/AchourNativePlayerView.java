
package com.achourplayer.app;

import android.content.Context;
import android.widget.FrameLayout;

import androidx.media3.common.MediaItem;
import androidx.media3.common.MediaMetadata;
import androidx.media3.common.MimeTypes;
import androidx.media3.common.PlaybackParameters;
import androidx.media3.common.Player;
import androidx.media3.datasource.DefaultHttpDataSource;
import androidx.media3.exoplayer.ExoPlayer;
import androidx.media3.exoplayer.source.DefaultMediaSourceFactory;
import androidx.media3.ui.PlayerView;

import org.json.JSONObject;

import java.util.HashMap;
import java.util.Iterator;
import java.util.Map;

public class AchourNativePlayerView extends FrameLayout {

    private ExoPlayer player;
    private PlayerView playerView;

    public AchourNativePlayerView(Context context) {
        super(context);
        initialize(context);
    }

    private void initialize(Context context) {
        playerView = new PlayerView(context);
        playerView.setUseController(false);
        playerView.setSurfaceType(PlayerView.SURFACE_TYPE_TEXTURE_VIEW);

        addView(playerView, new FrameLayout.LayoutParams(
                LayoutParams.MATCH_PARENT,
                LayoutParams.MATCH_PARENT
        ));

        DefaultHttpDataSource.Factory httpFactory =
                new DefaultHttpDataSource.Factory()
                        .setAllowCrossProtocolRedirects(true);

        player = new ExoPlayer.Builder(context)
                .setMediaSourceFactory(
                        new DefaultMediaSourceFactory(httpFactory)
                )
                .build();

        playerView.setPlayer(player);
    }

    public void setMedia(String url, String optionsJson) {
        if (url == null || url.trim().isEmpty()) return;

        String title = "Achour Player";
        Map<String, String> headers = new HashMap<>();

        try {
            JSONObject options = new JSONObject(
                    optionsJson == null ? "{}" : optionsJson
            );

            title = options.optString("title", title);

            JSONObject headerObject = options.optJSONObject("headers");

            if (headerObject != null) {
                Iterator<String> keys = headerObject.keys();

                while (keys.hasNext()) {
                    String key = keys.next();
                    String value = headerObject.optString(key, "");

                    if (!value.isEmpty()) {
                        headers.put(key, value);
                    }
                }
            }
        } catch (Exception ignored) {
        }

        DefaultHttpDataSource.Factory httpFactory =
                new DefaultHttpDataSource.Factory()
                        .setAllowCrossProtocolRedirects(true)
                        .setDefaultRequestProperties(headers);

        MediaItem.Builder item = new MediaItem.Builder()
                .setUri(url.trim());

        if (url.toLowerCase().contains(".m3u8")) {
            item.setMimeType(MimeTypes.APPLICATION_M3U8);
        }

        item.setMediaMetadata(
                new MediaMetadata.Builder()
                        .setTitle(title)
                        .build()
        );

        player.setMediaSource(
                new DefaultMediaSourceFactory(httpFactory)
                        .createMediaSource(item.build())
        );

        player.prepare();
        player.play();
    }

    public void play() {
        if (player != null) player.play();
    }

    public void pause() {
        if (player != null) player.pause();
    }

    public void seekTo(long position) {
        if (player != null) player.seekTo(position);
    }

    public void setVolume(float volume) {
        if (player != null) {
            player.setVolume(Math.max(0f, Math.min(1f, volume)));
        }
    }

    public void setPlaybackSpeed(float speed) {
        if (player != null && speed > 0) {
            player.setPlaybackParameters(
                    new PlaybackParameters(speed)
            );
        }
    }

    public long getCurrentPosition() {
        return player == null ? 0 : player.getCurrentPosition();
    }

    public long getDuration() {
        return player == null ? 0 : player.getDuration();
    }

    public boolean isPlaying() {
        return player != null && player.isPlaying();
    }

    public void release() {
        if (playerView != null) {
            playerView.setPlayer(null);
        }

        if (player != null) {
            player.release();
            player = null;
        }
    }
}
