import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  serverExternalPackages: ["sharp"],
  // /blog used to be the archive page; the archive now lives at / (see
  // src/app/(public)/page.tsx), so old links and bookmarks are sent there.
  async redirects() {
    return [{ source: "/blog", destination: "/", permanent: true }];
  },
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "*.public.blob.vercel-storage.com",
      },
    ],
    // Next 16 defaults to quality 75 only; add 90 for the post body so a
    // `quality={90}` prop isn't silently coerced back down to 75.
    qualities: [75, 90],
    // AVIF first (smaller at equal quality), WebP as the fallback for
    // browsers that don't support it.
    formats: ["image/avif", "image/webp"],
  },
};

export default nextConfig;
