
package com.achourplayer.app;

import android.os.Bundle;
import android.view.View;
import android.view.Window;
import android.view.WindowManager;
import android.widget.Toast;

import androidx.annotation.Nullable;
import androidx.appcompat.app.AppCompatActivity;
import androidx.media3.common.MediaItem;
import androidx.media3.common.MediaMetadata;
import androidx.media3.common.MimeTypes;
import androidx.media3.common.PlaybackException;
import androidx.media3.common.Player;
import androidx.media3.datasource.DefaultHttpDataSource;
import androidx.media3.exoplayer.ExoPlayer;
import androidx.media3.exoplayer.source.DefaultMediaSourceFactory;
import androidx.media3.ui.PlayerView;

import org.json.JSONObject;

import java.util.HashMap;
import java.util.Iterator;
import java.util.Map;

public class NativePlayerActivity extends AppCompatActivity {

    public static final String EXTRA_URL = "achour.extra.URL";
    public static final String EXTRA_OPTIONS = "achour.extra.OPTIONS";

    private ExoPlayer player;
    private PlayerView playerView;

    @Override
    protected void onCreate(@Nullable Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);

        getWindow().addFlags(WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON);
        hideSystemUi();

        String url = getIntent().getStringExtra(EXTRA_URL);
        String optionsJson = getIntent().getStringExtra(EXTRA_OPTIONS);

        if (url == null || url.trim().isEmpty()) {
            Toast.makeText(this, "Stream URL is missing", Toast.LENGTH_LONG).show();
            finish();
            return;
        }

        String title = "Achour TV";
        Map<String, String> headers = new HashMap<>();

        try {
            JSONObject options = new JSONObject(optionsJson == null ? "{}" : optionsJson);
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

        playerView = new PlayerView(this);
        playerView.setUseController(true);
        playerView.setControllerAutoShow(true);
        playerView.setShowBuffering(PlayerView.SHOW_BUFFERING_WHEN_PLAYING);
        setContentView(playerView);

        DefaultHttpDataSource.Factory httpFactory =
                new DefaultHttpDataSource.Factory()
                        .setAllowCrossProtocolRedirects(true)
                        .setDefaultRequestProperties(headers);

        DefaultMediaSourceFactory mediaSourceFactory =
                new DefaultMediaSourceFactory(httpFactory);

        player = new ExoPlayer.Builder(this)
                .setMediaSourceFactory(mediaSourceFactory)
                .build();

        playerView.setPlayer(player);

        player.addListener(new Player.Listener() {
            @Override
            public void onPlayerError(PlaybackException error) {
                Toast.makeText(
                        NativePlayerActivity.this,
                        "Playback error: " + error.getErrorCodeName(),
                        Toast.LENGTH_LONG
                ).show();
            }
        });

        MediaItem.Builder mediaItem = new MediaItem.Builder().setUri(url);

        if (url.toLowerCase().contains(".m3u8")) {
            mediaItem.setMimeType(MimeTypes.APPLICATION_M3U8);
        }

        MediaMetadata metadata = new MediaMetadata.Builder()
                .setTitle(title)
                .build();

        player.setMediaItem(mediaItem.setMediaMetadata(metadata).build());
        player.prepare();
        player.play();
    }

    @Override
    protected void onDestroy() {
        if (playerView != null) {
            playerView.setPlayer(null);
        }
        if (player != null) {
            player.release();
            player = null;
        }
        super.onDestroy();
    }

    private void hideSystemUi() {
        Window window = getWindow();

        if (android.os.Build.VERSION.SDK_INT >= android.os.Build.VERSION_CODES.R) {
            android.view.WindowInsetsController controller = window.getInsetsController();

            if (controller != null) {
                controller.hide(
                        android.view.WindowInsets.Type.statusBars()
                                | android.view.WindowInsets.Type.navigationBars()
                );
                controller.setSystemBarsBehavior(
                        android.view.WindowInsetsController.BEHAVIOR_SHOW_TRANSIENT_BARS_BY_SWIPE
                );
            }
        } else {
            window.getDecorView().setSystemUiVisibility(
                    View.SYSTEM_UI_FLAG_IMMERSIVE_STICKY
                            | View.SYSTEM_UI_FLAG_FULLSCREEN
                            | View.SYSTEM_UI_FLAG_HIDE_NAVIGATION
                            | View.SYSTEM_UI_FLAG_LAYOUT_STABLE
                            | View.SYSTEM_UI_FLAG_LAYOUT_FULLSCREEN
                            | View.SYSTEM_UI_FLAG_LAYOUT_HIDE_NAVIGATION
            );
        }
    }
}
