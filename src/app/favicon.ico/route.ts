import { NextResponse } from "next/server";

export async function GET() {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32" width="32" height="32">
  <rect width="32" height="32" rx="8" fill="#0B0E18"/>
  <rect x="1" y="1" width="30" height="30" rx="7" fill="none" stroke="#6366F1" stroke-width="1.5" stroke-opacity="0.4"/>
  <path d="M9 10v12M23 10v12M9 16h14" stroke="#6366F1" stroke-width="2.5" stroke-linecap="round"/>
</svg>`;

  return new NextResponse(svg, {
    status: 200,
    headers: {
      "Content-Type": "image/svg+xml",
      "Cache-Control": "public, max-age=86400",
    },
  });
}
