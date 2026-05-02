# ReVanced New App Patch Development Guide

This document explains the end-to-end process to add support for a new app in `revanced-patches`, from APK analysis to building and applying a patched APK.

It is based on how this workspace is structured:

- `revanced-patches`: patch definitions and patch bundle build.
- `revanced-patcher`: patch engine (bytecode/resources patching).
- `revanced-library`: APK repackaging, signing, install helpers.
- `revanced-cli`: command-line tool to load patches and patch APK files.

## 1) Understand the pipeline first

Before adding a new app, it helps to understand the flow:

1. You write patch code in `revanced-patches`.
2. You build `revanced-patches`, which produces a patch bundle (`.rvp`).
3. `revanced-cli` loads that bundle (`loadPatches`) and filters compatible patches.
4. `revanced-patcher` applies selected patches to an input APK.
5. `revanced-library` applies outputs, aligns/signs, and produces a new APK.

Important detail: on JVM, patches are loaded from public static fields/methods in the patch bundle JAR. In Kotlin patch files, that means a top-level patch `val` is required and usually marked with `@Suppress("unused")` so it is not removed.

## 2) Prerequisites

### Required

- JDK 17
- Git
- A Gradle environment that can download from GitHub Packages

If package resolution fails, add credentials in `~/.gradle/gradle.properties`:

```properties
gpr.user=<your_github_username>
gpr.key=<your_read_packages_pat>
```

### Recommended reverse-engineering tools

- `jadx` (Java/Kotlin-like decompiled view)
- `apktool` (resources + smali project)
- `adb` (optional, for on-device testing)

Note: ReVanced already uses Apktool internally through `revanced-patcher` during resource patching. You do not need external `apktool` to run patching, but you should still use it for manual analysis/debugging.

## 3) Prepare workspace

From this root (`/home/hosan/projects/revanced`), build key projects once:

```bash
cd /home/hosan/projects/revanced/revanced-patches && ./gradlew :patches:build
cd /home/hosan/projects/revanced/revanced-cli && ./gradlew build
```

You can also build `revanced-patcher` and `revanced-library` when debugging internals.

## 4) Choose a target app and patch goal

Define this clearly before coding:

- Package name (example: `com.some.app`)
- Tested version(s) (example: `1.2.3`)
- Exact behavior you want to change (one patch = one focused behavior)

Examples of good goals:

- Hide sponsored feed cards
- Disable forced update dialog
- Remove one specific resource-based banner

Avoid broad goals at first (for example, "remove all restrictions everywhere").

## 5) Break down the APK (analysis phase)

Use both JADX and Apktool. They complement each other.

### 5.1 With JADX (high-level code navigation)

```bash
jadx -d /tmp/app-jadx /path/to/app.apk
```

Use JADX to:

- locate candidate classes/methods for the behavior,
- inspect constants/strings and call flow,
- identify return types and parameter patterns.

### 5.2 With Apktool (resources + smali)

```bash
apktool d /path/to/app.apk -o /tmp/app-apktool
```

Use Apktool to:

- inspect `res/` files for resource patches,
- inspect smali around target methods,
- confirm instruction-level details when fingerprints are unstable.

### 5.3 Split APK and XAPK support status in ReVanced

You asked specifically about split APK and XAPK workflows. Based on this workspace code, current ReVanced patching flow is for a single input APK file:

- `revanced-cli patch` takes one `APK file to patch` input.
- `revanced-patcher` entry point is `patcher(apkFile: File, ...)` (single file).
- install helpers currently install one APK file (`install(apk.file)`), not a multi-APK session from a folder.

So, practical status is:

- Native patching target: single APK (usually `base.apk`).
- No direct first-class "patch a folder of split APKs/XAPK as a unit" command in current ReVanced CLI flow.

What this means for you:

1. For split/XAPK packages, extract and identify `base.apk` first.
2. Analyze and patch `base.apk` with ReVanced.
3. Rebuild/sign/test carefully, because apps that depend heavily on split configs may still require full split-aware installation packaging.

### 5.4 Using your local `tools/` folder for analysis/signing

You already added these tools under `/home/hosan/projects/revanced/tools/`:

- `tools/apktool_3.0.1.jar`
- `tools/jadx-1.5.5/`
- `tools/uber-apk-signer-1.3.0.jar`

Use them directly:

```bash
# Decompile with your local apktool
java -jar /home/hosan/projects/revanced/tools/apktool_3.0.1.jar d /path/to/app.apk -o /tmp/app-apktool

# Rebuild with your local apktool
java -jar /home/hosan/projects/revanced/tools/apktool_3.0.1.jar b /tmp/app-apktool -o /tmp/app-rebuilt.apk

# Sign with your local uber-apk-signer
java -jar /home/hosan/projects/revanced/tools/uber-apk-signer-1.3.0.jar --apks /tmp/app-rebuilt.apk
```

If using `mod_guide.md`, note the examples there use `apktool_2.12.1.jar` in commands while your current file is `apktool_3.0.1.jar`. Use the actual filename you have in `tools/`.

### 5.5 Split APK / XAPK handling workflow (recommended)

For a `.xapk` (or any container with multiple APKs), use this approach:

1. Extract package contents:

```bash
mkdir -p /tmp/xapk && unzip /path/to/app.xapk -d /tmp/xapk
```

2. Identify `base.apk` and split files (like `split_config.*.apk`).
3. Run reverse-engineering analysis on `base.apk` (JADX + Apktool).
4. Implement ReVanced patch against behavior found in `base.apk`.
5. Build `.rvp`, run ReVanced CLI patch against `base.apk`.
6. Sign output APK.
7. Validate install/runtime behavior on device.

For folder signing, your `mod_guide.md` approach is valid for signing multiple APK files:

```bash
java -jar /home/hosan/projects/revanced/tools/uber-apk-signer-1.3.0.jar \
  --apks /path/to/folder-with-apks/ \
  --out /path/to/signed-output/
```

But signing multiple APKs is not the same as ReVanced patching multiple APKs in one run. ReVanced patch creation and application remains centered on the patchable APK target (typically `base.apk`).

## 6) Find robust things to patch

ReVanced patches should survive app updates, so matching strategy matters more than line-perfect code edits.

Prefer stable attributes:

- return type,
- parameter types/count,
- opcode patterns,
- unique strings/literals,
- class/method structure.

Avoid relying on:

- obfuscated method names only,
- fragile absolute instruction indexes unless guarded by a matcher.

Practical approach:

1. Start with a candidate method.
2. Build a matcher/fingerprint from stable traits.
3. Validate uniqueness (should match exactly what you intend).
4. Only then inject/replace instructions.

## 7) Add patch code in `revanced-patches`

Create a package path by app and feature category. Existing repo conventions follow patterns like:

`patches/src/main/kotlin/app/revanced/patches/<app>/<feature>/...`

For a new app `com.some.app`, example path:

`revanced-patches/patches/src/main/kotlin/app/revanced/patches/someapp/ads/`

Recommended files:

- `Fingerprints.kt` for matching logic
- `<Feature>Patch.kt` for patch declaration and apply logic

### 7.1 Fingerprint example

```kotlin
package app.revanced.patches.someapp.ads

import app.revanced.patcher.gettingFirstMethod
import app.revanced.patcher.patch.BytecodePatchContext

internal val BytecodePatchContext.showAdsMethod by gettingFirstMethod {
    returnType("Z")
    parameterTypes("Landroid/content/Context;")
    strings("sponsored", "ad")
}
```

### 7.2 Bytecode patch example

```kotlin
package app.revanced.patches.someapp.ads

import app.revanced.patcher.patch.bytecodePatch
import app.revanced.util.returnEarly

@Suppress("unused")
val hideAdsPatch = bytecodePatch(
    name = "Hide ads",
    description = "Hides sponsored ads.",
) {
    compatibleWith("com.some.app"("1.2.3", "1.2.4"))

    apply {
        showAdsMethod.returnEarly(false)
    }
}
```

### 7.3 Resource patch example

```kotlin
package app.revanced.patches.someapp.layout

import app.revanced.patcher.patch.resourcePatch
import app.revanced.util.getNode

@Suppress("unused")
val hidePromoBannerPatch = resourcePatch(
    name = "Hide promo banner",
    description = "Removes the promo banner from the main screen.",
) {
    compatibleWith("com.some.app")

    apply {
        document("res/layout/main_screen.xml").use { document ->
            val root = document.getNode("LinearLayout")
            val promo = root.childNodes
                .let { nodes -> (0 until nodes.length).map(nodes::item) }
                .firstOrNull { it.nodeName.contains("Promo", ignoreCase = true) }
            if (promo != null) {
                root.removeChild(promo)
            }
        }
    }
}
```

## 8) Build patch bundle (`.rvp`)

From `revanced-patches`:

```bash
cd /home/hosan/projects/revanced/revanced-patches
./gradlew :patches:build
```

Expected artifact location:

- `revanced-patches/patches/build/libs/patches-<version>.rvp`

## 9) Verify patch is exported and visible

Use CLI list command first:

```bash
java -jar /home/hosan/projects/revanced/revanced-cli/build/libs/revanced-cli-<version>-all.jar \
  list-patches \
  -b -p /home/hosan/projects/revanced/revanced-patches/patches/build/libs/patches-<version>.rvp \
  --packages --versions --options
```

If your patch does not appear, check:

- top-level patch `val` exists,
- `name` is set,
- no classloading/build errors,
- build used latest source.

## 10) Apply patch to an APK and create a new APK

Run patch command with your bundle:

```bash
java -jar /home/hosan/projects/revanced/revanced-cli/build/libs/revanced-cli-<version>-all.jar \
  patch \
  -b -p /home/hosan/projects/revanced/revanced-patches/patches/build/libs/patches-<version>.rvp \
  --exclusive -e "Hide ads" \
  /path/to/input.apk \
  -o /path/to/output-patched.apk
```

Notes:

- `-b` bypasses signature/provenance verification for local testing bundles.
- Remove `--exclusive` if you want default-enabled patches too.
- Use `-Okey=value` for patch options when needed.
- By default, CLI signs the output APK (unless using mount flow).

Optional install in same command:

```bash
... patch ... -i
```

## 11) Fast debug loop for new app support

Use this cycle repeatedly:

1. Modify fingerprint/patch code.
2. `./gradlew :patches:build`
3. `list-patches` to verify metadata/compatibility.
4. `patch` and test output APK.
5. Refine matcher if patch fails after minor app updates.

When patching bytecode, keep patches minimal and modular. If a feature requires large runtime logic, prefer extension-based architecture instead of massive instruction blocks.

## 12) Common failure patterns and fixes

### Patch loads but is "incompatible"

- Ensure `compatibleWith` package name is exact.
- Add tested versions or temporarily test with CLI `--force`.

### Patch not loaded from bundle

- Ensure patch is a public top-level value/method returning `Patch`.
- Ensure patch `name` is not null.

### Resource patch fails at runtime

- Re-check decoded file paths in Apktool output.
- Use defensive XML traversal (null checks).

### Bytecode patch breaks on app update

- Reduce dependence on names and fragile indices.
- Strengthen matcher with opcode/string/parameter shape.

## 13) Suggested contribution quality checklist

- Patch name describes what it does.
- Description is clear and concise.
- `compatibleWith` is accurate.
- Matching is resilient (not just obfuscated names).
- Patch does one thing well.
- Built and tested against at least one known APK version.
- Local `.rvp` verified with `list-patches` before opening PR.

## 14) Quick command reference

```bash
# Build patch bundle
cd /home/hosan/projects/revanced/revanced-patches
./gradlew :patches:build

# Build CLI
cd /home/hosan/projects/revanced/revanced-cli
./gradlew build

# List patches from local bundle
java -jar build/libs/revanced-cli-<version>-all.jar list-patches \
  -b -p ../revanced-patches/patches/build/libs/patches-<version>.rvp

# Patch APK
java -jar build/libs/revanced-cli-<version>-all.jar patch \
  -b -p ../revanced-patches/patches/build/libs/patches-<version>.rvp \
  --exclusive -e "Hide ads" \
  /path/to/input.apk -o /path/to/output.apk

# Extract XAPK and patch base APK
unzip /path/to/input.xapk -d /tmp/xapk
java -jar build/libs/revanced-cli-<version>-all.jar patch \
  -b -p ../revanced-patches/patches/build/libs/patches-<version>.rvp \
  --exclusive -e "Hide ads" \
  /tmp/xapk/base.apk -o /tmp/xapk/base-patched.apk
```

---

If you want, the next step is to create a concrete starter patch for one specific app/package and scaffold the exact files under `revanced-patches/patches/src/main/kotlin/app/revanced/patches/<app>/...`.
