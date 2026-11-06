# Guide: Handling PDF Downloads on Android with Capacitor

This guide explains how to correctly implement file downloads in your Capacitor-based Android application. The web-based approach of creating a link and clicking it programmatically will not work reliably in an Android WebView.

The solution involves using Capacitor's official **Filesystem plugin** to bridge the gap between your web code and the native Android file system.

## 1. Filesystem Plugin Installation

The necessary plugin has already been added to your project's `package.json`:

```json
"@capacitor/filesystem": "^7.0.1"
```

After the changes are applied, Capacitor will automatically sync this new dependency with your native Android project the next time you run `npx cap sync android`.

## 2. Web Code Implementation (Completed)

The download logic in `src/app/account-statement/page.tsx` has been updated to use the Filesystem plugin. Here's a summary of how it works:

```typescript
import { Filesystem, Directory } from '@capacitor/filesystem';
import { isPlatform } from '@capacitor/core';

const handleDownload = async () => {
  // ... (get PDF data as base64)

  if (isPlatform('android')) {
    // If running on Android, use the native Filesystem plugin
    try {
      await Filesystem.writeFile({
        path: fileName,
        data: base64Data, // The PDF content as a base64 string
        directory: Directory.Downloads, // Saves to the public "Downloads" folder
      });
      // Notify user of success
    } catch (e) {
      // Handle errors (e.g., permission denied)
    }
  } else {
    // If running on the web, use the traditional browser download method as a fallback.
    // ... (existing <a> tag logic)
  }
};
```
This code intelligently detects the platform. On Android, it uses the native API; on the web, it uses the browser's download capability.

## 3. Android Native Configuration

Capacitor's Filesystem plugin is designed to handle modern Android permissions and storage APIs (like Scoped Storage and MediaStore) for you.

### Permissions

Your `android/app/src/main/AndroidManifest.xml` file already includes the necessary permissions from a previous step:

```xml
<uses-permission android:name="android.permission.READ_EXTERNAL_STORAGE" />
<uses-permission android:name="android.permission.WRITE_EXTERNAL_STORAGE" />
```

- For **Android 10 (API 29) and above**, writing to the public `Downloads` directory is handled by the plugin using the MediaStore API, which does not require these legacy storage permissions.
- For **Android 9 (API 28) and below**, these permissions are required, and they are already present in your manifest.

**No further changes to your `AndroidManifest.xml` are required.**

## 4. Syncing Your Project

After these changes are applied, you must sync your Capacitor project to update the native Android side.

Run this command from your project's root directory:
```bash
npx cap sync android
```

After syncing, you can rebuild your APK. The download functionality should now work correctly on your Android device.
