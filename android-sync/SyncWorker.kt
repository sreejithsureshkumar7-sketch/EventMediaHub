package com.example.eventmediahub.sync

import android.content.Context
import androidx.work.CoroutineWorker
import androidx.work.WorkerParameters

/**
 * Architecture sample.
 *
 * Production implementation should:
 * 1. Read a queued MediaStore content URI from Room.
 * 2. Confirm the user still has an active event.
 * 3. Stream the file into Supabase Storage.
 * 4. Insert public.media.
 * 5. Mark the Room row uploaded.
 *
 * Never store a service-role key in the Android APK.
 * Use the user's Supabase Auth session/token.
 */
class SyncWorker(
    appContext: Context,
    params: WorkerParameters
) : CoroutineWorker(appContext, params) {

    override suspend fun doWork(): Result {
        return try {
            // TODO:
            // val queueItem = room.uploadQueue().next()
            // val session = supabase.auth.currentSessionOrNull()
            // val event = room.activeEvent()
            // validate event + permissions
            // storage.upload(path = "${event.id}/${session.user.id}/${uuid}.mp4", bytes)
            // database.from("media").insert(...)
            // room.uploadQueue().markUploaded(queueItem.id)

            Result.success()
        } catch (e: java.io.IOException) {
            Result.retry()
        } catch (e: Exception) {
            Result.failure()
        }
    }
}
