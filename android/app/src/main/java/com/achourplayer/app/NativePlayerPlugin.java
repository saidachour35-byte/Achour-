package com.achourplayer.app;

import android.content.Intent;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

@CapacitorPlugin(name = "NativePlayer")
public class NativePlayerPlugin extends Plugin {

    @PluginMethod
    public void play(PluginCall call) {
        String url = call.getString("url");

        if (url == null || url.isEmpty()) {
            call.reject("URL is required");
            return;
        }

        Intent intent = new Intent(getContext(), NativePlayerActivity.class);
        intent.putExtra("EXTRA_URL", url);

        getActivity().runOnUiThread(() -> {
            getActivity().startActivity(intent);
            call.resolve();
        });
    }
}
