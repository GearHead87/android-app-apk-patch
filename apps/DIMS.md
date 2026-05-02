# DIMS (com.twgbd.dims)

## Identity

| Field | Value |
|--------|--------|
| Package | `com.twgbd.dims` |
| Version (analyzed) | `2.3.13` (versionCode 216) |
| Source artifact | `apps/DIMS_2.3.13_APKPure.apk` |

## Goal

**Unlock premium** — force premium experience and suppress “Get premium” / subscription purchase UI without valid server-side entitlements.

## Analysis notes

- JADX (optional): `apps/DIMS_2.3.13/decompiled_jadx/` — use `XDG_CONFIG_HOME` / `XDG_CACHE_HOME` under the project if the default config dir is not writable.
- Apktool project: `apps/DIMS_2.3.13/decompiled_apktool/`
- Central gate: `com.twgbd.common.CommonUtilsKt.isPremiumViewEnabled(Context)` (reads `DPPrefManager`, prefs `DIMS_PLUS`).
- More tab (`DimsMoreFragment`) also uses `getIS_PREMIUM_ACTIVE()` and `getPREMIUM_VERSION_SWITCH_STATUS()` to show or hide purchase CTAs.

---

## Manual patch (Apktool) — current workflow

### Edited smali (version 2.3.13)

| File | Method | Change |
|------|--------|--------|
| `decompiled_apktool/smali_classes3/com/twgbd/common/CommonUtilsKt.smali` | `isPremiumViewEnabled` | After `checkNotNullParameter`, return `true` (`const/4 v0, 0x1` / `return v0`). |
| `decompiled_apktool/smali_classes3/com/twgbd/dimsplus/utils/DPPrefManager.smali` | `getIS_PREMIUM_ACTIVE` | Always return `true`. |
| Same | `getPREMIUM_VERSION_SWITCH_STATUS` | Always return `""`. |

### Decode (first time or fresh version)

```bash
java -jar /home/hosan/projects/revanced/tools/apktool_3.0.1.jar d \
  /home/hosan/projects/revanced/apps/DIMS_2.3.13_APKPure.apk \
  -o /home/hosan/projects/revanced/apps/DIMS_2.3.13/decompiled_apktool -f
```

### Build, sign, install

```bash
java -jar /home/hosan/projects/revanced/tools/apktool_3.0.1.jar b \
  /home/hosan/projects/revanced/apps/DIMS_2.3.13/decompiled_apktool \
  -o /home/hosan/projects/revanced/apps/DIMS_2.3.13/patched_apks/dims-unsigned.apk

java -jar /home/hosan/projects/revanced/tools/uber-apk-signer-1.3.0.jar \
  --apks /home/hosan/projects/revanced/apps/DIMS_2.3.13/patched_apks/dims-unsigned.apk \
  --out /home/hosan/projects/revanced/apps/DIMS_2.3.13/signed_apks
```

**Install-ready output (this tree):** `apps/DIMS_2.3.13/signed_apks/dims-aligned-debugSigned.apk` (debug keystore; replace signing for your own release).

```bash
adb install -r /home/hosan/projects/revanced/apps/DIMS_2.3.13/signed_apks/dims-aligned-debugSigned.apk
```

---

## Optional: ReVanced patch bundle

See `revanced-patches/patches/src/main/kotlin/app/revanced/patches/dims/subscription/` and `NEW_APP_PATCH_DEVELOPMENT_GUIDE.md` if you switch back to CLI patching.

## Test

- Install signed APK; open More and premium-heavy screens — premium layouts should apply and purchase prompts should stay suppressed.
- After an app update, re-decode and re-apply the same three method edits (line numbers may shift).
