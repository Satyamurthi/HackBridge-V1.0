import { describe, it, expect, beforeAll } from "vitest";
import { isValidUpiId, buildUpiPaymentUri, generateUpiQrCode } from "../src/lib/upi-qr";
import { prisma } from "../src/lib/db";

describe("Phase 9: Compulsory UPI ID & Dual QR (Autogen / Custom Upload)", () => {
  let hostId: string;

  beforeAll(async () => {
    const user = await prisma.user.findUnique({
      where: { email: "host.mit@college.edu" },
      include: { hostProfile: true },
    });
    hostId = user?.hostProfile?.id!;
  });

  describe("UPI ID Validation Rules", () => {
    it("accepts valid NPCI Virtual Payment Address formats", () => {
      expect(isValidUpiId("acm.council@oksbi")).toBe(true);
      expect(isValidUpiId("technofest2027@icici")).toBe(true);
      expect(isValidUpiId("9876543210@paytm")).toBe(true);
      expect(isValidUpiId("hackbridge_organizer@upi")).toBe(true);
      expect(isValidUpiId("dept-cs@hdfcbank")).toBe(true);
    });

    it("rejects invalid or malformed UPI ID strings", () => {
      expect(isValidUpiId("")).toBe(false);
      expect(isValidUpiId("   ")).toBe(false);
      expect(isValidUpiId("notanupi")).toBe(false);
      expect(isValidUpiId("@oksbi")).toBe(false);
      expect(isValidUpiId("organizer@")).toBe(false);
      expect(isValidUpiId("spaces in@upi")).toBe(false);
      expect(isValidUpiId("test@@bank")).toBe(false);
    });
  });

  describe("UPI Deep Link URI Construction", () => {
    it("builds compliant NPCI URI with amount, payee, and notes", () => {
      const uri = buildUpiPaymentUri({
        upiId: "organizer@oksbi",
        payeeName: "HackBridge Championship",
        amount: 299,
        note: "Team Alpha Registration",
      });

      expect(uri).toContain("upi://pay?");
      expect(uri).toContain("pa=organizer%40oksbi");
      expect(uri).toContain("pn=HackBridge%20Championship");
      expect(uri).toContain("am=299.00");
      expect(uri).toContain("cu=INR");
      expect(uri).toContain("tn=Team%20Alpha%20Registration");
    });
  });

  describe("Real-time QR Code Generation", () => {
    it("generates a high-contrast base64 PNG data URL", async () => {
      const qrDataUrl = await generateUpiQrCode({
        upiId: "organizer@oksbi",
        payeeName: "HackBridge Championship",
        amount: 499,
        note: "Arena Entry",
      });

      expect(qrDataUrl).toBeDefined();
      expect(qrDataUrl.startsWith("data:image/png;base64,")).toBe(true);
      expect(qrDataUrl.length).toBeGreaterThan(500);
    });
  });

  describe("Database Persistence for UPI ID and QR Code", () => {
    it("persists compulsory upiId and qrImageUrl on a Hackathon record", async () => {
      const slug = `upi-test-hackathon-${Date.now()}`;
      const autogenQr = await generateUpiQrCode({
        upiId: "council@oksbi",
        payeeName: "Test Hackathon",
        amount: 199,
      });

      const hackathon = await prisma.hackathon.create({
        data: {
          hostId,
          title: "National AI Sprint",
          slug,
          description: "Testing compulsory UPI and QR fields",
          rules: "Standard fair play rules apply strictly.",
          teamMin: 1,
          teamMax: 4,
          fee: 199,
          paymentMode: "QR",
          upiId: "council@oksbi",
          qrImageUrl: autogenQr,
          status: "DRAFT",
          startAt: new Date(Date.now() + 86400000),
          endAt: new Date(Date.now() + 172800000),
        },
      });

      expect(hackathon.id).toBeDefined();
      expect(hackathon.upiId).toBe("council@oksbi");
      expect(hackathon.qrImageUrl).toBeDefined();
      expect(hackathon.qrImageUrl?.startsWith("data:image/png;base64,")).toBe(true);
      expect(hackathon.paymentMode).toBe("QR");
    });

    it("persists host payment setup with updated upiId and qrImageUrl", async () => {
      const customQrBase64 = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==";

      const updatedHost: any = await prisma.hostProfile.update({
        where: { id: hostId },
        data: {
          upiId: "dept.cse@hdfcbank",
          qrImageUrl: customQrBase64,
          bankAccountName: "Department of Computer Science",
        } as any,
      });

      expect(updatedHost.upiId).toBe("dept.cse@hdfcbank");
      expect(updatedHost.qrImageUrl).toBe(customQrBase64);
      expect(updatedHost.bankAccountName).toBe("Department of Computer Science");
    });
  });
});
