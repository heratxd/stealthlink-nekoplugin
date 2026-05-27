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
        sourceCompatibility = JavaVersion.VERSION_1_8
        targetCompatibility = JavaVersion.VERSION_1_8
    }
    kotlinOptions {
        jvmTarget = "1.8"
    }
}
