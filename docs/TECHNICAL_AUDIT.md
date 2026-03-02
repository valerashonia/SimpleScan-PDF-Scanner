# Production-Level App Store Readiness Audit

**App:** Document Scanner (Docify)  
**Version:** 1.0.0  
**Audit date:** February 2025  
**Scope:** Full codebase, App Store compliance, subscription flow, UX, legal, security, code quality.

---

## Executive summary

The app is a document scanner with onboarding, subscription paywall, multi-page PDF support, crop, share, and account (Terms, Privacy, Feedback). The audit found **no real in-app purchase or restore flow** (premium is toggled locally), **placeholder contact emails**, **non-functional Subscription screen footer links**, **console.error in production paths**, and **TypeScript type typos**. Fixing critical and medium items is required before submission; optional improvements will strengthen robustness and polish.

---

## 1. Critical issues (must fix before submission)

### 1.1 Placeholder / test contact emails

**Location:** `src/screens/AccountScreen.tsx`  
**Finding:** Terms, Privacy, and Feedback content use placeholder domains:

- `support@yourapp.com` (Terms)
- `privacy@yourapp.com` (Privacy)
- `feedback@yourapp.com` (Feedback form `mailto:`)

**Risk:** App Store rejection (Guideline 2.1 – incomplete / placeholder content), poor user support.  
**Action:** Replace with real support/privacy/feedback emails or remove until you have them.

---

### 1.2 Subscription: no real purchase or restore

**Locations:** `src/contexts/SubscriptionContext.tsx`, `src/screens/SubscriptionScreen.tsx`, `App.tsx`  
**Finding:**

- Premium is stored only in AsyncStorage (`@docify_premium`). Tapping “Continue” on Subscription screen sets `setPremium(true)` with no StoreKit / RevenueCat / Expo IAP.
- Subscription screen footer has “Restore”, “Privacy”, “Terms” but **no `onPress`** – buttons do nothing.
- Pricing text (“$18 per year”, “Free for 3 days”) is shown but no payment is processed.

**Risk:** If you present this as a paid subscription app, rejection (Guideline 3.1.1 – in-app purchase). If the app is free and subscription is “coming soon”, you must not imply that payment is taken (clear labeling; consider hiding or disabling paywall until IAP is implemented).  
**Action:**

- Either implement real IAP (StoreKit/Expo/RevenueCat) and Restore Purchases (required by Apple), then wire Subscription UI to it,
- Or clearly treat the app as free for now: remove or relabel subscription/pricing and document that IAP will be added later.

---

### 1.3 Subscription screen footer links non-functional

**Location:** `src/screens/SubscriptionScreen.tsx` (lines ~136–142)  
**Finding:** “Restore”, “Privacy”, and “Terms” are `TouchableOpacity` with no `onPress`.  
**Risk:** Broken UI, App Store review may test these.  
**Action:** Add handlers: Restore → restore purchases (when IAP exists) or disable; Privacy/Terms → open in-app Terms/Privacy (e.g. same modals as Account) or open URLs.

---

### 1.4 Debug logging in production

**Locations:**

- `src/navigation/TabNavigator.tsx` – `console.error('Error picking document:', error)`
- `src/screens/PreviewScreen.tsx` – `console.error('Crop error:', error)`
- `src/screens/DocumentViewerScreen.tsx` – `console.error('Share error:', error)`, `console.error('Crop error:', error)`
- `src/screens/DashboardScreen.tsx` – `console.error('Share error:', error)`
- `src/screens/HistoryScreen.tsx` – `console.error('Share error:', error)`
- `src/services/imageService.ts` – `console.error('Error picking image:', error)`, `console.error('Error picking images:', error)`
- `src/screens/PassportCameraScreen.tsx` – `console.error('Error taking picture:', error)`

**Risk:** Leaking stack traces or internal info in production; unprofessional.  
**Action:** Remove or guard with `if (__DEV__) { console.error(...) }` and keep user-facing error handling (e.g. `Alert.alert`).

---

### 1.5 TypeScript type typo: duplicate `'pdf'`

**Locations:**

- `src/screens/DocumentViewerScreen.tsx` – `type: 'pdf' | 'pdf' | 'png' | 'image'`, `ExportFormat = 'pdf' | 'pdf' | 'png'`
- `src/screens/DashboardScreen.tsx` – `type: 'pdf' | 'pdf' | 'png' | 'image'`
- `src/screens/HistoryScreen.tsx` – `type: 'pdf' | 'pdf' | 'png' | 'image'`, `performConvert(newType: 'pdf' | 'pdf' | 'png')`

**Risk:** Confusion, possible logic bugs if you later branch on type.  
**Action:** Use a single `'pdf'` (and `'png'`/`'image'` where intended), e.g. `'pdf' | 'png' | 'image'`.

---

## 2. Medium issues (should fix)

### 2.1 Unused import: `Dimensions` in AccountScreen

**Location:** `src/screens/AccountScreen.tsx`  
**Finding:** `Dimensions` is imported from `react-native` but never used (styles use numeric values only).  
**Action:** Remove the `Dimensions` import.

---

### 2.2 PassportCameraScreen: capture error not shown to user

**Location:** `src/screens/PassportCameraScreen.tsx` (around line 70)  
**Finding:** On `takePictureAsync` failure, only `console.error` is used; no `Alert.alert`.  
**Action:** Add `Alert.alert('Error', 'Failed to capture image. Please try again.')` (and remove or guard `console.error` as in 1.4).

---

### 2.3 Legal / About: no copyright

**Location:** `src/screens/AccountScreen.tsx` (About view)  
**Finding:** About shows “Document Scanner”, “Version 1.0.0”, “Made with ❤️” but no copyright or legal entity.  
**Action:** Add a line such as “© 2025 [Your Company Name]. All rights reserved.” (or your actual entity and year).

---

### 2.4 App version source of truth

**Finding:** Version “1.0.0” is hardcoded in AccountScreen and DashboardScreen; `app.json` and `package.json` also have version.  
**Action:** Prefer a single source (e.g. `expo-constants` / `Application.nativeApplicationVersion` or `app.json` at build time) so About and any in-app version stay in sync with the build.

---

### 2.5 Subscription screen: “Continue” without payment

**Finding:** “Continue” calls `onComplete`, which sets premium to true and closes the screen. There is no payment step.  
**Action:** Align with 1.2: either implement IAP and only set premium after a successful purchase (and restore), or clearly treat as free/demo and adjust copy and flow.

---

## 3. Optional improvements

### 3.1 Error handling and loading states

- **PDF share:** Some code paths could show a loading indicator while generating the PDF before share.
- **Crop:** `isCropping` is used; consider disabling navigation or showing a overlay so the user doesn’t leave mid-crop.
- **FileSystem / ImageManipulator:** Failures are often caught with empty `catch` or only logged; consider user-visible messages for critical flows (save, export, crop).

### 3.2 Permission handling

- **Camera:** CameraScreen and PassportCameraScreen use `useCameraPermissions()` and show a “Grant Permission” screen when not granted – good.
- **Photos:** `imageService` requests media library permission and shows an alert when denied – good.
- **app.json:** iOS has `NSCameraUsageDescription`, `NSPhotoLibraryUsageDescription`, `NSPhotoLibraryAddUsageDescription`; Android has CAMERA and storage permissions; expo-camera and expo-image-picker plugins set permission strings – sufficient for current features. If you add microphone later, add `NSMicrophoneUsageDescription`.

### 3.3 Paywall consistency

- Share is gated with `canExportPdf()` and `showUpgrade('pdf_export')` in DocumentViewerScreen, DashboardScreen, HistoryScreen – consistent.
- Scan is gated with `canScan()` and `showUpgrade('daily_limit')` in TabNavigator; add-page is gated with `showUpgrade('add_page')` – good.
- Ensure any other premium-only actions (e.g. Translate) also use the same pattern.

### 3.4 Empty and edge states

- **Dashboard:** Empty state when no documents – present with CTA to scan.
- **History:** Empty state when `filteredDocuments.length === 0` (“No documents found”) – good.
- **DocumentViewer:** When `document.imageUri` is missing, a placeholder with title is shown – acceptable; ensure document list never opens a doc with no pages/URIs if that can happen.
- **Offline:** No explicit offline handling; consider a short message or retry if share/export fails due to network (if applicable).

### 3.5 Code structure and dead code

- No large dead code blocks identified; removing unused `Dimensions` in AccountScreen is the main cleanup.
- SubscriptionContext is clear; TabNavigator holds a lot of logic (camera, gallery, file import, save, documents state) – consider extracting a custom hook or small module for “document persistence” and “capture flow” to improve readability and testability.

### 3.6 Security and data

- Premium and scan count are stored in AsyncStorage only; acceptable for a client-only check. When you add real IAP, validate receipts server-side or via a service (e.g. RevenueCat) and treat client state as UI-only where needed.
- No sensitive data logged in the findings; after wrapping or removing `console.error` (1.4), avoid logging tokens, file paths, or PII.

---

## 4. App Store compliance checklist

| Item | Status | Note |
|------|--------|------|
| Privacy usage descriptions (Camera, Photos) | OK | In app.json and plugins |
| Permission handling in UI | OK | Camera and gallery request and explain |
| Terms of Use | OK | In-app full-screen, accessible from Account |
| Privacy Policy | OK | In-app full-screen, accessible from Account |
| Contact / support | **Fix** | Replace yourapp.com placeholders |
| App version visible | OK | About + Dashboard; consider single source (2.4) |
| Subscription / IAP | **Fix** | No real purchase or restore; align with 1.2 |
| Restore purchases | **Missing** | Required if you offer subscriptions |
| No broken buttons | **Fix** | Subscription footer Restore/Privacy/Terms (1.3) |
| No placeholder content in production | **Fix** | Emails (1.1), subscription copy if no IAP (1.2) |
| Debug logs in production | **Fix** | Wrap or remove console.error (1.4) |

---

## 5. Subscription flow summary

- **Gating:** Scan (daily limit), add page, and PDF export are correctly gated; upgrade callback opens Subscription screen.
- **State:** Premium is persisted in AsyncStorage; no receipt or server validation.
- **Restore:** Not implemented; “Restore” button has no action.
- **Paywall trigger:** Share and scan limits trigger paywall as intended; no bypass found in the paths audited.

---

## 6. UX summary

- **Consistency:** Spacing and layout are consistent; primary color and components reused.
- **Loading:** Splash and camera permission loading exist; PDF generation and crop could benefit from clearer loading (3.1).
- **Errors:** Most critical paths use `Alert.alert`; PassportCameraScreen capture error does not (2.2).
- **Navigation:** Tab and modal flows are coherent; back/close behavior is consistent.
- **Edge cases:** Empty states for no documents and no search results are handled; camera denied is handled.

---

## 7. Legal and content

- Terms of Use and Privacy Policy are accessible from Account and are full-screen with scroll.
- Contact emails in Terms, Privacy, and Feedback are placeholders – replace (1.1).
- Copyright in About is missing – add (2.3).

---

## 8. Recommended fix order

1. Replace placeholder emails and fix Subscription footer links (critical for review and support).
2. Decide subscription strategy: implement IAP + Restore or clearly treat as free/demo; then adjust UI and copy (1.2, 1.3, 2.5).
3. Remove or guard all `console.error` in production (1.4).
4. Fix TypeScript types (1.5) and remove unused `Dimensions` import (2.1).
5. Add user-visible error for passport capture (2.2), copyright in About (2.3), and optional improvements (Section 3) as time allows.

---

## 9. App Store readiness score

| Category | Score | Comment |
|----------|--------|--------|
| Functionality & stability | 75% | Works; subscription is not real IAP; minor UX gaps |
| App Store compliance | 60% | Placeholders, no IAP/restore, broken footer links |
| Code quality | 80% | Clear structure; console logs and type typo |
| Security & privacy | 85% | Permissions and in-app policies in place; emails placeholder |
| UX & edge cases | 80% | Good flows; a few error/loading improvements |

**Overall: 72%** – Not ready for submission until critical items (1.1–1.5) and subscription strategy (1.2, 1.3, 2.5) are addressed. After those fixes and medium items (2.1–2.5), the project can target **85%+** readiness.

---

*End of audit. No code was modified; apply fixes after approval.*
