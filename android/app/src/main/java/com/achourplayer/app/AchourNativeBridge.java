
package com.achourplayer.app;

import android.app.Activity;
import android.view.Gravity;
import android.view.ViewGroup;
import android.widget.FrameLayout;
import android.webkit.JavascriptInterface;

public class AchourNativeBridge {

    private final Activity activity;
    private AchourNativePlayerView playerView;
    private FrameLayout.LayoutParams layoutParams;

    public AchourNativeBridge(Activity activity) {
        this.activity = activity;
    }

    @JavascriptInterface
    public void showPlayer(
            String url,
            String options,
            int x,
            int y,
            int width,
            int height
    ) {
        activity.runOnUiThread(() -> {
            if (playerView == null) {
                playerView = new AchourNativePlayerView(activity);

                layoutParams = new FrameLayout.LayoutParams(
                        width, height
                );

                layoutParams.gravity = Gravity.TOP | Gravity.LEFT;
                layoutParams.leftMargin = x;
                layoutParams.topMargin = y;

                activity.addContentView(playerView, layoutParams);
            } else {
                updateBounds(x, y, width, height);
            }

            playerView.setMedia(url, options);
        });
    }

    @JavascriptInterface
    public void updateBounds(int x, int y, int width, int height) {
        activity.runOnUiThread(() -> {
            if (playerView == null) return;

            FrameLayout.LayoutParams params =
                    (FrameLayout.LayoutParams) playerView.getLayoutParams();

            params.leftMargin = x;
            params.topMargin = y;
            params.width = width;
            params.height = height;

            playerView.setLayoutParams(params);
        });
    }

    @JavascriptInterface
    public void play() {
        activity.runOnUiThread(() -> {
            if (playerView != null) playerView.play();
        });
    }

    @JavascriptInterface
    public void pause() {
        activity.runOnUiThread(() -> {
            if (playerView != null) playerView.pause();
        });
    }

    @JavascriptInterface
    public void seekTo(long position) {
        activity.runOnUiThread(() -> {
            if (playerView != null) playerView.seekTo(position);
        });
    }

    @JavascriptInterface
    public void setVolume(float volume) {
        activity.runOnUiThread(() -> {
            if (playerView != null) playerView.setVolume(volume);
        });
    }

    @JavascriptInterface
    public void setPlaybackSpeed(float speed) {
        activity.runOnUiThread(() -> {
            if (playerView != null) {
                playerView.setPlaybackSpeed(speed);
            }
        });
    }

    @JavascriptInterface
    public void hidePlayer() {
        activity.runOnUiThread(() -> {
            if (playerView != null) {
                ViewGroup parent = (ViewGroup) playerView.getParent();

                if (parent != null) {
                    parent.removeView(playerView);
                }

                playerView.release();
                playerView = null;
                layoutParams = null;
            }
        });
    }
}
