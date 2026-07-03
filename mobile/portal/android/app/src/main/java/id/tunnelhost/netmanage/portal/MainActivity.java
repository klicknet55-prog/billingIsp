package id.tunnelhost.netmanage.portal;

import android.content.Intent;
import android.net.Uri;
import android.os.Bundle;
import android.text.TextUtils;
import android.webkit.WebView;
import androidx.core.view.WindowCompat;
import androidx.core.view.WindowInsetsCompat;
import androidx.core.view.WindowInsetsControllerCompat;
import com.getcapacitor.Bridge;
import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {

    private boolean appLinkHandled;

    @Override
    public void onCreate(Bundle savedInstanceState) {
        clearLauncherIntentDataIfNeeded();
        super.onCreate(savedInstanceState);
        applyImmersiveEdgeToEdge();
    }

    @Override
    protected void onNewIntent(Intent intent) {
        super.onNewIntent(intent);
        setIntent(intent);
        appLinkHandled = false;
        loadAppLinkTargetIfNeeded();
    }

    @Override
    public void onStart() {
        super.onStart();
        loadAppLinkTargetIfNeeded();
    }

    @Override
    public void onWindowFocusChanged(boolean hasFocus) {
        super.onWindowFocusChanged(hasFocus);
        if (hasFocus) {
            applyImmersiveEdgeToEdge();
        }
    }

    /** Launcher icon tidak boleh membawa data deep-link lama (bisa gagal load WebView). */
    private void clearLauncherIntentDataIfNeeded() {
        Intent intent = getIntent();
        if (intent == null) return;
        if (!Intent.ACTION_MAIN.equals(intent.getAction())) return;
        if (!intent.hasCategory(Intent.CATEGORY_LAUNCHER)) return;
        intent.setData(null);
        intent.setDataAndType(null, null);
    }

    /** App Link /p/* langsung ke WebView — hindari race bootstrap vs login page. */
    private void loadAppLinkTargetIfNeeded() {
        if (appLinkHandled) return;

        Intent intent = getIntent();
        if (intent == null) return;
        if (!Intent.ACTION_VIEW.equals(intent.getAction())) return;

        Uri data = intent.getData();
        if (data == null) return;

        String path = data.getPath();
        if (path == null) return;
        if (!path.startsWith("/p/") && !path.startsWith("/portal/")) return;

        Bridge bridge = getBridge();
        if (bridge == null) return;
        WebView webView = bridge.getWebView();
        if (webView == null) return;

        String current = webView.getUrl();
        if (current != null && current.contains(path) && current.contains("nm_app=portal")) {
            appLinkHandled = true;
            return;
        }

        Uri.Builder target = data.buildUpon();
        if (TextUtils.isEmpty(data.getQueryParameter("nm_app"))) {
            target.appendQueryParameter("nm_app", "portal");
        }
        webView.loadUrl(target.build().toString());
        appLinkHandled = true;
    }

    /** Edge-to-edge + nav/status bar tersembunyi; muncul sementara saat swipe dari tepi. */
    private void applyImmersiveEdgeToEdge() {
        WindowCompat.setDecorFitsSystemWindows(getWindow(), false);

        WindowInsetsControllerCompat controller =
                WindowCompat.getInsetsController(getWindow(), getWindow().getDecorView());
        if (controller == null) {
            return;
        }

        controller.setSystemBarsBehavior(
                WindowInsetsControllerCompat.BEHAVIOR_SHOW_TRANSIENT_BARS_BY_SWIPE
        );
        controller.hide(WindowInsetsCompat.Type.systemBars());
    }
}
