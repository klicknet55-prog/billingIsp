package id.tunnelhost.netmanage.portal;

import android.webkit.WebResourceError;
import android.webkit.WebResourceRequest;
import android.webkit.WebResourceResponse;
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
        if (request.isForMainFrame() && isBenignLoadFailure(error)) {
            return;
        }
        super.onReceivedError(view, request, error);
    }

    @Override
    public void onReceivedHttpError(
            WebView view,
            WebResourceRequest request,
            WebResourceResponse errorResponse) {
        if (request.isForMainFrame() && errorResponse != null && errorResponse.getStatusCode() == 0) {
            return;
        }
        super.onReceivedHttpError(view, request, errorResponse);
    }

    private static boolean isBenignLoadFailure(WebResourceError error) {
        if (error == null) return false;
        CharSequence desc = error.getDescription();
        if (desc != null) {
            String upper = desc.toString().toUpperCase();
            if (upper.contains("ERR_ABORTED") || upper.contains("ERR_FAILED")) {
                return true;
            }
        }
        return error.getErrorCode() == WebViewClient.ERROR_UNKNOWN
                && desc != null
                && desc.toString().toUpperCase().contains("ABORT");
    }
}
