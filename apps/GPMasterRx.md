# GP Master Rx — Patch & Build Guide

**Package:** `gp.mastercopy4`  
**App name:** GP Master  
**Patched version:** 25  
**XAPK source:** APKPure

---

## What this patch does

GP Master is a **native Android app** with heavy obfuscation (ProGuard/R8). The subscription/premium logic uses SharedPreferences to track the `sinads` ("sin ads" = without ads) boolean flag.

From JADX decompilation analysis:
- The Application class is `gp.mastercopy4.config`
- Subscription check uses `SharedPreferences.getBoolean("sinads", false)`
- Key methods that check premium status:
  - `K0()` at line ~228328: returns `null` immediately if `sinads` is true (no ads)
  - `z1()` at line ~230210: returns `0` if `sinads` is true (ad counter disabled)

The patch forces `sinads` to always be `true`, unlocking premium/ads-free status.

---

## Directory layout convention

All work for a given version lives under:

```
apps/GPMasterRx_<version>/
├── split_apks/           # extracted XAPK contents
├── decompiled_full/      # apktool decompile with resources
├── patched_apks/         # rebuilt base APK + copied config APKs
├── signed_apks/          # all APKs after zipalign + signing
├── xapk_staging/         # APKs renamed to original manifest names
└── GPMasterRx_<version>_signed.xapk   # final output
```

---

## Step-by-step instructions for version 25

### Step 1 — Set up directories and extract the XAPK

```bash
VERSION="25"
APP_DIR="/home/hosan/projects/revanced/apps/GPMasterRx_${VERSION}"

mkdir -p "${APP_DIR}/split_apks"

unzip "/home/hosan/projects/revanced/apps/GP Master Rx_${VERSION}_APKPure.xapk" \
  -d "${APP_DIR}/split_apks"

ls "${APP_DIR}/split_apks/"
```

Check `manifest.json` to confirm the base APK filename and package name:

```bash
cat "${APP_DIR}/split_apks/manifest.json"
```

For version 25, the base APK is `gp.mastercopy4.apk` and package is `gp.mastercopy4`.

---

### Step 2 — Decompile with apktool (full decode)

```bash
# Setup framework path
mkdir -p "${APP_DIR}/apktool-framework"

java -jar /home/hosan/projects/revanced/tools/apktool_3.0.1.jar d \
  "${APP_DIR}/split_apks/gp.mastercopy4.apk" \
  -o "${APP_DIR}/decompiled_full" \
  --frame-path "${APP_DIR}/apktool-framework" \
  -f
```

---

### Step 3 — Patch Strategy

The app is heavily obfuscated (class names are randomized like `a`, `b`, `c`, `a0`, `b0`, etc.). 

**Two approaches for patching:**

#### Approach A: Force sinads=true in Application onCreate
Find the Application class (gp.mastercopy4.config) and add code to set `sinads=true` in onCreate.

#### Approach B: Modify getBoolean to always return true
Modify the SharedPreferences getBoolean calls to always return true for the sinads check.

#### Approach C: Patch K0() method
The K0() method at line ~228328 has pattern:
```java
if (getSharedPreferences("sh", 0).getBoolean("sinads", false)) {
    return null;  // Skip ads
}
```

Change this to always return null (or skip the check entirely).

---

### Step 4 — Finding the patch location (Advanced)

The config class (Application) is obfuscated to a name like `X/Y` in smali. To find it:

1. The AndroidManifest.xml shows: `android:name="gp.mastercopy4.config"`
2. In smali, this is obfuscated but extends `Landroid/app/Application;`

Search for the Application class:

```bash
cd "${APP_DIR}/decompiled_full/smali"

# Find files extending Application
grep -r "Landroid/app/Application;" --include="*.smali" . | grep -v "androidx\|com/"
```

Or search for large files with SharedPreferences:

```bash
# Find large obfuscated files with SharedPreferences usage
for f in $(find . -name "*.smali" -path "./[a-z]*/" -o -path "./[a-z][0-9]*/" | grep -v "androidx\|com/\|android/"); do
    if grep -q "SharedPreferences" "$f" && [ $(wc -l < "$f") -gt 10000 ]; then
        echo "$(wc -l < "$f"): $f"
    fi
done | sort -n -r | head -10
```

---

### Step 5 — Apply the patch

Once you identify the config smali file (e.g., `x/y.smali`), find the `K0` or `z1` method that checks `sinads`.

**The patch:** Change the `getBoolean` check to always return true.

Original pattern in smali:
```smali
invoke-interface {vX, vY, vZ}, Landroid/content/SharedPreferences;->getBoolean(Ljava/lang/String;Z)Z
move-result vX
if-eqz vX, :cond_X
const/4 vX, 0x0
return-object vX
```

Patched (always return null = no ads):
```smali
# Skip the check, always return null
const/4 vX, 0x0
return-object vX
```

Or patch at the getBoolean call site to force const/4 vX, 0x1 (true) after move-result.

---

### Step 6 — Rebuild the base APK

```bash
mkdir -p "${APP_DIR}/patched_apks"

java -jar /home/hosan/projects/revanced/tools/apktool_3.0.1.jar b \
  "${APP_DIR}/decompiled_full" \
  -o "${APP_DIR}/patched_apks/gp.mastercopy4.apk" \
  --frame-path "${APP_DIR}/apktool-framework"
```

---

### Step 7 — Copy config split APKs

```bash
cp "${APP_DIR}/split_apks/config.*.apk" "${APP_DIR}/patched_apks/"

ls -lh "${APP_DIR}/patched_apks/"
```

---

### Step 8 — Sign all APKs

```bash
mkdir -p "${APP_DIR}/signed_apks"

java -jar /home/hosan/projects/revanced/tools/uber-apk-signer-1.3.0.jar \
  --apks "${APP_DIR}/patched_apks" \
  --out  "${APP_DIR}/signed_apks" \
  --allowResign
```

---

### Step 9 — Stage files with canonical XAPK names

```bash
STAGING="${APP_DIR}/xapk_staging"
SIGNED="${APP_DIR}/signed_apks"
mkdir -p "$STAGING"

# Copy signed files with original names
for f in config.ar config.arm64_v8a config.de config.en config.es config.fr \
         config.hi config.in config.it config.ja config.ko config.my \
         config.pt config.ru config.th config.tr config.vi config.xhdpi config.zh; do
    if [ -f "${SIGNED}/${f}-aligned-debugSigned.apk" ]; then
        cp "${SIGNED}/${f}-aligned-debugSigned.apk" "${STAGING}/${f}.apk"
    fi
done

# Main APK
cp "${SIGNED}/gp.mastercopy4-aligned-debugSigned.apk" "${STAGING}/gp.mastercopy4.apk"

# Copy other required files
cp "${APP_DIR}/split_apks/icon.png"      "${STAGING}/icon.png"
cp "${APP_DIR}/split_apks/manifest.json" "${STAGING}/manifest.json"

ls "$STAGING"
```

---

### Step 10 — Package into signed XAPK

```bash
OUTPUT="${APP_DIR}/GPMasterRx_${VERSION}_signed.xapk"

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

## Key Findings from Analysis

### Subscription mechanism

From `gp.mastercopy4.config` class (JADX decompile at line ~228328):

```java
.method K0(Landroid/content/Context;ZZ)Lgp/mastercopy4/c;
    # ...
    invoke-virtual {v0, v1}, Landroid/content/SharedPreferences;->getBoolean(Ljava/lang/String;Z)Z
    move-result v0
    if-eqz v0, :cond_0
    const/4 v0, 0x0
    return-object v0
    # ...
.end method
```

The check at line 228328:
```java
if (getSharedPreferences("sh", 0).getBoolean("sinads", false)) {
    return null;  // Skip ad loading
}
```

### String resources

- `sinads` - SharedPreferences key for "without ads" status
- `sinads_activado` (0x7f120280) - "Ads are removed"
- `wallet_msg_1_sinads` (0x7f120324) - "Don't want ads? Remove all app ads for @X@"
- `sinads_fhasta` - Expiration timestamp for subscription

---

## ReVanced Patch Files

Formal patch definitions for the ReVanced system:

```
revanced-patches/patches/src/main/kotlin/app/revanced/patches/gpmasterrx/subscription/
├── Fingerprints.kt          # Method fingerprints for finding subscription checks
└── UnlockPremiumPatch.kt    # Main patch implementation
```

To build the `.rvp` bundle (requires `gpr.user` and `gpr.key` in `~/.gradle/gradle.properties`):

```bash
cd /home/hosan/projects/revanced/revanced-patches
./gradlew :patches:build
```

**Note:** Due to heavy obfuscation in this app, the bytecode patch may need fingerprint updates between versions. The manual workflow documented above is more reliable for this specific app.

---

## Tools reference

| Tool | Path | Version |
|------|------|---------|
| apktool | `/home/hosan/projects/revanced/tools/apktool_3.0.1.jar` | 3.0.1 |
| JADX | `/home/hosan/projects/revanced/tools/jadx-1.5.5/bin/jadx` | 1.5.5 |
| uber-apk-signer | `/home/hosan/projects/revanced/tools/uber-apk-signer-1.3.0.jar` | 1.3.0 |

---

## Notes

- This app uses heavy obfuscation - finding exact smali locations requires manual analysis
- The `sinads` check appears in multiple places; patching any of them unlocks premium
- The app uses multiple ad SDKs (Appnext, Facebook, Unity, Wortise, Fyber)
- Subscription is verified against server at `pay.[domain]/srv/check_payment_sinads.php`
