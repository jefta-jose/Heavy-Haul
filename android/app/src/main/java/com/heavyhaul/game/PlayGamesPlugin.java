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
import com.google.android.gms.games.SnapshotsClient;
import com.google.android.gms.games.snapshot.Snapshot;
import com.google.android.gms.games.snapshot.SnapshotMetadataChange;
import android.content.Intent;
import java.nio.charset.StandardCharsets;

/**
 * Google Play Games Services v2 sign-in for the web game (src/game/account.js reads it as Capacitor.Plugins.PlayGames).
 * Players are signed in with their Google account automatically when the game starts, with no form and no password;
 * a player who declined can sign in later from the garage. Off until the Play Games project id is set
 * (PLAY_GAMES_APP_ID at build time, see android/app/build.gradle and deployment-step-by-step.md), so builds without it never crash.
 *
 * Cloud save (src/game/cloud-save.js): the player's progress is one Saved Games snapshot on their Google account, so a
 * reinstall or a new phone picks up where they left off. Needs "Saved Games" switched on in Play Console.
 *
 * Leaderboards and achievements (src/game/achievements.js): the fastest delivery on each map, and achievements from the
 * game's own counters. Their ids are made in Play Console and listed in src/game-config.js.
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

    private static final String SAVE_NAME = "heavy-haul-progress";

    /** Reads the cloud save: { available, data } where data is the saved text ("" when there is none yet). */
    @PluginMethod
    public void loadSave(PluginCall call) {
        if (!ready) { unavailable(call); return; }
        SnapshotsClient snapshots = PlayGames.getSnapshotsClient(getActivity());
        snapshots.open(SAVE_NAME, true, SnapshotsClient.RESOLUTION_POLICY_MOST_RECENTLY_MODIFIED).addOnCompleteListener(task -> {
            if (!task.isSuccessful() || task.getResult() == null || task.getResult().isConflict()) { failed(call, task.getException()); return; }
            Snapshot snapshot = task.getResult().getData();
            try {
                byte[] bytes = snapshot.getSnapshotContents().readFully();
                JSObject out = new JSObject();
                out.put("available", true);
                out.put("data", bytes == null ? "" : new String(bytes, StandardCharsets.UTF_8));
                call.resolve(out);
            } catch (Exception e) {
                failed(call, e);
            } finally {
                snapshots.discardAndClose(snapshot);
            }
        });
    }

    /** Writes the cloud save: { data } is the whole saved text; resolves { available, saved }. */
    @PluginMethod
    public void writeSave(PluginCall call) {
        if (!ready) { unavailable(call); return; }
        String data = call.getString("data", "");
        String description = call.getString("description", "Heavy Haul progress");
        SnapshotsClient snapshots = PlayGames.getSnapshotsClient(getActivity());
        snapshots.open(SAVE_NAME, true, SnapshotsClient.RESOLUTION_POLICY_MOST_RECENTLY_MODIFIED).addOnCompleteListener(task -> {
            if (!task.isSuccessful() || task.getResult() == null || task.getResult().isConflict()) { failed(call, task.getException()); return; }
            Snapshot snapshot = task.getResult().getData();
            snapshot.getSnapshotContents().writeBytes(data.getBytes(StandardCharsets.UTF_8));
            SnapshotMetadataChange change = new SnapshotMetadataChange.Builder().setDescription(description).build();
            snapshots.commitAndClose(snapshot, change).addOnCompleteListener(done -> {
                if (!done.isSuccessful()) { failed(call, done.getException()); return; }
                JSObject out = new JSObject();
                out.put("available", true);
                out.put("saved", true);
                call.resolve(out);
            });
        });
    }

    private static final int RC_PLAY_UI = 9004;

    /** { id, score }: a score on a leaderboard (Play keeps the player's best). */
    @PluginMethod
    public void submitScore(PluginCall call) {
        if (!ready) { unavailable(call); return; }
        String id = call.getString("id", "");
        Long score = call.getLong("score", 0L);
        if (!id.isEmpty()) PlayGames.getLeaderboardsClient(getActivity()).submitScore(id, score == null ? 0L : score);
        done(call);
    }

    /** { id }: unlocks a one-step achievement. */
    @PluginMethod
    public void unlockAchievement(PluginCall call) {
        if (!ready) { unavailable(call); return; }
        String id = call.getString("id", "");
        if (!id.isEmpty()) PlayGames.getAchievementsClient(getActivity()).unlock(id);
        done(call);
    }

    /** { id, steps }: an incremental achievement's progress (never goes down). */
    @PluginMethod
    public void setAchievementSteps(PluginCall call) {
        if (!ready) { unavailable(call); return; }
        String id = call.getString("id", "");
        Integer steps = call.getInt("steps", 0);
        if (!id.isEmpty() && steps != null && steps > 0) PlayGames.getAchievementsClient(getActivity()).setSteps(id, steps);
        done(call);
    }

    /** Google's screen of every leaderboard. */
    @PluginMethod
    public void showLeaderboards(PluginCall call) {
        if (!ready) { unavailable(call); return; }
        PlayGames.getLeaderboardsClient(getActivity()).getAllLeaderboardsIntent().addOnSuccessListener(this::showPlayUi);
        done(call);
    }

    /** Google's achievements screen. */
    @PluginMethod
    public void showAchievements(PluginCall call) {
        if (!ready) { unavailable(call); return; }
        PlayGames.getAchievementsClient(getActivity()).getAchievementsIntent().addOnSuccessListener(this::showPlayUi);
        done(call);
    }

    private void showPlayUi(Intent intent) { getActivity().startActivityForResult(intent, RC_PLAY_UI); }

    private void done(PluginCall call) {
        JSObject out = new JSObject();
        out.put("available", true);
        call.resolve(out);
    }

    // a signed-out player, Saved Games off in Play Console, or no network: the game keeps its save on the phone
    private void failed(PluginCall call, Exception e) {
        JSObject out = new JSObject();
        out.put("available", false);
        out.put("error", e == null ? "unavailable" : String.valueOf(e.getMessage()));
        call.resolve(out);
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
