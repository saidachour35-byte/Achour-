package com.achourplayer.app;

import android.app.Activity;
import android.content.Intent;
import android.webkit.JavascriptInterface;

public class AchourNativeBridge {
    private final Activity activity;

    public AchourNativeBridge(Activity activity) {
        this.activity = activity;
    }

    @JavascriptInterface
    public void playMedia(String url, String optionsJson) {
        if (url == null || url.trim().isEmpty()) return;

        activity.runOnUiThread(() -> {
            Intent intent = new Intent(activity, NativePlayerActivity.class);
            intent.putExtra(NativePlayerActivity.EXTRA_URL, url.trim());
            intent.putExtra(
                NativePlayerActivity.EXTRA_OPTIONS,
                optionsJson == null ? "{}" : optionsJson
            );
            activity.startActivity(intent);
        });
    }
}
