import org.jetbrains.kotlin.konan.properties.loadProperties

plugins {
    id("com.android.library")
    id("kotlin-android")
}

android {
    namespace = "io.nekohasekai.sagernet.plugin"
    compileSdk = 33

    defaultConfig {
        minSdk = 21
    }

    compileOptions {
        sourceCompatibility = JavaVersion.VERSION_17
        targetCompatibility = JavaVersion.VERSION_17
    }
    kotlinOptions {
        jvmTarget = "17"
    }
}
