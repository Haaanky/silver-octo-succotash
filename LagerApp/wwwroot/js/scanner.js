let scanStream = null;
let scanAnimationId = null;

export async function startScanner(dotnetRef, videoElementId) {
    try {
        if (!('BarcodeDetector' in window)) {
            return { success: false, error: 'BarcodeDetector stöds inte i den här webbläsaren. Prova Chrome eller Edge.' };
        }

        scanStream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } });
        const video = document.getElementById(videoElementId);
        if (!video) return { success: false, error: 'Videoelement hittades inte.' };

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
    if (scanStream) {
        scanStream.getTracks().forEach(t => t.stop());
        scanStream = null;
    }
}
