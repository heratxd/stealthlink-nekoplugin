plugins {
    id("com.android.application")
    id("org.jetbrains.kotlin.android")
}

setupAll()

android {
    namespace = "io.nekohasekai.stealthlink"
    defaultConfig {
        applicationId = "io.nekohasekai.stealthlink"
        versionCode = 1
        versionName = "0.1.0"
    }
    packaging {
        jniLibs {
            useLegacyPackaging = true
        }
    }
}
