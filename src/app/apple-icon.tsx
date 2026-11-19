import { ImageResponse } from "next/og";
import { LogoMark } from "@/components/brand/logo-mark";

/**
 * The iPhone / iPad home-screen icon (180 × 180 px), from the same logo.
 * Square corners: iOS rounds them itself.
 */
export const size = { width: 180, height: 180 };
export const contentType = "image/png";

export default function AppleIcon() {
  return new ImageResponse(<LogoMark size={180} rounded={false} />, size);
}
