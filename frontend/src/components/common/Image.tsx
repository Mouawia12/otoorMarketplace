import { useState } from 'react';

interface ImageProps {
  src: string;
  alt: string;
  className?: string;
  loading?: 'lazy' | 'eager';
  aspectRatio?: string;
}

export default function Image({ src, alt, className = '', loading = 'lazy', aspectRatio }: ImageProps) {
  const [error, setError] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  const handleError = () => {
    setError(true);
    setIsLoading(false);
  };

  const handleLoad = () => {
    setIsLoading(false);
  };

  return (
    <div className={`relative ${className}`} style={aspectRatio ? { aspectRatio } : undefined}>
      {isLoading && !error && (
        <div className="absolute inset-0 bg-sand animate-pulse rounded-t-luxury" />
      )}
      
      {error ? (
        <div className="absolute inset-0 bg-sand flex items-center justify-center rounded-t-luxury">
          <svg className="w-16 h-16 text-taupe opacity-40" fill="currentColor" viewBox="0 0 24 24">
            <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8zm-1-13h2v6h-2zm0 8h2v2h-2z"/>
          </svg>
        </div>
      ) : (
        <img
          src={src}
          alt={alt}
          className={`w-full h-full object-cover rounded-t-luxury ${isLoading ? 'opacity-0' : 'opacity-100'} transition-opacity duration-200`}
          loading={loading}
          onError={handleError}
          onLoad={handleLoad}
        />
      )}
    </div>
  );
}
