package ir.rayantamaddonjahangostar.app

import android.content.ActivityNotFoundException
import android.content.Intent
import android.graphics.Bitmap
import android.graphics.BitmapFactory
import android.graphics.Canvas
import android.graphics.Color
import android.graphics.Matrix
import android.media.ExifInterface
import android.os.Build
import androidx.core.content.FileProvider
import io.flutter.embedding.android.FlutterActivity
import io.flutter.embedding.engine.FlutterEngine
import io.flutter.plugin.common.MethodChannel
import java.io.ByteArrayOutputStream
import java.io.File
import kotlin.math.max
import kotlin.math.roundToInt

class MainActivity : FlutterActivity() {
    override fun configureFlutterEngine(flutterEngine: FlutterEngine) {
        super.configureFlutterEngine(flutterEngine)
        // The last file handed out (a CV) is not kept past the session that
        // opened it.
        File(cacheDir, "shared").deleteRecursively()
        MethodChannel(flutterEngine.dartExecutor.binaryMessenger, "ir.rayantamaddonjahangostar.app/files")
            .setMethodCallHandler { call, result ->
                when (call.method) {
                    "open" -> result.success(
                        open(
                            call.argument<ByteArray>("bytes")!!,
                            call.argument<String>("name")!!,
                            call.argument<String>("mimeType")!!,
                        ),
                    )
                    // Decoding a phone photo takes a moment: off the main
                    // thread, so the screen keeps moving, and the answer back
                    // on it, where the channel expects it.
                    "prepareImage" -> {
                        val path = call.argument<String>("path")!!
                        Thread {
                            val prepared = runCatching { prepareImage(path) }.getOrNull()
                            runOnUiThread {
                                when (prepared) {
                                    null -> result.error("unreadable", null, null)
                                    TOO_LARGE -> result.error("too_large", null, null)
                                    else -> result.success(prepared)
                                }
                            }
                        }.start()
                    }
                    else -> result.notImplemented()
                }
            }
    }

    /**
     * Hands a file the app downloaded to whatever on the phone reads it.
     *
     * Written to the cache's shared/ folder, the only place the FileProvider
     * exposes, and only to the app picked, for reading. The folder is emptied
     * first: a CV is personal, and only the one being read needs to be there.
     * False when nothing on the phone opens that kind of file.
     */
    private fun open(bytes: ByteArray, name: String, mimeType: String): Boolean {
        val folder = File(cacheDir, "shared")
        folder.deleteRecursively()
        folder.mkdirs()
        // The file's own name, so the viewer shows it, without any path in it.
        val safe = name.replace(Regex("[\\\\/:*?\"<>|]"), "_").ifBlank { "file" }
        val file = File(folder, safe)
        file.writeBytes(bytes)
        val uri = FileProvider.getUriForFile(this, "$packageName.shared", file)
        val view = Intent(Intent.ACTION_VIEW)
            .setDataAndType(uri, mimeType)
            .addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION)
        return try {
            startActivity(Intent.createChooser(view, null))
            true
        } catch (_: ActivityNotFoundException) {
            false
        }
    }

    /**
     * A picture made small before it is uploaded, by the web's rules
     * (civitechglobal-web/src/lib/prepareImage.ts): the longest edge at most
     * 1600 px, WebP, the quality stepped down until it fits the server's
     * 300 KB, on white where the original was transparent. Turned upright
     * first, as the camera meant it.
     *
     * Null when the file is not a picture Android can read; TOO_LARGE when
     * even the lowest quality is over the limit.
     */
    private fun prepareImage(path: String): Map<String, Any>? {
        val bounds = BitmapFactory.Options().apply { inJustDecodeBounds = true }
        BitmapFactory.decodeFile(path, bounds)
        if (bounds.outWidth <= 0 || bounds.outHeight <= 0) return null

        // Decoded at the smallest power-of-two step that still covers the
        // final size: a 4000 px photo never sits whole in memory.
        var sample = 1
        while (max(bounds.outWidth, bounds.outHeight) / (sample * 2) >= MAX_EDGE) sample *= 2
        val decoded = BitmapFactory.decodeFile(path, BitmapFactory.Options().apply { inSampleSize = sample })
            ?: return null

        val turn = Matrix().apply {
            when (ExifInterface(path).getAttributeInt(ExifInterface.TAG_ORIENTATION, ExifInterface.ORIENTATION_NORMAL)) {
                ExifInterface.ORIENTATION_ROTATE_90 -> postRotate(90f)
                ExifInterface.ORIENTATION_ROTATE_180 -> postRotate(180f)
                ExifInterface.ORIENTATION_ROTATE_270 -> postRotate(270f)
                ExifInterface.ORIENTATION_FLIP_HORIZONTAL -> postScale(-1f, 1f)
                ExifInterface.ORIENTATION_FLIP_VERTICAL -> postScale(1f, -1f)
            }
        }
        val upright = Bitmap.createBitmap(decoded, 0, 0, decoded.width, decoded.height, turn, true)

        val longest = max(upright.width, upright.height)
        val ratio = if (longest > MAX_EDGE) MAX_EDGE.toFloat() / longest else 1f
        // Never rounded to nothing: a 3000×2 strip is odd, not an error.
        val width = max(1, (upright.width * ratio).roundToInt())
        val height = max(1, (upright.height * ratio).roundToInt())
        val scaled = Bitmap.createScaledBitmap(upright, width, height, true)

        val flat = Bitmap.createBitmap(width, height, Bitmap.Config.ARGB_8888)
        Canvas(flat).apply {
            drawColor(Color.WHITE)
            drawBitmap(scaled, 0f, 0f, null)
        }

        @Suppress("DEPRECATION")
        val format = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.R) {
            Bitmap.CompressFormat.WEBP_LOSSY
        } else {
            Bitmap.CompressFormat.WEBP
        }
        for (quality in QUALITY_STEPS) {
            val out = ByteArrayOutputStream()
            flat.compress(format, quality, out)
            if (out.size() <= MAX_IMAGE_BYTES) {
                return mapOf("bytes" to out.toByteArray(), "width" to width, "height" to height)
            }
        }
        return TOO_LARGE
    }

    private companion object {
        const val MAX_EDGE = 1600
        const val MAX_IMAGE_BYTES = 300 * 1024
        val QUALITY_STEPS = intArrayOf(82, 72, 62, 50, 40)

        /** Stands for "over the limit at every quality", apart from "unreadable". */
        val TOO_LARGE: Map<String, Any> = emptyMap()
    }
}
