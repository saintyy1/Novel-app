import React, { useEffect, useState } from 'react';

type Props = React.ImgHTMLAttributes<HTMLImageElement> & {
  uri?: string | null;
  placeholderColor?: string; // kept for API parity
};

const CACHE_NAME = 'image-cache-v1';

const ensureCache = async () => {
  await caches.open(CACHE_NAME);
};

const sha256 = async (input: string) => {
  const encoder = new TextEncoder();
  const data = encoder.encode(input);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  return Array.from(new Uint8Array(hashBuffer))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
};

const getFileExtension = (url: string) => {
  const clean = url.split('?')[0];
  const match = clean.match(/\.([0-9a-zA-Z]+)$/);
  return match ? `.${match[1]}` : '.jpg';
};

export default function CachedImage({
  uri,
  placeholderColor = '#222',
  className,
  ...rest
}: Props) {
  const [localUri, setLocalUri] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    let mounted = true;

    const load = async () => {
      if (!uri) {
        setLocalUri(null);
        return;
      }

      if (uri.startsWith('data:') || uri.startsWith('blob:')) {
        setLocalUri(uri);
        return;
      }

      setLoading(true);

      try {
        await ensureCache();

        const hash = await sha256(uri);
        const ext = getFileExtension(uri);
        const cacheKey = `/image-cache/${hash}${ext}`;

        const cache = await caches.open(CACHE_NAME);
        const cached = await cache.match(cacheKey);

        if (cached) {
          const blob = await cached.blob();
          const objectUrl = URL.createObjectURL(blob);
          if (mounted) setLocalUri(objectUrl);
        } else {
          const response = await fetch(uri, { mode: 'cors' });
          await cache.put(cacheKey, response.clone());

          const blob = await response.blob();
          const objectUrl = URL.createObjectURL(blob);
          if (mounted) setLocalUri(objectUrl);
        }
      } catch {
        if (mounted) setLocalUri(uri);
      } finally {
        if (mounted) setLoading(false);
      }
    };

    load();
    return () => {
      mounted = false;
    };
  }, [uri]);

  if (!uri && !localUri) return null;

  return loading && !localUri ? (
    <div
      className={`flex items-center justify-center ${className ?? ''}`}
      style={{ backgroundColor: placeholderColor }}
    >
      <div className="h-5 w-5 animate-spin rounded-full border-2 border-white/30 border-t-white" />
    </div>
  ) : (
    <img
      {...rest}
      src={localUri ?? uri ?? undefined}
      className={className}
    />
  );
}

/* ===========================
   Cache management utilities
   =========================== */

export async function clearImageCache() {
  await caches.delete(CACHE_NAME);
}

export async function invalidateCacheForUrl(url: string) {
  if (!url) return;

  try {
    const hash = await sha256(url);
    const ext = getFileExtension(url);
    const cacheKey = `/image-cache/${hash}${ext}`;

    const cache = await caches.open(CACHE_NAME);
    await cache.delete(cacheKey);
  } catch {
    // ignore
  }
}
