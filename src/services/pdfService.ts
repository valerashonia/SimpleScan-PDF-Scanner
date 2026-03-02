import * as FileSystem from 'expo-file-system/legacy';
import * as Print from 'expo-print';
import { Platform, Share } from 'react-native';
import * as ImageManipulator from 'expo-image-manipulator';

/**
 * Shares a document as PDF (or message-only if no image URIs).
 * Call after checking canExportPdf() for premium gating.
 */
export async function shareDocumentAsPdf(
  pageUris: string[],
  title: string
): Promise<void> {
  const safeTitle = (title || 'Document').replace(/\.(jpg|jpeg|png)$/i, '') + '.pdf';
  if (!pageUris.length) {
    await Share.share({ message: `Sharing document: ${title}`, title });
    return;
  }
  const pdfUri = await generatePdfFromImages(pageUris);
  await Share.share({ url: pdfUri, title: safeTitle });
}

/**
 * Generates a PDF file from an array of image URIs (one page per image).
 * Returns the local file URI of the generated PDF.
 */
export async function generatePdfFromImages(
  imageUris: string[],
  options?: { base64?: boolean }
): Promise<string> {
  if (!imageUris.length) {
    throw new Error('At least one image is required');
  }

  const useBase64 = options?.base64 !== false;
  const imageSources: string[] = [];

  for (const uri of imageUris) {
    if (useBase64) {
      let dataUri: string | null = null;
      const normalizedUri = uri.startsWith('file://') || uri.startsWith('content://')
        ? uri
        : (uri.startsWith('/') ? `file://${uri}` : uri);

      try {
        const base64 = await FileSystem.readAsStringAsync(normalizedUri, {
          encoding: FileSystem.EncodingType.Base64,
        });
        const trimmed = (base64 || '').trim();
        if (trimmed.length > 0) {
          const mime = uri.toLowerCase().endsWith('.png') ? 'image/png' : 'image/jpeg';
          dataUri = `data:${mime};base64,${trimmed}`;
        }
      } catch (_e) {
        // Fallback: on Android content:// copy to cache
        if (normalizedUri.startsWith('content://')) {
          try {
            const filename = `img_${Date.now()}_${imageSources.length}.jpg`;
            const dest = `${FileSystem.cacheDirectory}${filename}`;
            await FileSystem.copyAsync({ from: normalizedUri, to: dest });
            const base64 = await FileSystem.readAsStringAsync(dest, {
              encoding: FileSystem.EncodingType.Base64,
            });
            const trimmed = (base64 || '').trim();
            if (trimmed.length > 0) {
              dataUri = `data:image/jpeg;base64,${trimmed}`;
            }
            await FileSystem.deleteAsync(dest, { idempotent: true });
          } catch (_e2) {
            // skip
          }
        }
        // Fallback: use ImageManipulator for ph:// or other unreadable URIs (e.g. iOS gallery)
        if (!dataUri) {
          try {
            const result = await ImageManipulator.manipulateAsync(
              uri,
              [],
              { compress: 1, format: ImageManipulator.SaveFormat.JPEG }
            );
            if (result?.uri) {
              const base64 = await FileSystem.readAsStringAsync(result.uri, {
                encoding: FileSystem.EncodingType.Base64,
              });
              const trimmed = (base64 || '').trim();
              if (trimmed.length > 0) {
                dataUri = `data:image/jpeg;base64,${trimmed}`;
              }
            }
          } catch (_e3) {
            // skip this image
          }
        }
      }

      if (dataUri) {
        imageSources.push(dataUri);
      }
    } else {
      const u = uri.startsWith('file://') ? uri : `file://${uri}`;
      imageSources.push(u);
    }
  }

  if (!imageSources.length) {
    throw new Error('Could not load any image for PDF');
  }

  // One image per page; fixed size so PDF renders reliably (A4-like 595x842 pt)
  const pageContent = imageSources
    .map(
      (src) => `
    <div style="width: 595px; height: 842px; page-break-after: always; display: flex; align-items: center; justify-content: center; background: white;">
      <img src="${src}" style="max-width: 100%; max-height: 100%; width: auto; height: auto; object-fit: contain;" />
    </div>
  `
    )
    .join('');

  const html = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { margin: 0; padding: 0; }
    img { display: block; }
    @media print {
      div { page-break-after: always; }
      div:last-child { page-break-after: auto; }
    }
  </style>
</head>
<body>
  ${pageContent}
</body>
</html>`;

  const printOptions: Print.FilePrintOptions = {
    html,
    base64: false,
    width: 595,
    height: 842,
  };

  if (Platform.OS === 'ios') {
    (printOptions as Record<string, unknown>).useMarkupFormatter = false;
  }

  const { uri } = await Print.printToFileAsync(printOptions);

  return uri;
}
