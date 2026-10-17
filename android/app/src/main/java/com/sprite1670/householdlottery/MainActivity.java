package com.sprite1670.householdlottery;

import android.app.Activity;
import android.app.AlertDialog;
import android.graphics.Color;
import android.os.Bundle;
import android.webkit.JsResult;
import android.webkit.WebChromeClient;
import android.webkit.WebResourceRequest;
import android.webkit.WebResourceResponse;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.webkit.WebViewClient;
import android.widget.FrameLayout;
import java.io.ByteArrayInputStream;

/** Offline shell: no JavaScript bridge, remote content, or Android permissions. */
public final class MainActivity extends Activity {
    private static final String GAME_URL = "file:///android_asset/index.html";
    private WebView webView;

    @Override
    @SuppressWarnings("deprecation")
    public void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        FrameLayout root = new FrameLayout(this);
        root.setBackgroundColor(Color.rgb(245, 244, 237));
        // Account for status/navigation bars, display cutouts, and the keyboard.
        root.setOnApplyWindowInsetsListener((view, insets) -> {
            view.setPadding(insets.getSystemWindowInsetLeft(),
                insets.getSystemWindowInsetTop(), insets.getSystemWindowInsetRight(),
                insets.getSystemWindowInsetBottom());
            return insets.consumeSystemWindowInsets();
        });
        webView = new WebView(this);
        webView.setBackgroundColor(Color.rgb(245, 244, 237));
        WebSettings settings = webView.getSettings();
        settings.setJavaScriptEnabled(true);
        settings.setDomStorageEnabled(true);
        settings.setAllowFileAccess(false);
        settings.setAllowContentAccess(false);
        settings.setAllowFileAccessFromFileURLs(false);
        settings.setAllowUniversalAccessFromFileURLs(false);
        settings.setBlockNetworkLoads(true);
        settings.setMixedContentMode(WebSettings.MIXED_CONTENT_NEVER_ALLOW);
        webView.setWebViewClient(new WebViewClient() {
            @Override
            public boolean shouldOverrideUrlLoading(WebView view, WebResourceRequest request) {
                return !GAME_URL.equals(request.getUrl().toString());
            }

            @Override
            public WebResourceResponse shouldInterceptRequest(WebView view, WebResourceRequest request) {
                if (GAME_URL.equals(request.getUrl().toString())) return null;
                return new WebResourceResponse("text/plain", "UTF-8",
                    new ByteArrayInputStream(new byte[0]));
            }
        });
        webView.setWebChromeClient(new WebChromeClient() {
            @Override
            public boolean onJsConfirm(WebView view, String url, String message, JsResult result) {
                if (isFinishing() || isDestroyed()) {
                    result.cancel();
                    return true;
                }
                new AlertDialog.Builder(MainActivity.this)
                    .setTitle("重新开局")
                    .setMessage(message)
                    .setPositiveButton("确定", (dialog, which) -> result.confirm())
                    .setNegativeButton("取消", (dialog, which) -> result.cancel())
                    .setOnCancelListener(dialog -> result.cancel())
                    .show();
                return true;
            }
        });
        root.addView(webView, new FrameLayout.LayoutParams(-1, -1));
        setContentView(root);
        root.requestApplyInsets();
        webView.loadUrl(GAME_URL);
    }

    @Override
    protected void onPause() {
        webView.onPause();
        super.onPause();
    }

    @Override
    protected void onResume() {
        super.onResume();
        if (webView != null) webView.onResume();
    }

    @Override
    protected void onDestroy() {
        if (webView != null) {
            ((FrameLayout) webView.getParent()).removeView(webView);
            webView.destroy();
            webView = null;
        }
        super.onDestroy();
    }
}
