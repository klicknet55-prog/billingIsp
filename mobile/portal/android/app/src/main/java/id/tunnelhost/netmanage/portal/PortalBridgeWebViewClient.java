package id.tunnelhost.netmanage.portal;

import android.webkit.WebResourceError;
import android.webkit.WebResourceRequest;
import android.webkit.WebView;
import android.webkit.WebViewClient;
import com.getcapacitor.Bridge;
import com.getcapacitor.BridgeWebViewClient;

/**
 * Abaikan ERR_ABORTED pada main frame — navigasi dibatalkan saat redirect/deep link
 * (WebView menampilkan "This page couldn't load" meski halaman berikutnya sukses).
 */
public class PortalBridgeWebViewClient extends BridgeWebViewClient {

    public PortalBridgeWebViewClient(Bridge bridge) {
        super(bridge);
    }

    @Override
    public void onReceivedError(WebView view, WebResourceRequest request, WebResourceError error) {
        if (request.isForMainFrame() && isAbortedNavigation(error)) {
            return;
        }
        super.onReceivedError(view, request, error);
    }

    private static boolean isAbortedNavigation(WebResourceError error) {
        if (error == null) return false;
        CharSequence desc = error.getDescription();
        if (desc != null && desc.toString().toUpperCase().contains("ERR_ABORTED")) {
            return true;
        }
        // Beberapa WebView Android memakai kode -1 untuk load dibatalkan.
        return error.getErrorCode() == WebViewClient.ERROR_UNKNOWN
                && desc != null
                && desc.toString().toUpperCase().contains("ABORT");
    }
}
