import java.util.Properties

plugins {
    id("com.android.application")
    id("kotlin-android")
    // The Flutter Gradle Plugin must be applied after the Android and Kotlin Gradle plugins.
    id("dev.flutter.flutter-gradle-plugin")
}

android {
    namespace = "ir.rayantamaddonjahangostar.app"
    compileSdk = flutter.compileSdkVersion
    ndkVersion = flutter.ndkVersion

    compileOptions {
        sourceCompatibility = JavaVersion.VERSION_17
        targetCompatibility = JavaVersion.VERSION_17
    }

    kotlinOptions {
        jvmTarget = JavaVersion.VERSION_17.toString()
    }

    defaultConfig {
        // Permanent once the app is published: the stores identify the app by it.
        applicationId = "ir.rayantamaddonjahangostar.app"
        // You can update the following values to match your application needs.
        // For more information, see: https://flutter.dev/to/review-gradle-config.
        minSdk = flutter.minSdkVersion
        targetSdk = flutter.targetSdkVersion
        versionCode = flutter.versionCode
        versionName = flutter.versionName
    }

    /*
     * Release signing reads android/key.properties (storeFile, storePassword,
     * keyAlias, keyPassword), which stays out of git along with the keystore.
     * Without it a release build falls back to the debug key, so
     * `flutter run --release` still works on a machine that has no keystore,
     * but nothing signed that way can be uploaded to a store.
     */
    val keystoreFile = rootProject.file("key.properties")
    val keystore = Properties().apply {
        if (keystoreFile.exists()) keystoreFile.inputStream().use { load(it) }
    }

    signingConfigs {
        if (keystoreFile.exists()) {
            create("release") {
                storeFile = file(keystore.getProperty("storeFile"))
                storePassword = keystore.getProperty("storePassword")
                keyAlias = keystore.getProperty("keyAlias")
                keyPassword = keystore.getProperty("keyPassword")
            }
        }
    }

    /*
     * Store the native libraries (the Flutter engine and the compiled app,
     * ~22 MB together) compressed. Android's default leaves them raw so they
     * load in place, which nearly doubles the download; on metered mobile data
     * the smaller APK matters more than the few MB Android unpacks on install.
     */
    packaging {
        jniLibs {
            useLegacyPackaging = true
        }
    }

    buildTypes {
        release {
            signingConfig = signingConfigs.findByName("release")
                ?: signingConfigs.getByName("debug")
        }
    }
}

flutter {
    source = "../.."
}
