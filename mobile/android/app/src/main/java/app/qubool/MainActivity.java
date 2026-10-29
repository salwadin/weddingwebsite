package app.qubool;

import com.getcapacitor.BridgeActivity;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginLoadException;
import com.getcapacitor.PluginManager;
import java.util.ArrayList;
import java.util.List;

public class MainActivity extends BridgeActivity {

    // Push notifications need Firebase, which is configured by app/google-services.json
    // (mobile/README.md). Without that file the push plugin would crash the app on
    // register(), so it's left out and the site sees that push isn't available.
    @Override
    protected void load() {
        boolean firebase = getResources().getIdentifier("google_app_id", "string", getPackageName()) != 0;
        if (!firebase) {
            List<Class<? extends Plugin>> plugins = new ArrayList<>();
            try {
                for (Class<? extends Plugin> p : new PluginManager(getAssets()).loadPluginClasses()) {
                    if (!p.getName().equals("com.capacitorjs.plugins.pushnotifications.PushNotificationsPlugin")) plugins.add(p);
                }
            } catch (PluginLoadException ignored) {}
            bridgeBuilder.setPlugins(plugins);
        }
        super.load();
    }
}
