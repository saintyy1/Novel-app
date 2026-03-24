import React, { useEffect, useState } from 'react';
import { getOrDownloadImage } from '../utils/cache';

type Props = React.ImgHTMLAttributes<HTMLImageElement> & {
  uri?: string | null;
  placeholderColor?: string; // kept for API parity
};

export default function CachedImage({
  uri,
  placeholderColor = '#222',
  className,
  ...rest
}: Props) {
  const [displayUri, setDisplayUri] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    let mounted = true;

    const load = async () => {
      if (!uri) {
        setDisplayUri(null);
        return;
      }

      // Handle local protocols
      if (uri.startsWith('data:') || uri.startsWith('blob:') || uri.startsWith('file:')) {
        setDisplayUri(uri);
        return;
      }

      setLoading(true);

      try {
        const result = await getOrDownloadImage(uri);
        if (mounted) setDisplayUri(result);
      } catch (err) {
        console.warn(`[CachedImage] Error loading ${uri}:`, err);
        // Fallback to original URI on error
        if (mounted) setDisplayUri(uri);
      } finally {
        if (mounted) setLoading(false);
      }
    };

    load();
    return () => {
      mounted = false;
    };
  }, [uri]);

  if (!uri && !displayUri) return null;

  // Show loading spinner only if we don't have a URI yet
  if (loading && !displayUri) {
    return (
      <div
        className={`flex items-center justify-center ${className ?? ''}`}
        style={{ backgroundColor: placeholderColor }}
      >
        <div className="h-5 w-5 animate-spin rounded-full border-2 border-white/30 border-t-white" />
      </div>
    );
  }

  return (
    <img
      {...rest}
      src={displayUri ?? uri ?? undefined}
      className={className}
      onError={(e) => {
        // Fallback to original URI if blobUrl fails (rare but possible if revoked)
        const target = e.target as HTMLImageElement;
        if (displayUri && displayUri !== uri) {
          target.src = uri!;
        }
      }}
    />
  );
}

/**
 * Legacy export for backward compatibility if needed elsewhere
 */
export async function clearImageCache() {
  await caches.delete('image-cache-v1');
  await caches.delete('novelnest-image-cache');
}
