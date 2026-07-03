package id.tunnelhost.netmanage.portal;

import android.content.Intent;
import android.os.Bundle;
import androidx.core.view.WindowCompat;
import androidx.core.view.WindowInsetsCompat;
import androidx.core.view.WindowInsetsControllerCompat;
import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {

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
