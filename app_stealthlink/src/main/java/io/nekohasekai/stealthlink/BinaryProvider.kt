package io.nekohasekai.stealthlink

import android.net.Uri
import android.os.ParcelFileDescriptor
import io.nekohasekai.sagernet.plugin.NativePluginProvider
import io.nekohasekai.sagernet.plugin.PathProvider
import java.io.File
import java.io.FileNotFoundException

/**
 * StealthLink Plugin — ContentProvider, который NekoBox использует для получения
 * пути к бинарнику протокола StealthLink.
 *
 * Бинарник хранится как libstealthlink.so в jniLibs/ и при установке APK
 * Android извлекает его в nativeLibraryDir (требует extractNativeLibs=true).
 *
 * NekoBox запускает бинарник с аргументами:
 *   libstealthlink.so -server <addr> -psk <key> -sni <sni> -socks :<port> [...]
 */
class BinaryProvider : NativePluginProvider() {

    override fun populateFiles(provider: PathProvider) {
        // Регистрируем путь к бинарнику с правами rwxr-xr-x (0755)
        provider.addPath("io.nekohasekai.stealthlink", 0b111101101)
    }

    override fun getExecutable(): String =
        context!!.applicationInfo.nativeLibraryDir + "/libstealthlink.so"

    override fun openFile(uri: Uri): ParcelFileDescriptor = when (uri.path) {
        "/io.nekohasekai.stealthlink" -> ParcelFileDescriptor.open(
            File(getExecutable()),
            ParcelFileDescriptor.MODE_READ_ONLY
        )
        else -> throw FileNotFoundException("Unknown path: ${uri.path}")
    }
}
