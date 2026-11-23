package com.heavyhaul.game;

import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;
import com.google.android.gms.games.GamesSignInClient;
import com.google.android.gms.games.PlayGames;
import com.google.android.gms.games.PlayGamesSdk;
import com.google.android.gms.games.Player;

/**
 * Google Play Games Services v2 sign-in for the web game (src/game/account.js reads it as Capacitor.Plugins.PlayGames).
 * Players are signed in with their Google account automatically when the game starts, with no form and no password;
 * a player who declined can sign in later from the garage. Off until the Play Games project id is set
 * (PLAY_GAMES_APP_ID at build time, see android/app/build.gradle and report.md), so builds without it never crash.
 */
@CapacitorPlugin(name = "PlayGames")
public class PlayGamesPlugin extends Plugin {
    private boolean ready = false;

    @Override
    public void load() {
        String id = getContext().getString(R.string.game_services_project_id);
        if (id == null || id.trim().isEmpty()) return;
        PlayGamesSdk.initialize(getContext());
        ready = true;
    }

    /** Whether the player is signed in, without showing anything: { available, signedIn, playerId, displayName }. */
    @PluginMethod
    public void status(PluginCall call) {
        if (!ready) { unavailable(call); return; }
        GamesSignInClient client = PlayGames.getGamesSignInClient(getActivity());
        client.isAuthenticated().addOnCompleteListener(task -> {
            boolean signedIn = task.isSuccessful() && task.getResult() != null && task.getResult().isAuthenticated();
            if (signedIn) currentPlayer(call); else signedOut(call);
        });
    }

    /** Shows Google's sign-in for a player who is not signed in yet. */
    @PluginMethod
    public void signIn(PluginCall call) {
        if (!ready) { unavailable(call); return; }
        GamesSignInClient client = PlayGames.getGamesSignInClient(getActivity());
        client.signIn().addOnCompleteListener(task -> {
            boolean signedIn = task.isSuccessful() && task.getResult() != null && task.getResult().isAuthenticated();
            if (signedIn) currentPlayer(call); else signedOut(call);
        });
    }

    private void currentPlayer(PluginCall call) {
        PlayGames.getPlayersClient(getActivity()).getCurrentPlayer().addOnCompleteListener(task -> {
            JSObject out = new JSObject();
            out.put("available", true);
            Player player = task.isSuccessful() ? task.getResult() : null;
            out.put("signedIn", player != null);
            if (player != null) {
                out.put("playerId", player.getPlayerId());
                out.put("displayName", player.getDisplayName());
            }
            call.resolve(out);
        });
    }

    private void signedOut(PluginCall call) {
        JSObject out = new JSObject();
        out.put("available", true);
        out.put("signedIn", false);
        call.resolve(out);
    }

    private void unavailable(PluginCall call) {
        JSObject out = new JSObject();
        out.put("available", false);
        out.put("signedIn", false);
        call.resolve(out);
    }
}
