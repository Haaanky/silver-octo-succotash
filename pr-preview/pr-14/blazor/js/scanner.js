let scanStream = null;
let scanAnimationId = null;
let scanControls = null; // ZXing scanner controls (fallback path)

export async function startScanner(dotnetRef, videoElementId) {
    try {
        scanStream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } });
        const video = document.getElementById(videoElementId);
        if (!video) return { success: false, error: 'Videoelement hittades inte.' };

        if ('BarcodeDetector' in window) {
            // Native BarcodeDetector – Chrome on Android/Desktop
            video.srcObject = scanStream;
            await video.play();

            const detector = new BarcodeDetector();

            const scan = async () => {
                if (video.readyState === video.HAVE_ENOUGH_DATA) {
                    try {
                        const barcodes = await detector.detect(video);
                        if (barcodes.length > 0) {
                            await dotnetRef.invokeMethodAsync('OnBarcodeDetected', barcodes[0].rawValue);
                        }
                    } catch (_) { /* ignore frame errors */ }
                }
                scanAnimationId = requestAnimationFrame(scan);
            };

            video.addEventListener('play', () => {
                scanAnimationId = requestAnimationFrame(scan);
            });
        } else {
            // ZXing fallback – iOS, Firefox, and other browsers without BarcodeDetector
            const { BrowserMultiFormatReader } = await import('https://esm.sh/@zxing/browser@0.1.5');
            const reader = new BrowserMultiFormatReader();
            scanControls = await reader.decodeFromStream(scanStream, video, async (result) => {
                if (result) {
                    scanControls?.stop();
                    scanControls = null;
                    await dotnetRef.invokeMethodAsync('OnBarcodeDetected', result.getText());
                }
            });
        }

        return { success: true, error: null };
    } catch (err) {
        return { success: false, error: err.message };
    }
}

export function stopScanner() {
    if (scanAnimationId) {
        cancelAnimationFrame(scanAnimationId);
        scanAnimationId = null;
    }
    if (scanControls) {
        scanControls.stop();
        scanControls = null;
    }
    if (scanStream) {
        scanStream.getTracks().forEach(t => t.stop());
        scanStream = null;
    }
}
