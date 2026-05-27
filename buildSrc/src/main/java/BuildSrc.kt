import com.android.build.gradle.BaseExtension
import com.android.build.gradle.internal.api.BaseVariantOutputImpl
import org.gradle.api.JavaVersion
import org.gradle.api.Project
import org.gradle.api.plugins.ExtensionAware
import org.gradle.kotlin.dsl.getByName
import org.gradle.util.GUtil.loadProperties
import org.jetbrains.kotlin.gradle.dsl.KotlinJvmOptions
import com.android.build.gradle.AbstractAppExtension
import java.io.File

private val Project.android get() = extensions.getByName<BaseExtension>("android")
private lateinit var flavor: String

private val javaVersion = JavaVersion.VERSION_1_8

fun Project.requireFlavor(): String {
    if (::flavor.isInitialized) return flavor
    if (gradle.startParameter.taskNames.isNotEmpty()) {
        val taskName = gradle.startParameter.taskNames[0]
        when {
            taskName.contains("assemble") -> {
                flavor = taskName.substringAfter("assemble")
                return flavor
            }
            taskName.contains("install") -> {
                flavor = taskName.substringAfter("install")
                return flavor
            }
            taskName.contains("publish") -> {
                flavor = taskName.substringAfter("publish").substringBefore("Bundle")
                return flavor
            }
        }
    }
    flavor = ""
    return flavor
}

fun Project.requireLocalProperties(): java.util.Properties? {
    if (project.rootProject.file("local.properties").exists()) {
        return loadProperties(rootProject.file("local.properties"))
    }
    return null
}

fun Project.setupCommon() {
    dependencies.apply {
        add("implementation", project(":common"))
    }

    android.apply {
        compileSdkVersion(34)

        defaultConfig.apply {
            minSdk = 21
            targetSdk = 34
        }

        compileOptions {
            sourceCompatibility = javaVersion
            targetCompatibility = javaVersion
        }

        (android as ExtensionAware).extensions.getByName<KotlinJvmOptions>("kotlinOptions").apply {
            jvmTarget = javaVersion.toString()
        }

        sourceSets.getByName("main") {
            jniLibs.srcDir("libs")
        }

        splits.abi {
            isEnable = true
            isUniversalApk = false
        }

        (this as? AbstractAppExtension)?.apply {
            applicationVariants.all {
                outputs.all {
                    this as BaseVariantOutputImpl
                    outputFileName =
                        outputFileName.replace(project.name, "${project.name}-plugin-$versionName")
                            .replace("-release", "")
                            .replace("-debug", "-debug")
                            .replace("app_", "")
                }
            }
        }
    }
}

fun Project.setupRelease() {
    val lp = requireLocalProperties() ?: return

    val keystorePwd = lp.getProperty("KEYSTORE_PASS") ?: System.getenv("KEYSTORE_PASS") ?: return
    val alias = lp.getProperty("ALIAS_NAME") ?: System.getenv("ALIAS_NAME") ?: return
    val pwd = lp.getProperty("ALIAS_PASS") ?: System.getenv("ALIAS_PASS") ?: return

    android.apply {
        signingConfigs {
            create("release") {
                storeFile = rootProject.file("stealthlink.jks")
                storePassword = keystorePwd
                keyAlias = alias
                keyPassword = pwd
            }
        }

        buildTypes {
            getByName("release") {
                proguardFiles(
                    getDefaultProguardFile("proguard-android-optimize.txt"),
                )
                isMinifyEnabled = true
                signingConfig = signingConfigs.findByName("release")
            }
        }
    }
}

fun Project.setupAll() {
    setupCommon()
    setupRelease()
}
