# Info.plist / Permission Strings — App Store Compliance Audit

**App:** Document Scanner (Docify)  
**Audit date:** February 2025  
**Source:** `app.json` → `expo.ios.infoPlist` (Expo generates `Info.plist` at build from this)

---

## Summary: **Compliant — no rejection expected for permission strings**

All required usage description keys are present, wording is specific and non-placeholder, and there are no missing or generic entries that would typically trigger App Store rejection.

---

## 1. Required keys — present and correct

| Key | Required for your app? | Present? | Your value |
|-----|------------------------|----------|------------|
| **NSCameraUsageDescription** | Yes (document + passport camera) | ✅ Yes | *"This app uses the camera to scan documents."* |
| **NSPhotoLibraryUsageDescription** | Yes (import from gallery) | ✅ Yes | *"This app accesses your photos to import documents."* |
| **NSPhotoLibraryAddUsageDescription** | Only if you save to Photos | ✅ Yes | *"This app saves scanned documents to your photo library."* |

- **NSCameraUsageDescription** — Exists and is user-friendly. Clearly states the app uses the camera to scan documents. Not generic; no placeholder.
- **NSPhotoLibraryUsageDescription** — Exists. Accurately describes reading from the photo library to import documents.
- **NSPhotoLibraryAddUsageDescription** — Exists. Accurately describes saving scanned documents to the photo library. (Your app currently shares via the system share sheet; if you later add “Save to Photos,” this key is already correct.)

---

## 2. App Store reviewer perspective

- **No generic or placeholder text** — No “We need access,” “Required for the app,” or “TBD” style text.
- **Purpose is clear** — Each string explains *why* access is needed (scan, import, save).
- **No missing required keys** — For an app that uses camera and photo library read (and optionally write), all three keys are present.
- **No misleading claims** — Descriptions match actual behavior (camera for scanning, photos for import/save).

**Conclusion:** Permission strings alone should **not** cause rejection. They meet Guideline 5.1.1 (Data Collection and Storage) and the requirement for clear, purpose-specific usage descriptions.

---

## 3. Optional improvements (not required for approval)

- **NSCameraUsageDescription** — You could slightly expand for passport/ID use if you want to be extra explicit, e.g.  
  *"Document Scanner uses the camera to scan documents and to capture photos of IDs or passports."*  
  Current text is acceptable as-is.
- **Expo plugin strings** — You also have `expo-camera` and `expo-image-picker` plugins with their own permission messages in `app.json`. At build time, Expo may merge these with `ios.infoPlist`. If you ever see different text on the device, it may be coming from the plugin. Your `infoPlist` entries are the right place to control the final text; if a plugin overwrites them, consider setting the same (or better) text in the plugin config so the built `Info.plist` stays consistent.

---

## 4. What was not checked

- **NSMicrophoneUsageDescription** — Not required unless you use the microphone (e.g. video recording with sound). Your app uses the camera for stills only; no need to add this.
- **Other keys** (e.g. location, Bluetooth) — Not used by your app; no audit needed.

---

## 5. Recommendation

**Ship as-is** from an Info.plist/permission-string standpoint. No changes are required for App Store compliance. Optional: tighten camera description if you want to explicitly mention passport/ID capture.
