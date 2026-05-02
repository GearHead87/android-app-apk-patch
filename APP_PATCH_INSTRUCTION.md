# Universal app patch workflow — decompile, rebuild, package, and ReVanced patches

This document describes a **generic** workflow: how to take an Android **APK** or **XAPK**, analyze it, rebuild and sign artifacts, optionally author **ReVanced** patches under `revanced-patches`, and how **per-app documentation** fits in. It does **not** name any specific application.

---

## Tools reference (tagged)

Use this index when scanning sections; each major step names the same tags in context.

| Tag | Tool / component | Role |
|-----|-------------------|------|
| `jdk` | JDK 17 | Build patches and CLI; run Java JARs |
| `git` | Git | Version control for patch sources |
| `gradle` | Gradle | Build `revanced-patches` (`.rvp`) and `revanced-cli` |
| `jadx` | JADX | Decompile APK to Java-like sources for navigation and logic discovery |
| `apktool` | Apktool | Decode APK to smali/resources; rebuild APK after manual edits |
| `unzip` | unzip | Extract `.xapk` / `.zip` containers |
| `adb` | Android Debug Bridge | Install, logcat, optional device testing |
| `zipalign` | zipalign (Android build-tools) | Align APK for distribution (often before sign) |
| `signer` | apksigner or uber-apk-signer | Sign APK(s) after build |
| `revanced-patches` | `revanced-patches` repo | Patch definitions; produces `.rvp` bundle |
| `revanced-cli` | `revanced-cli` | `list-patches`, `patch` — applies bundle to an APK |
| `revanced-patcher` | `revanced-patcher` (library) | Patch engine used by CLI (bytecode/resources) |
| `revanced-library` | `revanced-library` | Repackage, align, sign helpers in the stack |

Optional: **Android Studio** or **smali/baksmali** for deeper bytecode work; **aapt/aapt2** for resource inspection.

---

## 1. Inputs: APK vs XAPK

- **Single APK** — one file; typical direct input for analysis and for `revanced-cli patch`.
- **XAPK (or split bundle)** — usually a ZIP containing `manifest.json`, a **base** APK, and zero or more **split** APKs (ABI, density, locale, etc.).

**ReVanced note:** The CLI patches **one APK per run** (normally the base APK). Splits are not patched as a single multi-APK session by the CLI; you patch the base, then re-package splits for install if your distribution method requires the full bundle.

---

## 2. Extracting a container (XAPK / multi-APK zip)

**Tools:** `unzip`

1. Create a working directory for the version you are targeting.
2. Unzip the container into a folder (e.g. `split_apks/` or `extracted/`).
3. Open `manifest.json` (if present) and note:
   - which file is the **base** APK,
   - split filenames,
   - package identity metadata.

Keep the original filenames and structure if you plan to **reassemble** the same XAPK layout later.

---

## 3. Decompile for analysis

### 3.1 JADX — high-level code and strings

**Tools:** `jadx`, `jdk`

```bash
jadx -d /path/to/out-jadx /path/to/base.apk
```

Use for: class/method search, call flow, string literals, understanding behavior before writing fingerprints.

### 3.2 Apktool — smali + resources

**Tools:** `apktool`, `jdk`

```bash
java -jar /path/to/apktool.jar d /path/to/base.apk -o /path/to/out-apktool -f
```

If resource decoding needs a dedicated framework path (some environments):

```bash
mkdir -p /path/to/apktool-framework
java -jar /path/to/apktool.jar d /path/to/base.apk -o /path/to/out-apktool -f --frame-path /path/to/apktool-framework
```

Use for: `res/`, `AndroidManifest.xml` (decoded), smali edits for **manual** rebuild workflows, verifying instruction-level details.

---

## 4. Compile / rebuild (manual Apktool path)

**Tools:** `apktool`, `jdk`, `zipalign`, `signer`

1. After editing smali/resources under the Apktool project directory:

```bash
java -jar /path/to/apktool.jar b /path/to/out-apktool -o /path/to/unsigned.apk
```

2. Align (typical pipeline before signing):

```bash
zipalign -p -f 4 /path/to/unsigned.apk /path/to/aligned.apk
```

3. Sign with your chosen signer, e.g. **uber-apk-signer** or **apksigner**:

```bash
java -jar /path/to/uber-apk-signer.jar --apks /path/to/aligned.apk
```

For **multiple** APKs (e.g. base + splits), many signers accept a directory of APKs; signing is separate from **ReVanced** patching (which targets one input APK at a time).

---

## 5. Producing a distributable APK

**Tools:** `zipalign`, `signer`, optionally `adb`

- One **signed, aligned** APK is sufficient for sideloading when the app does not require split delivery.
- Test install: `adb install -r /path/to/signed.apk` (adjust flags if replacing a different signature).

---

## 6. Producing an XAPK-style bundle again (generic)

**Tools:** `unzip` (reverse: use `zip` or your packaging script), `signer`

There is no single standard command in this repo that “builds XAPK” for all stores; the usual approach is:

1. Start from the **extracted** layout you preserved.
2. Replace the **base** APK with your rebuilt/signed base (same filename as in `manifest.json` if you rely on unchanged manifest).
3. Ensure **split** APKs are the ones you intend (original or re-signed copies as required by your install method).
4. Zip the contents with the **same outer structure** your target loader expects (often `.xapk` extension and `manifest.json` at root).

Document **your** naming and staging folders in the per-app markdown (see section 9). For a generic description of `split_apks/`, `xapk_staging/`, and related directories, see section 7.

---

## 7. High-level folder layout (after extract, decompile, patch, rebuild)

Once you have a **target version workspace** (one directory per package version you care about), the tree below is a typical end state. Names are **conventions**, not requirements; adjust to your own layout. Nothing here refers to a specific product.

### 7.1 Per-version directory under `apps/` (or your chosen root)

**Purpose:** Hold every artifact for **one** base APK version: originals, analysis outputs, rebuilt APKs, and optional XAPK packaging.

```text
apps/<version_workspace>/
├── split_apks/              # extracted container (see 7.1.1)
├── apktool-framework/       # optional Apktool framework cache (see 7.1.2)
├── decompiled_jadx/         # JADX output — read-only analysis (see 7.1.3)
├── decompiled_apktool/      # Apktool project — smali/res/assets (see 7.1.4)
├── patched_apks/            # post-patch / pre-sign APK set (see 7.1.5)
├── signed_apks/             # aligned + signed APKs (see 7.1.6)
├── xapk_staging/            # files laid out to zip as a bundle (see 7.1.7)
└── (optional) final_bundle.xapk   # zipped staging (see 7.1.8)
```

| Folder / artifact | Purpose | Populated by (tools) |
|-------------------|---------|----------------------|
| `split_apks/` | Stores `manifest.json`, base APK, split APKs, icons, and any other files from the original **XAPK/ZIP** so filenames stay traceable for repackaging. | `unzip` |
| `apktool-framework/` | Writable cache of framework APKs Apktool uses when decoding resources; avoids decode failures in restricted environments. | `apktool` (`--frame-path`) |
| `decompiled_jadx/` | Java-like sources for **navigation and reasoning** only; not a rebuild source of truth. | `jadx` |
| `decompiled_apktool/` | Decoded **smali**, `res/`, `assets/`, decoded manifest — used for manual smali/asset edits and `apktool b` rebuilds. | `apktool` |
| `patched_apks/` | Holds the **base** APK after `revanced-cli patch` (and often copies of **unchanged** splits next to it) before signing, or Apktool-built unsigned outputs if you stage that way. | `revanced-cli`, shell copy/`cp` |
| `signed_apks/` | **zipalign**-friendly pipeline output: aligned and **signed** APKs ready for `adb install` or for copying into staging. | `zipalign`, `signer` |
| `xapk_staging/` | Same inner layout as the original bundle (e.g. `manifest.json` + APK names) so you can create a distributable **multi-APK zip** without mixing unrelated files. | shell copy/`cp`, `zip` |
| Final `.xapk` (optional) | Single file artifact produced by zipping `xapk_staging/` (or equivalent) for tools that expect that extension. | `zip` |

#### 7.1.1 `split_apks/`

- **Purpose:** Single place for **inputs** after unpacking a multi-APK container.
- **Tools:** `unzip`.

#### 7.1.2 `apktool-framework/`

- **Purpose:** Optional but recommended when `apktool d` needs an explicit framework path.
- **Tools:** `apktool` (creates/updates when using `--frame-path`).

#### 7.1.3 `decompiled_jadx/`

- **Purpose:** Quick search of classes, methods, and strings; understanding call graphs.
- **Tools:** `jadx`.
- **Note:** Rebuild flows use **Apktool** or **ReVanced**, not JADX output.

#### 7.1.4 `decompiled_apktool/`

- **Purpose:** The editable project for **manual** changes (smali, resources, bundled assets) and verification against bytecode.
- **Tools:** `apktool` decode (`d`) and build (`b`).

#### 7.1.5 `patched_apks/`

- **Purpose:** Isolate **outputs that are not yet signed** (e.g. CLI-patched base APK, or rebuilt base before `zipalign`/sign). Keeps “dirty” intermediates out of `split_apks/`.
- **Tools:** `revanced-cli` (`patch`), optionally `apktool` (`b`), file copy.

#### 7.1.6 `signed_apks/`

- **Purpose:** Only **install-ready** APKs (aligned + signed). Feeds device testing and can be copied into `xapk_staging/` when rebuilding a bundle.
- **Tools:** `zipalign`, `signer` (`uber-apk-signer` / `apksigner`).

#### 7.1.7 `xapk_staging/`

- **Purpose:** Pre-zip directory that mirrors the **publisher bundle** structure (manifest + APK filenames). Lets you swap in your signed base (and splits if needed) without touching raw downloads.
- **Tools:** shell / `cp`, then `zip` for the outer file.

#### 7.1.8 Optional final bundle file

- **Purpose:** One deliverable for sideloaders that consume `.xapk` (or similarly structured zips).
- **Tools:** `zip` (or your packaging script).

### 7.2 Patch sources and build artifacts (`revanced-patches`)

These live in the **patches repository**, not inside `apps/<version_workspace>/`.

```text
revanced-patches/
├── patches/src/main/kotlin/...   # patch and fingerprint sources
└── patches/build/libs/*.rvp      # built bundle (`.rvp`)
```

| Path | Purpose | Tools |
|------|---------|--------|
| `patches/src/main/kotlin/...` | Kotlin sources: fingerprints, `bytecodePatch` / `resourcePatch` definitions, options. | editor, `git`, `gradle` |
| `patches/build/libs/patches-*.rvp` | Compiled **patch bundle** consumed by `revanced-cli list-patches` / `patch`. | `gradle` (`:patches:build`), `jdk` |

### 7.3 Flow summary (which folder is “when”)

1. **Extract** container → `split_apks/`.
2. **Analyze** → `decompiled_jadx/` (optional) + `decompiled_apktool/` (and optional `apktool-framework/`).
3. **Implement** patches → `revanced-patches/.../kotlin/...`; build → `*.rvp`.
4. **Apply** patches to base APK → output to `patched_apks/` (typical).
5. **Align + sign** → `signed_apks/`.
6. **Re-bundle** (if needed) → copy into `xapk_staging/` → zip → final `.xapk` (optional).

---

## 8. ReVanced patch pipeline (bytecode / resources)

**Tools:** `revanced-patches`, `gradle`, `jdk`, `revanced-cli`, `revanced-patcher`, `revanced-library`

### 8.1 Author patches

- Implement patches under `revanced-patches` (e.g. Kotlin sources under `patches/src/main/kotlin/...`).
- Use fingerprints/matchers that prefer stable traits (signatures, strings, opcode shapes), not only obfuscated names.
- Expose each patch as a **top-level** patch entry so it is bundled (see project conventions and `NEW_APP_PATCH_DEVELOPMENT_GUIDE.md` in this workspace).

### 8.2 Build the bundle

```bash
cd /path/to/revanced-patches
./gradlew :patches:build
```

Artifact: `patches/build/libs/patches-<version>.rvp` (exact path may vary by version).

### 8.3 List and apply with CLI

**Tools:** `revanced-cli`, `jdk`

```bash
java -jar /path/to/revanced-cli-all.jar list-patches \
  -b -p /path/to/patches-<version>.rvp \
  --packages --versions --options
```

```bash
java -jar /path/to/revanced-cli-all.jar patch \
  -b -p /path/to/patches-<version>.rvp \
  --exclusive -e "Patch display name" \
  /path/to/base.apk \
  -o /path/to/output-patched.apk
```

Adjust `-e`, options, and flags per project docs. CLI typically signs output unless configured otherwise.

---

## 9. Applied patch workflow — how the maintainer and assistant collaborate

This section is **process**, not tied to one product.

### 9.1 What the user provides

The user states **what** to look for and **what** behavior to change, for example:

- symptoms or UI flows to unlock/remove,
- suspected layer (native vs web assets),
- constraints (must work on specific version codes, no server changes, etc.).

### 9.2 What you do in `revanced-patches`

1. Use **JADX** / **Apktool** (and assets inspection if the logic lives in JS or other files) to locate stable anchors.
2. Add or update patches under `revanced-patches` (fingerprints, bytecode patches, resource patches) following repository conventions.
3. Build `.rvp`, run `list-patches` and `patch` against the **base APK** for the target version.

### 9.3 Per-app markdown deliverable

For each app/version you support, maintain a **dedicated** markdown file (alongside other app docs in your tree) that records:

| Section | Purpose |
|--------|---------|
| Identity | Package name, human-readable name, version string/code, artifact source type (generic) |
| Goal | What the patch achieves (one behavior per patch when possible) |
| Analysis notes | How the target was found (JADX path, strings, smali method descriptors) |
| Patch location | Paths inside `revanced-patches` (e.g. package dirs, `Fingerprints.kt`, patch Kotlin file) |
| Code description | What the patch does at bytecode/resource level (return early, replace call, XML change), not only the high-level wish |
| Manual path (if any) | Apktool folder layout, smali or asset edits for non-ReVanced or verification steps |
| Build & package | Exact decompile/rebuild/sign commands, and how APK vs XAPK outputs are staged |
| Test | `adb` or device checks, failure modes |

This keeps **universal** instructions (this file) separate from **instance** instructions (per-app file with paths and code references).

---

## 10. Prerequisites and credentials (generic)

**Tools:** `jdk`, `git`, `gradle`

- **JDK 17** for building ReVanced components.
- Gradle may need access to **GitHub Packages**; if dependency resolution fails, configure `gpr.user` / `gpr.key` in `~/.gradle/gradle.properties` per your organization’s docs.

---

## 11. Quick checklist

1. [ ] Obtain **base** APK (from standalone APK or extracted XAPK).
2. [ ] **JADX** + **Apktool** analysis as needed.
3. [ ] Implement **ReVanced** patches in `revanced-patches`; build **`.rvp`**.
4. [ ] **`revanced-cli patch`** base APK; verify output.
5. [ ] Optional: **manual Apktool** rebuild path for assets/smali-only changes.
6. [ ] **zipalign** + **sign**; optional **XAPK** re-packaging with preserved manifest layout.
7. [ ] **Document** in a per-app markdown file: patch file paths, code-level description, and reproducible commands.

---

*This file is intentionally app-agnostic. Pair it with a per-app guide for concrete paths, versions, and patch names.*
