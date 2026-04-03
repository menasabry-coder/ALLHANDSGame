"use client";

import { useEffect, useState } from "react";
import Image from "next/image";

interface Props {
  /** The URL or text to encode as a QR code */
  value: string;
  /** Size in pixels (default 200) */
  size?: number;
}

/**
 * Renders a QR code as an <img> tag using the `qrcode` library.
 * The QR code is generated client-side as a data-URL.
 */
export default function QRCode({ value, size = 200 }: Props) {
  const [dataUrl, setDataUrl] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    import("qrcode").then((QRCodeLib) => {
      QRCodeLib.toDataURL(value, {
        width: size,
        margin: 2,
        color: { dark: "#ffffffFF", light: "#00000000" },
      }).then((url: string) => {
        if (!cancelled) setDataUrl(url);
      });
    });
    return () => {
      cancelled = true;
    };
  }, [value, size]);

  if (!dataUrl) {
    return (
      <div
        className="animate-pulse bg-gray-700 rounded-lg"
        style={{ width: size, height: size }}
      />
    );
  }

  return (
    <Image
      src={dataUrl}
      alt={`QR code for ${value}`}
      width={size}
      height={size}
      className="rounded-lg"
      unoptimized
    />
  );
}
