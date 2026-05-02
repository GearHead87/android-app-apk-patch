# Generic App Patching Workflow Guide

This document provides a complete, reusable workflow for analyzing and patching any Android app (APK/XAPK) to remove subscriptions, ads, or other restrictions.

**Prerequisites:** JDK 17, tools folder with apktool, jadx, uber-apk-signer

---

## Phase 1: Setup & Extraction

### Step 1: Define Variables and Extract XAPK

For each new app, set these variables at the beginning:

```bash
# CONFIGURATION - Update these for each new app
APP_NAME="YourAppName"           # e.g., "GPMasterRx"
VERSION="1.0.0"                  # App version
PACKAGE_NAME="com.example.app"   # From manifest.json
BASE_APK_NAME="base.apk"         # Main APK filename from manifest
XAPK_FILE="YourApp_${VERSION}_APKPure.xapk"

# Paths (usually don't change)
WORKSPACE="/home/hosan/projects/revanced"
APP_DIR="${WORKSPACE}/apps/${APP_NAME}_${VERSION}"
TOOLS="${WORKSPACE}/tools"
```

Extract the XAPK:

```bash
mkdir -p "${APP_DIR}/split_apks"

unzip "${WORKSPACE}/apps/${XAPK_FILE}" \
  -d "${APP_DIR}/split_apks"

# Verify contents
ls -la "${APP_DIR}/split_apks/"
cat "${APP_DIR}/split_apks/manifest.json"
```

---

## Phase 2: Decompilation

### Step 2: Decompile with Apktool (Full Decode)

```bash
# Setup framework path (prevents permission issues)
mkdir -p "${APP_DIR}/apktool-framework"

# Full decompile with resources
java -jar "${TOOLS}/apktool_3.0.1.jar" d \
  "${APP_DIR}/split_apks/${BASE_APK_NAME}" \
  -o "${APP_DIR}/decompiled" \
  --frame-path "${APP_DIR}/apktool-framework" \
  -f
```

If you only need bytecode (no resources):
```bash
java -jar "${TOOLS}/apktool_3.0.1.jar" d \
  "${APP_DIR}/split_apks/${BASE_APK_NAME}" \
  -o "${APP_DIR}/decompiled" \
  -r -f
```

### Step 3: Decompile with JADX (For Analysis)

```bash
# Setup JADX config home (prevents permission errors)
export HOME="${WORKSPACE}"
export XDG_CONFIG_HOME="${WORKSPACE}/.config"
export XDG_CACHE_HOME="${WORKSPACE}/.cache"
export XDG_DATA_HOME="${WORKSPACE}/.data"
mkdir -p "$XDG_CONFIG_HOME" "$XDG_CACHE_HOME" "$XDG_DATA_HOME"

chmod +x "${TOOLS}/jadx-1.5.5/bin/jadx"

"${TOOLS}/jadx-1.5.5/bin/jadx" \
  --output-dir "${APP_DIR}/decompiled_jadx" \
  --threads-count 4 \
  --no-res \
  "${APP_DIR}/split_apks/${BASE_APK_NAME}"
```

---

## Phase 3: Analysis - Finding the Patch Location

### Step 4: Understand the App Type

First, determine what kind of app you're dealing with:

| App Type | Where to Look | Common Patterns |
|----------|---------------|-----------------|
| **Hybrid (WebView)** | `assets/www/` or `assets/public/` | JavaScript files, `main.*.js` |
| **Native + JS Bundle** | `assets/` | JavaScript controlling premium UI |
| **Fully Native** | Java/Kotlin source | `isPremium()`, `hasSubscription()`, `getBoolean()` |
| **Unity Game** | `assets/bin/Data/` | IL2CPP or Mono assemblies |

Check the app type:
```bash
ls -la "${APP_DIR}/decompiled/assets/"
find "${APP_DIR}/decompiled/assets" -name "*.js" 2>/dev/null | head -10
```

### Step 5: Search for Subscription/Restriction Keywords

**In JADX (Java source):**
```bash
# Search for common subscription patterns
echo "=== Searching for premium/subscription patterns ==="

# Common keywords to search:
KEYWORDS=(
    "isPremium\|isPro\|isPaid\|isVip\|isSubscribed"
    "hasSubscription\|hasPurchase\|isLicensed"
    "subscription\|premium\|purchase\|unlock"
    "getBoolean.*premium\|getBoolean.*sub"
    "expir\|validUntil\|trial"
)

for pattern in "${KEYWORDS[@]}"; do
    echo "\n--- Searching: $pattern ---"
    grep -r "$pattern" "${APP_DIR}/decompiled_jadx/sources" 2>/dev/null | \
        grep -v "androidx\|com/google\|com/facebook" | head -5
done
```

**In Smali (bytecode):**
```bash
# Find files with getBoolean (common for feature flags)
rg -l "getBoolean" "${APP_DIR}/decompiled/smali" | \
    grep -v "androidx\|com/google\|com/facebook" | head -20

# Find files with SharedPreferences
cat > /tmp/find_sp.py << 'EOF'
import os
import sys

def find_files(smali_dir):
    results = []
    for root, dirs, files in os.walk(smali_dir):
        # Skip libraries
        if any(lib in root for lib in ['androidx', 'com/google', 'com/facebook',
                                        'com/unity', 'com/appnext']):
            continue
        for file in files:
            if not file.endswith('.smali'):
                continue
            filepath = os.path.join(root, file)
            try:
                with open(filepath, 'r', encoding='utf-8', errors='ignore') as f:
                    content = f.read()
                if 'SharedPreferences' in content:
                    lines = len(content.split('\n'))
                    if lines > 1000:  # Adjust threshold
                        results.append((lines, filepath))
            except:
                pass
    results.sort(reverse=True)
    return results

if __name__ == '__main__':
    results = find_files(sys.argv[1])
    print(f"Found {len(results)} files with SharedPreferences:")
    for lines, path in results[:20]:
        print(f"  {lines:5}: {path}")
EOF

python3 /tmp/find_sp.py "${APP_DIR}/decompiled/smali"
```

### Step 6: Identify the Target Pattern

Based on the app type, look for these patterns:

**For Hybrid Apps (JavaScript):**
- Search in `assets/` JS files for:
  - `function isPremium()` or `function isSubscribed()`
  - `expires_at` checks
  - `return !!user.subscription` patterns
  - Module exports like `exports.Om = function()`

```bash
# Find main JS bundle
JS_FILE=$(find "${APP_DIR}/decompiled/assets" -name "main.*.js" | head -1)

# Search for subscription check patterns
grep -o "function.*{return.*expir.*}" "$JS_FILE"
grep -n "isPremium\|isPaid\|expires_at\|subscription" "$JS_FILE"
```

**For Native Apps (Java/Smali):**
- Look for `getBoolean()` calls with subscription keys
- Find `return` statements that gate features
- Look for `if-eqz` (if equal zero) patterns that skip code

```bash
# Analyze a specific file (replace with your candidate)
FILE="${APP_DIR}/decompiled/smali/x/y.smali"

# Look for getBoolean pattern
echo "=== getBoolean occurrences ==="
rg -B 3 -A 3 "getBoolean" "$FILE"

# Look for conditional returns
echo "=== Conditional returns ==="
rg -B 5 -A 5 "if-eqz.*:cond.*\n.*return" "$FILE" | head -30
```

### Step 7: Document Your Findings

Once you find the target, document:

1. **File path**: e.g., `smali/x/y.smali` or `assets/main.1234.js`
2. **Method name**: e.g., `isPremium()` or `checkSubscription()`
3. **Original pattern**: The exact code to change
4. **Patched pattern**: What it should become

Example documentation:
```
PATCH TARGET:
- File: assets/public/static/js/main.abcd1234.js
- Function: g(e) - checks user.expires_at
- Original: function g(e){return!!e.expires_at&&Date.parse(e.expires_at)>(new Date).getTime()}
- Patched:  function g(e){return!0}
- Effect: Always returns true (user is always premium)
```

---

## Phase 4: Patching

### Step 8: Apply the Patch

**For JavaScript files:**
```bash
JS_FILE=$(find "${APP_DIR}/decompiled/assets" -name "main.*.js" | head -1)

# Use Python for reliable string replacement
python3 << 'EOF'
import sys

# CONFIGURE THESE:
file_path = "'$JS_FILE'"
ORIGINAL = 'function g(e){return!!e.expires_at&&Date.parse(e.expires_at)>(new Date).getTime()}'
PATCHED = 'function g(e){return!0}'

with open(file_path, 'r', encoding='utf-8') as f:
    content = f.read()

if ORIGINAL not in content:
    print("ERROR: Target pattern not found!")
    print("Re-analysis needed - the pattern may have changed.")
    sys.exit(1)

count = content.count(ORIGINAL)
print(f"Found {count} occurrence(s)")

content = content.replace(ORIGINAL, PATCHED)

with open(file_path, 'w', encoding='utf-8') as f:
    f.write(content)

print("Patch applied successfully!")

# Verify
grep -c 'return!0' file_path
EOF
```

**For Smali files:**
```bash
# Example: Force a method to always return true
FILE="${APP_DIR}/decompiled/smali/x/y.smali"

# Common smali patches:
# 1. Change "if-eqz" to "if-nez" (invert condition)
# 2. Replace "move-result vX" with "const/4 vX, 0x1"
# 3. Add "return-void" or "return-object v0" early

# Use sed or direct file editing
# Always make a backup first!
cp "$FILE" "${FILE}.backup"

# Example patch: Change getBoolean result to always true
# Look for:
#   invoke-interface {v0, v1, v2}, Landroid/content/SharedPreferences;->getBoolean(Ljava/lang/String;Z)Z
#   move-result v0
#
# And patch the line after move-result to:
#   const/4 v0, 0x1
```

---

## Phase 5: Rebuild & Package

### Step 9: Rebuild the Base APK

```bash
mkdir -p "${APP_DIR}/patched_apks"

java -jar "${TOOLS}/apktool_3.0.1.jar" b \
  "${APP_DIR}/decompiled" \
  -o "${APP_DIR}/patched_apks/${BASE_APK_NAME}" \
  --frame-path "${APP_DIR}/apktool-framework"
```

### Step 10: Copy Config Split APKs

```bash
# Copy unmodified config files
cp "${APP_DIR}/split_apks/config.*.apk" "${APP_DIR}/patched_apks/"

ls -lh "${APP_DIR}/patched_apks/"
```

### Step 11: Sign All APKs

```bash
mkdir -p "${APP_DIR}/signed_apks"

java -jar "${TOOLS}/uber-apk-signer-1.3.0.jar" \
  --apks "${APP_DIR}/patched_apks" \
  --out "${APP_DIR}/signed_apks" \
  --allowResign

# Verify output ends with "0 errors"
```

### Step 12: Stage Files for XAPK

```bash
STAGING="${APP_DIR}/xapk_staging"
SIGNED="${APP_DIR}/signed_apks"
mkdir -p "$STAGING"

# Copy all signed APKs with original names
for f in "${SIGNED}"/*-aligned-debugSigned.apk; do
    # Remove -aligned-debugSigned suffix
    basename=$(basename "$f" | sed 's/-aligned-debugSigned//')
    cp "$f" "${STAGING}/${basename}"
done

# Copy other required files
cp "${APP_DIR}/split_apks/icon.png"      "${STAGING}/"
cp "${APP_DIR}/split_apks/manifest.json" "${STAGING}/"

ls "$STAGING"
```

### Step 13: Package Final XAPK

```bash
OUTPUT="${APP_DIR}/${APP_NAME}_${VERSION}_signed.xapk"

python3 << 'EOF'
import zipfile
import os

staging = "${STAGING}"
output = "${OUTPUT}"

files = sorted(os.listdir(staging))
print(f"Packaging {len(files)} files into {output}...")

with zipfile.ZipFile(output, 'w', compression=zipfile.ZIP_STORED) as zf:
    for fname in files:
        fpath = os.path.join(staging, fname)
        zf.write(fpath, fname)
        size = os.path.getsize(fpath) / 1024
        print(f"  + {fname} ({size:.1f} KB)")

size_mb = os.path.getsize(output) / 1024 / 1024
print(f"\nDone: {output} ({size_mb:.2f} MiB)")
EOF
```

---

## Phase 6: Verification & Installation

### Step 14: Verify the Patch

```bash
# Check APK signatures
cd "${APP_DIR}/signed_apks"

# List contents of final XAPK
echo "=== Final XAPK contents ==="
unzip -l "${OUTPUT}"
```

### Step 15: Installation Notes

**Important:**
- Uninstall any existing version first (signature changed from original)
- Install via APKPure app or use adb:

```bash
# Using adb install-multiple for split APKs
adb install-multiple \
  "${STAGING}/${BASE_APK_NAME}" \
  "${STAGING}/config.arm64_v8a.apk" \
  "${STAGING}/config.xxhdpi.apk" \
  "${STAGING}/config.en.apk"
```

---

## Quick Reference: Common Patch Patterns

### JavaScript (Hybrid Apps)

| Goal | Original | Patched |
|------|----------|---------|
| Always premium | `return isSubscribed()` | `return true` or `return!0` |
| Remove expiry check | `return !!user.expires_at && Date.now() < user.expires_at` | `return true` |
| Bypass login | `return isLoggedIn()` | `return true` |

### Smali (Native Apps)

| Goal | Original | Patched |
|------|----------|---------|
| Always true | `move-result v0` | `const/4 v0, 0x1` |
| Always false | `move-result v0` | `const/4 v0, 0x0` |
| Skip method | complex body | `return-void` or `return-object v0` |
| Invert condition | `if-eqz v0, :cond_0` | `if-nez v0, :cond_0` |

---

## Troubleshooting

### Apktool framework errors
```bash
# Clear framework cache
rm -rf ~/.local/share/apktool/framework/
# Or use --frame-path to a local directory
```

### JADX permission errors
```bash
# Always set these before running jadx
export HOME="${WORKSPACE}"
export XDG_CONFIG_HOME="${WORKSPACE}/.config"
export XDG_CACHE_HOME="${WORKSPACE}/.cache"
```

### Pattern not found in JS
- Check if the JS bundle filename changed (hash in name)
- The minification/obfuscation may have changed between versions
- Re-analyze with JADX to find the new function name

### Smali verification fails
- Make sure you're editing the correct smali folder (not smali_classes2 unless needed)
- Use `apktool d -r` if resource decoding causes issues
- Check for multiple dex files: `ls -la ${APP_DIR}/decompiled/smali*`

---

## Re-analysis Checklist

If the patch fails after a version update:

- [ ] Check if JS bundle filename changed (new hash)
- [ ] Re-run JADX to find new function/class names
- [ ] Search for the same logic with different variable names
- [ ] Look for new string resources (R.string.*)
- [ ] Check if the check moved to a different class/method

---

**Last Updated:** $(date +%Y-%m-%d)  
**Applies to:** Any Android app (APK/XAPK format)
