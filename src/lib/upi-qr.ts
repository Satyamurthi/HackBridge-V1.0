import QRCode from "qrcode";

/**
 * Validates whether a string is a well-formed UPI Virtual Payment Address (VPA).
 * Format: username@bank (e.g. organizer@okhdfcbank, cse.council@sbi, 9876543210@paytm)
 */
export function isValidUpiId(upiId: string): boolean {
  if (!upiId || typeof upiId !== "string") return false;
  const trimmed = upiId.trim();
  const upiRegex = /^[a-zA-Z0-9.\-_]{2,64}@[a-zA-Z0-9.\-_]{2,32}$/;
  return upiRegex.test(trimmed);
}

export interface UpiUriOptions {
  upiId: string;
  payeeName?: string;
  amount?: number;
  note?: string;
  currency?: string;
}

/**
 * Generates the official NPCI UPI Deep Link URI.
 * Format: upi://pay?pa={vpa}&pn={name}&am={amount}&cu=INR&tn={transactionNote}
 */
export function buildUpiPaymentUri({
  upiId,
  payeeName,
  amount,
  note,
  currency = "INR",
}: UpiUriOptions): string {
  const cleanUpi = upiId.trim();
  const parts: string[] = [`pa=${encodeURIComponent(cleanUpi)}`];

  if (payeeName && payeeName.trim()) {
    parts.push(`pn=${encodeURIComponent(payeeName.trim().slice(0, 50))}`);
  }

  if (amount !== undefined && amount !== null && amount > 0) {
    parts.push(`am=${Number(amount).toFixed(2)}`);
  }

  parts.push(`cu=${currency}`);

  if (note && note.trim()) {
    parts.push(`tn=${encodeURIComponent(note.trim().slice(0, 80))}`);
  }

  return `upi://pay?${parts.join("&")}`;
}

export interface UpiQrOptions extends UpiUriOptions {
  width?: number;
  margin?: number;
}

/**
 * Generates a high-resolution base64 PNG data URL encoding the UPI payment link.
 * Optimized with high contrast and optimal error correction for all mobile scanner apps
 * (Google Pay, PhonePe, Paytm, BHIM, Cred, and mobile banking apps).
 */
export async function generateUpiQrCode(options: UpiQrOptions): Promise<string> {
  const uri = buildUpiPaymentUri(options);
  return QRCode.toDataURL(uri, {
    width: options.width || 480,
    margin: options.margin !== undefined ? options.margin : 2,
    errorCorrectionLevel: "M",
    color: {
      dark: "#030407",
      light: "#FFFFFF",
    },
  });
}

/**
 * Validates and converts an uploaded user image file (PNG/JPG/WEBP) to a base64 data URL.
 */
export function readQrImageFile(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const validTypes = ["image/png", "image/jpeg", "image/jpg", "image/webp", "image/svg+xml"];
    if (!validTypes.includes(file.type)) {
      return reject(new Error("Invalid image format. Please upload a PNG, JPG, or WebP image."));
    }

    const maxSize = 5 * 1024 * 1024; // 5 MB
    if (file.size > maxSize) {
      return reject(new Error("File size exceeds 5 MB limit."));
    }

    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === "string") {
        resolve(reader.result);
      } else {
        reject(new Error("Failed to process QR code image."));
      }
    };
    reader.onerror = () => reject(new Error("Error reading image file."));
    reader.readAsDataURL(file);
  });
}
