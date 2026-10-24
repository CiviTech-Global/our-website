package ir.rayantamaddonjahangostar.app

import android.content.ActivityNotFoundException
import android.content.Intent
import androidx.core.content.FileProvider
import io.flutter.embedding.android.FlutterActivity
import io.flutter.embedding.engine.FlutterEngine
import io.flutter.plugin.common.MethodChannel
import java.io.File

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
}
