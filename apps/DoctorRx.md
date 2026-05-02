# Doctor Rx — Patch & Build Guide

**Package:** `versionaization.doctor.rx`
**App name:** Doctor Rx
**Patched version:** 1.0.51
**XAPK source:** APKPure

---

## What this patch does

Doctor Rx is a **Capacitor/Ionic hybrid app** (React JS running inside Android WebView). The entire subscription/premium logic runs in bundled JavaScript, not in native Java/Kotlin code.

The subscription gate is a single function in `assets/public/static/js/main.*.js` inside the base APK, module `2598`, exported as `Om`:

```js
// Original — returns true only if expires_at is set and in the future
function g(e) { return !!e.expires_at && Date.parse(e.expires_at) > (new Date).getTime() }

// Patched — always returns true (everyone is premium)
function g(e) { return !0 }
```

This function is called as `(0,p.Om)(user)` throughout the app to set `isUserPaid` in Redux state and gate all premium content behind it. Replacing it with a constant `true` unlocks everything.

---

## Directory layout convention

All work for a given version lives under:

```
apps/DoctorRx_<version>/
├── split_apks/           # extracted XAPK contents (original APKs + manifest + icon)
├── decompiled_apktool/   # apktool decompile of base APK — edit JS files here
├── decompiled_jadx/      # JADX decompile for analysis only (not needed for rebuild)
├── patched_apks/         # rebuilt base APK + copied config APKs (pre-sign)
├── signed_apks/          # all APKs after zipalign + signing
├── xapk_staging/         # APKs renamed to original manifest names, ready to zip
└── DoctorRx_<version>_signed.xapk   # final output
```

---

## Step-by-step instructions for a new version

Replace `1.0.51` and the XAPK filename with the new version throughout.

### Step 1 — Set up directories and extract the XAPK

```bash
VERSION="1.0.51"
APP_DIR="/home/hosan/projects/revanced/apps/DoctorRx_${VERSION}"

mkdir -p "${APP_DIR}/split_apks"

unzip "/home/hosan/projects/revanced/apps/Doctor Rx_${VERSION}_APKPure.xapk" \
  -d "${APP_DIR}/split_apks"

ls "${APP_DIR}/split_apks/"
```

Check `manifest.json` to confirm the base APK filename and package name:

```bash
cat "${APP_DIR}/split_apks/manifest.json"
```

For 1.0.51 the base APK is `versionaization.doctor.rx.apk`.

---

### Step 2 — Decompile with apktool

```bash
java -jar /home/hosan/projects/revanced/tools/apktool_3.0.1.jar d \
  "${APP_DIR}/split_apks/versionaization.doctor.rx.apk" \
  -o "${APP_DIR}/decompiled_apktool" \
  -f
```

---

### Step 3 — (Optional) Decompile with JADX for code analysis

Only needed if the JS bundle changes significantly between versions and you need to re-locate the subscription function.

```bash
chmod +x /home/hosan/projects/revanced/tools/jadx-1.5.5/bin/jadx

/home/hosan/projects/revanced/tools/jadx-1.5.5/bin/jadx \
  --output-dir "${APP_DIR}/decompiled_jadx" \
  --threads-count 4 \
  --no-res \
  "${APP_DIR}/split_apks/versionaization.doctor.rx.apk"
```

---

### Step 4 — Find the JS bundle filename

The main bundle filename changes with each build (hash in name). Find it:

```bash
ls "${APP_DIR}/decompiled_apktool/assets/public/static/js/main.*.js"
```

Example for 1.0.51: `main.89e28de2.js`

---

### Step 5 — Locate the subscription check function

Search for the `Om` export / subscription check in the main bundle:

```bash
JS_FILE=$(ls "${APP_DIR}/decompiled_apktool/assets/public/static/js/main.*.js" | head -1)

grep -o "function g(e){return.*getTime()}" "$JS_FILE"
```

Expected output for 1.0.51:
```
function g(e){return!!e.expires_at&&Date.parse(e.expires_at)>(new Date).getTime()}
```

If the output is different, see the **Re-analysis section** below.

---

### Step 6 — Apply the patch

```bash
JS_FILE=$(ls "${APP_DIR}/decompiled_apktool/assets/public/static/js/main.*.js" | head -1)

python3 -c "
import sys
path = '$JS_FILE'
with open(path, 'r', encoding='utf-8') as f:
    content = f.read()

original = 'function g(e){return!!e.expires_at&&Date.parse(e.expires_at)>(new Date).getTime()}'
patched  = 'function g(e){return!0}'

if original not in content:
    print('ERROR: target function not found — re-analysis needed')
    sys.exit(1)

count = content.count(original)
print(f'Found {count} occurrence(s), patching...')
content = content.replace(original, patched)
with open(path, 'w', encoding='utf-8') as f:
    f.write(content)
print('Patch applied successfully')
"

# Verify
grep -c 'function g(e){return!0}' "$JS_FILE" && echo "VERIFIED"
```

---

### Step 7 — Rebuild the base APK with apktool

```bash
mkdir -p "${APP_DIR}/patched_apks"

java -jar /home/hosan/projects/revanced/tools/apktool_3.0.1.jar b \
  "${APP_DIR}/decompiled_apktool" \
  -o "${APP_DIR}/patched_apks/versionaization.doctor.rx.apk"
```

---

### Step 8 — Copy config split APKs (they do not need patching)

```bash
cp "${APP_DIR}/split_apks/config.*.apk" "${APP_DIR}/patched_apks/"

ls -lh "${APP_DIR}/patched_apks/"
```

---

### Step 9 — Sign all APKs

All APKs in a split APK set must share the same certificate. Use `--allowResign` to replace the original Google signature with the debug key.

```bash
mkdir -p "${APP_DIR}/signed_apks"

java -jar /home/hosan/projects/revanced/tools/uber-apk-signer-1.3.0.jar \
  --apks "${APP_DIR}/patched_apks" \
  --out  "${APP_DIR}/signed_apks" \
  --allowResign
```

Check output ends with `0 errors`.

---

### Step 10 — Stage files with canonical XAPK names

The signer appends `-aligned-debugSigned` to filenames. Rename them back to the original names expected by the XAPK manifest:

```bash
STAGING="${APP_DIR}/xapk_staging"
SIGNED="${APP_DIR}/signed_apks"
mkdir -p "$STAGING"

cp "${SIGNED}/versionaization.doctor.rx-aligned-debugSigned.apk"  "${STAGING}/versionaization.doctor.rx.apk"
cp "${SIGNED}/config.ar-aligned-debugSigned.apk"                   "${STAGING}/config.ar.apk"
cp "${SIGNED}/config.arm64_v8a-aligned-debugSigned.apk"            "${STAGING}/config.arm64_v8a.apk"
cp "${SIGNED}/config.de-aligned-debugSigned.apk"                   "${STAGING}/config.de.apk"
cp "${SIGNED}/config.en-aligned-debugSigned.apk"                   "${STAGING}/config.en.apk"
cp "${SIGNED}/config.es-aligned-debugSigned.apk"                   "${STAGING}/config.es.apk"
cp "${SIGNED}/config.fr-aligned-debugSigned.apk"                   "${STAGING}/config.fr.apk"
cp "${SIGNED}/config.hi-aligned-debugSigned.apk"                   "${STAGING}/config.hi.apk"
cp "${SIGNED}/config.in-aligned-debugSigned.apk"                   "${STAGING}/config.in.apk"
cp "${SIGNED}/config.it-aligned-debugSigned.apk"                   "${STAGING}/config.it.apk"
cp "${SIGNED}/config.ja-aligned-debugSigned.apk"                   "${STAGING}/config.ja.apk"
cp "${SIGNED}/config.ko-aligned-debugSigned.apk"                   "${STAGING}/config.ko.apk"
cp "${SIGNED}/config.my-aligned-debugSigned.apk"                   "${STAGING}/config.my.apk"
cp "${SIGNED}/config.pt-aligned-debugSigned.apk"                   "${STAGING}/config.pt.apk"
cp "${SIGNED}/config.ru-aligned-debugSigned.apk"                   "${STAGING}/config.ru.apk"
cp "${SIGNED}/config.th-aligned-debugSigned.apk"                   "${STAGING}/config.th.apk"
cp "${SIGNED}/config.tr-aligned-debugSigned.apk"                   "${STAGING}/config.tr.apk"
cp "${SIGNED}/config.vi-aligned-debugSigned.apk"                   "${STAGING}/config.vi.apk"
cp "${SIGNED}/config.xxhdpi-aligned-debugSigned.apk"               "${STAGING}/config.xxhdpi.apk"
cp "${SIGNED}/config.zh-aligned-debugSigned.apk"                   "${STAGING}/config.zh.apk"

cp "${APP_DIR}/split_apks/icon.png"      "${STAGING}/icon.png"
cp "${APP_DIR}/split_apks/manifest.json" "${STAGING}/manifest.json"

ls "$STAGING" | wc -l  # should be 22
```

---

### Step 11 — Package into signed XAPK

```bash
OUTPUT="${APP_DIR}/DoctorRx_${VERSION}_signed.xapk"

python3 -c "
import zipfile, os

staging = '${STAGING}'
output  = '${OUTPUT}'

files = sorted(os.listdir(staging))
print(f'Packaging {len(files)} files...')
with zipfile.ZipFile(output, 'w', compression=zipfile.ZIP_STORED) as zf:
    for fname in files:
        zf.write(os.path.join(staging, fname), fname)
        print(f'  + {fname}')

size_mb = os.path.getsize(output) / 1024 / 1024
print(f'Done: {output}  ({size_mb:.2f} MiB)')
"
```

---

## Quick re-run script (copy-paste for new version)

Set `VERSION` to the new version number and run everything in order:

```bash
VERSION="1.0.51"   # <-- change this for each new version

APP_DIR="/home/hosan/projects/revanced/apps/DoctorRx_${VERSION}"
TOOLS="/home/hosan/projects/revanced/tools"
XAPK_SRC="/home/hosan/projects/revanced/apps/Doctor Rx_${VERSION}_APKPure.xapk"

# 1. Extract
mkdir -p "${APP_DIR}/split_apks"
unzip "$XAPK_SRC" -d "${APP_DIR}/split_apks"

# 2. Decompile
java -jar "${TOOLS}/apktool_3.0.1.jar" d \
  "${APP_DIR}/split_apks/versionaization.doctor.rx.apk" \
  -o "${APP_DIR}/decompiled_apktool" -f

# 3. Patch JS
JS_FILE=$(ls "${APP_DIR}/decompiled_apktool/assets/public/static/js/main.*.js" | head -1)
python3 -c "
path = '$JS_FILE'
orig = 'function g(e){return!!e.expires_at&&Date.parse(e.expires_at)>(new Date).getTime()}'
new  = 'function g(e){return!0}'
with open(path,'r') as f: c = f.read()
assert orig in c, 'Target function not found — re-analysis needed'
with open(path,'w') as f: f.write(c.replace(orig, new))
print('Patched:', path)
"

# 4. Rebuild
mkdir -p "${APP_DIR}/patched_apks"
java -jar "${TOOLS}/apktool_3.0.1.jar" b \
  "${APP_DIR}/decompiled_apktool" \
  -o "${APP_DIR}/patched_apks/versionaization.doctor.rx.apk"
cp "${APP_DIR}/split_apks/config.*.apk" "${APP_DIR}/patched_apks/"

# 5. Sign
mkdir -p "${APP_DIR}/signed_apks"
java -jar "${TOOLS}/uber-apk-signer-1.3.0.jar" \
  --apks "${APP_DIR}/patched_apks" \
  --out  "${APP_DIR}/signed_apks" \
  --allowResign

# 6. Stage
STAGING="${APP_DIR}/xapk_staging"
SIGNED="${APP_DIR}/signed_apks"
mkdir -p "$STAGING"
for f in config.ar config.arm64_v8a config.de config.en config.es config.fr \
          config.hi config.in config.it config.ja config.ko config.my \
          config.pt config.ru config.th config.tr config.vi config.xxhdpi config.zh; do
  cp "${SIGNED}/${f}-aligned-debugSigned.apk" "${STAGING}/${f}.apk"
done
cp "${SIGNED}/versionaization.doctor.rx-aligned-debugSigned.apk" "${STAGING}/versionaization.doctor.rx.apk"
cp "${APP_DIR}/split_apks/icon.png"      "${STAGING}/icon.png"
cp "${APP_DIR}/split_apks/manifest.json" "${STAGING}/manifest.json"

# 7. Package XAPK
OUTPUT="${APP_DIR}/DoctorRx_${VERSION}_signed.xapk"
python3 -c "
import zipfile, os
staging='$STAGING'; output='$OUTPUT'
with zipfile.ZipFile(output,'w',compression=zipfile.ZIP_STORED) as zf:
    for f in sorted(os.listdir(staging)): zf.write(os.path.join(staging,f),f)
print('Output:', output, f'({os.path.getsize(output)/1024/1024:.2f} MiB)')
"
```

---

## Re-analysis guide (if a new version breaks the patch)

Run this when the patch assertion fails — the JS bundle hash and/or minification may have changed.

### Find the main bundle

```bash
ls "${APP_DIR}/decompiled_apktool/assets/public/static/js/main.*.js"
```

### Search for the subscription check by stable pattern

The function checks `expires_at` and compares it to current time. Search for it:

```bash
JS_FILE=$(ls "${APP_DIR}/decompiled_apktool/assets/public/static/js/main.*.js" | head -1)

# Option A — search by expires_at + getTime pattern
grep -o ".\{0,20\}expires_at.\{0,80\}getTime.\{0,10\}" "$JS_FILE"

# Option B — find the Om export in module 2598
python3 -c "
import sys
data = open('$JS_FILE').read()
idx = data.find('2598:function')
if idx < 0: print('module 2598 not found — module IDs may have changed'); sys.exit(1)
chunk = data[idx:idx+4000]
# find the Om export target
om_idx = chunk.find('Om:function')
g_idx  = chunk.find('Om:function(){return ')
print('Om export context:', chunk[g_idx:g_idx+80])
"
```

### Confirm which function is the gate

Look for a function that:
- takes a single user object argument
- checks `expires_at`
- returns a boolean
- is exported as `Om` from a module that also exports `ko` (the User class)

### Update the patch strings

Once you find the new function body, update `orig` in the quick script above.

Also update the ReVanced patch file at:
```
revanced-patches/patches/src/main/kotlin/app/revanced/patches/doctorrx/subscription/UnlockPremiumPatch.kt
```

---

## ReVanced patch file location

The formal patch definition (for when revanced-patches Gradle build credentials are available):

```
revanced-patches/patches/src/main/kotlin/app/revanced/patches/doctorrx/subscription/UnlockPremiumPatch.kt
```

To build the `.rvp` bundle (requires `gpr.user` and `gpr.key` in `~/.gradle/gradle.properties`):

```bash
cd /home/hosan/projects/revanced/revanced-patches
./gradlew :patches:build
```

---

## Install notes

- Uninstall any existing Doctor Rx before installing — the signature changed from Google Play to debug key.
- Install via APKPure app (supports XAPK) or use `adb` split install:

```bash
adb install-multiple \
  versionaization.doctor.rx.apk \
  config.arm64_v8a.apk \
  config.xxhdpi.apk \
  config.en.apk
```

- The signing certificate used is the uber-apk-signer embedded debug keystore:
  - Subject: `CN=Android Debug, OU=Android, O=US`
  - SHA256: `1e08a903aef9c3a721510b64ec764d01d3d094eb954161b62544ea8f187b5953`
  - Expires: 2044-03-11

---

## Tools reference

| Tool | Path | Version |
|------|------|---------|
| apktool | `/home/hosan/projects/revanced/tools/apktool_3.0.1.jar` | 3.0.1 |
| JADX | `/home/hosan/projects/revanced/tools/jadx-1.5.5/bin/jadx` | 1.5.5 |
| uber-apk-signer | `/home/hosan/projects/revanced/tools/uber-apk-signer-1.3.0.jar` | 1.3.0 |
