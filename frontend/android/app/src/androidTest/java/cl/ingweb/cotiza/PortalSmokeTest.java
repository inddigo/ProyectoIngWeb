package cl.ingweb.cotiza;

import static org.junit.Assert.assertEquals;
import static org.junit.Assert.assertTrue;

import androidx.test.core.app.ActivityScenario;
import androidx.test.ext.junit.runners.AndroidJUnit4;
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.TimeUnit;
import java.util.concurrent.atomic.AtomicReference;
import org.junit.Test;
import org.junit.runner.RunWith;

/** Arranque nativo: los flujos con API se verifican por separado en integración. */
@RunWith(AndroidJUnit4.class)
public class PortalSmokeTest {
    @Test
    public void portalRendersInSecureWebView() throws Exception {
        try (ActivityScenario<MainActivity> scenario = ActivityScenario.launch(MainActivity.class)) {
            long deadline = System.currentTimeMillis() + 30000;
            String value = "false";
            while (System.currentTimeMillis() < deadline && !"true".equals(value)) {
                CountDownLatch latch = new CountDownLatch(1);
                AtomicReference<String> result = new AtomicReference<>("false");
                scenario.onActivity(activity -> activity.getBridge().getWebView().evaluateJavascript(
                    "Boolean(window.isSecureContext && document.querySelector('app-customer-portal') && document.body.innerText.includes('Encargos generales'))",
                    response -> { result.set(response); latch.countDown(); }
                ));
                assertTrue("La WebView debe responder", latch.await(3, TimeUnit.SECONDS));
                value = result.get();
                if (!"true".equals(value)) Thread.sleep(250);
            }
            assertEquals("El portal general debe abrir en el contexto HTTPS de Capacitor", "true", value);
        }
    }
}
