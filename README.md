
# BOB World - Android Application (Powered by Next.js & Capacitor)

This is a Next.js starter project adapted to function as the "BOB World" Android application, built using Capacitor to bridge web technologies to a native Android experience.

## Primary Target: Android

This project is developed with Android as the primary target platform.

## Getting Started (Local Development)

1.  **Prerequisites:**
    *   Node.js (LTS version recommended, e.g., v18, v20)
    *   npm (comes with Node.js)
    *   Android Studio (latest stable version recommended)
    *   Java Development Kit (JDK 17 or JDK 21 recommended for modern Android builds). Ensure `JAVA_HOME` environment variable is set correctly.
    *   Ensure `ANDROID_HOME` (or `ANDROID_SDK_ROOT`) environment variable is set to your Android SDK location.

2.  **Install Dependencies:**
    Open a terminal in the project's root directory and run:
    ```bash
    npm install
    ```

3.  **Run Web Development Server (for UI development):**
    For developing the web part of the application:
    ```bash
    npm run dev
    ```
    This will typically start the Next.js development server on `http://localhost:9002`.

---

## Building a Debug APK (for testing)

Use this method for development, testing, and installing the app on your local devices.

1.  **Build Web Assets:**
    Create a production-ready static build of your Next.js application.
    ```bash
    npm run build
    ```

2.  **Sync with Capacitor:**
    Copy the web assets to your Android project and update Capacitor plugins.
    ```bash
    npx cap sync android
    ```

3.  **Navigate to the Android Directory:**
    ```bash
    cd android
    ```
    **IMPORTANT:** You must run the next command from inside the `android` directory, otherwise you will get a "command not recognized" error.

4.  **Run the Gradle Build:**
    This command compiles the native code and packages it into an unsigned debug APK.
    
    *   **On Windows (Command Prompt/PowerShell):**
        ```bash
        .\\gradlew.bat assembleDebug
        ```
    
    *   **On macOS/Linux:**
        ```bash
        ./gradlew assembleDebug
        ```
        *(If you get permission errors on macOS/Linux, run `chmod +x ./gradlew` first).*

5.  **Locate Your Debug APK:**
    The generated APK file will be located at:
    `android/app/build/outputs/apk/debug/app-debug.apk`

---

## Building a Release APK (for production)

Follow these steps to create a signed release APK, which is required for distribution (e.g., on the Google Play Store or for direct installation).

### Step 1: Generate a Private Signing Key
You only need to do this once.

1.  Open your terminal and run the following `keytool` command. This tool is part of the Java Development Kit (JDK).
    ```bash
    keytool -genkey -v -keystore my-release-key.keystore -alias my-key-alias -keyalg RSA -keysize 2048 -validity 10000
    ```
2.  It will prompt you for a **keystore password**, and then for your **key password**. Remember these passwords! You will also be asked for your name, organization, etc.
3.  This command creates a file named `my-release-key.keystore` in your current directory.
4.  **IMPORTANT:** Move this `my-release-key.keystore` file into the `android/app` directory of your project. **Do not commit this key to version control (Git).** Add it to your `.gitignore` file.

### Step 2: Configure Gradle for Signing

1.  Create a file named `keystore.properties` inside the `android` directory (alongside `build.gradle` and `settings.gradle`).
2.  Add the following content to `keystore.properties`, replacing the placeholder values with your actual passwords:
    ```properties
    myApp.keystore.password=YOUR_KEYSTORE_PASSWORD
    myApp.key.alias=my-key-alias
    myApp.key.password=YOUR_KEY_PASSWORD
    ```
    **IMPORTANT:** Do not commit `keystore.properties` to version control. Add it to `.gitignore`.

2.  Open the `android/app/build.gradle` file and add the following code inside the `android { ... }` block, right after the `buildTypes` section. This tells Gradle how to find and use your key.

    *(This step is often done for you, but it's good to verify it exists.)*

    ```groovy
    // ... inside android { ... } block in android/app/build.gradle

    signingConfigs {
        release {
            if (project.hasProperty('myApp.keystore.password')) {
                storeFile file('my-release-key.keystore')
                storePassword property('myApp.keystore.password')
                keyAlias property('myApp.key.alias')
                keyPassword property('myApp.key.password')
            }
        }
    }

    buildTypes {
        release {
            // ... existing release config
            signingConfig signingConfigs.release
        }
    }
    ```

### Step 3: Build the Release APK

1.  **Build Web Assets & Sync (if you have new changes):**
    ```bash
    npm run build
    npx cap sync android
    ```

2.  **Navigate to the Android Directory:**
    ```bash
    cd android
    ```
    **IMPORTANT:** You must run the next command from inside the `android` directory.

3.  **Run the Gradle Release Build:**
    *   **On Windows:**
        ```bash
        .\\gradlew.bat assembleRelease
        ```
    *   **On macOS/Linux:**
        ```bash
        ./gradlew assembleRelease
        ```

4.  **Locate Your Signed Release APK:**
    The generated APK file will be at:
    `android/app/build/outputs/apk/release/app-release.apk`

This `app-release.apk` is the final, signed file ready for distribution.

---

## Troubleshooting

### 'gradlew' command not found
If you run `cd android` and then try `.\gradlew.bat assembleDebug` (on Windows) or `./gradlew assembleDebug` (on Mac/Linux) and get a "command not recognized" or "file not found" error, it likely means the Gradle wrapper files are missing from your `android` directory.

You can fix this by regenerating the Android project. Run these commands from the **root directory of your project** (NOT from inside the `android` folder):

1.  **Remove the old android directory:**
    ```bash
    npx rimraf android 
    ```
    *(If you don't have rimraf, you can manually delete the `android` folder)*.

2.  **Re-create the Android project:**
    ```bash
    npx cap add android
    ```

This will create a fresh `android` folder with all the necessary files. After this, you can try the build process again from the beginning (`npm run build`, `npx cap sync android`, etc.).

### Which Folder to Open in Android Studio
After running the commands above (or at any time), you can open your native Android project in Android Studio.

When Android Studio prompts you to open a project, navigate to your project's root and **select the `android` folder**. Android Studio will recognize it as a Gradle project and sync all the dependencies. This is the recommended way to run and debug your app on an emulator or physical device.
