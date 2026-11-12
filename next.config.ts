import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  serverExternalPackages: ["xlsx", "unpdf", "@napi-rs/canvas", "tesseract.js", "pdf-lib", "@pdf-lib/fontkit", "arabic-reshaper"],
  outputFileTracingIncludes: {
    "/api/customs/ocr": ["./.tessdata/**/*", "./public/fonts/**/*"],
    "/api/export": ["./public/fonts/**/*"],
  },
};

export default nextConfig;
