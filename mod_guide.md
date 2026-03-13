# APK Patch Guide — Decompile, Modify & Sign

A step-by-step reference for patching an Android APK using apktool and uber-apk-signer.

---

## Tools Required

| Tool | File |
|------|------|
| apktool | `apktool_2.12.1.jar` or `apktool_3.0.1.jar` |
| uber-apk-signer | `uber-apk-signer-1.3.0.jar` |
| Java | must be installed (`java` in PATH) |

---

## Step 1 — Decompile the APK

Unpack the APK into an editable folder (smali code + resources):

```
java -jar apktool_2.12.1.jar d <input.apk> -o <output_folder>
```

Example:
```
java -jar apktool_2.12.1.jar d appstore.apk -o appstore
```

This creates a folder with:
- `smali/` — decompiled Dalvik bytecode (editable)
- `res/` — resources (strings, layouts, drawables)
- `AndroidManifest.xml` — app manifest
- `assets/` — raw asset files
- `lib/` — native `.so` libraries

---

## Step 2 — Make Your Patch

Edit the smali files or resources inside the output folder.

Common patch locations:
- `smali/` — logic/behaviour changes (method calls, conditions, return values)
- `res/values/strings.xml` — UI string changes
- `AndroidManifest.xml` — permissions, activity flags

Example (device validation bypass in `smali/j0/d.smali`):
- Located the `stb=4` (abnormal device) branch in the auth response handler
- Replaced the error toast call with a call to `MainActivity.k()` (the success path)
- Applied the same fix in both code paths (the file had two parallel handlers)

---

## Step 3 — Rebuild the APK

Recompile the patched folder back into an APK:

```
java -jar apktool_2.12.1.jar b <patched_folder> -o <output.apk>
```

Example:
```
java -jar apktool_2.12.1.jar b appstore -o appstore_patched.apk
```

---

## Step 4 — Sign the APK

Android requires all APKs to be signed before installation. Use uber-apk-signer (auto-generates a debug keystore if none is provided):

```
java -jar uber-apk-signer-1.3.0.jar --apks <patched.apk>
```

Example:
```
java -jar uber-apk-signer-1.3.0.jar --apks appstore_patched.apk
```

Output file will be named:
```
appstore_patched-aligned-debugSigned.apk
```

The signer automatically:
1. Runs `zipalign` (optimizes APK memory alignment)
2. Signs with v1, v2, v3 signature schemes
3. Verifies the signature

---

## Step 5 — Verify (Optional)

Check the output APK's native library architecture:

```
unzip -l <signed.apk> | grep "^.*lib/"
```

Example output:
```
lib/armeabi-v7a/libBugly_Native.so   -> ARMv7 (32-bit)
lib/arm64-v8a/libBugly_Native.so     -> ARMv8 (64-bit)
```

---

## Bonus — Sign a Folder of APKs (Split APK / XAPK)

If the app is a split APK (multiple `.apk` files), sign the whole folder at once with an output directory:

```
java -jar uber-apk-signer-1.3.0.jar \
  --apks <folder_with_apks>/ \
  --out <signed_output_folder>/
```

Example:
```
java -jar uber-apk-signer-1.3.0.jar \
  --apks /home/hosan/Downloads/android_mod/GP_Master_Rx_25_Mod/ \
  --out /home/hosan/Downloads/android_mod/GP_Master_Rx_25_Signed/
```

---

## Quick Reference

```
# 1. Decompile
java -jar apktool_2.12.1.jar d input.apk -o output_folder

# 2. Edit smali/res files as needed

# 3. Rebuild
java -jar apktool_2.12.1.jar b output_folder -o patched.apk

# 4. Sign
java -jar uber-apk-signer-1.3.0.jar --apks patched.apk

# 5. Install (via adb)
adb install patched-aligned-debugSigned.apk
```