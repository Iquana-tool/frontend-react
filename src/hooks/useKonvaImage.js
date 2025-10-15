import { useEffect, useState } from 'react';

/**
 * Custom hook to load an image for use with Konva
 * Returns the loaded image object and loading state
 */
const useKonvaImage = (src) => {
  const [image, setImage] = useState(null);
  const [status, setStatus] = useState('loading');

  useEffect(() => {
    if (!src) {
      setStatus('idle');
      setImage(null);
      return;
    }

    setStatus('loading');
    const img = new window.Image();
    
    img.onload = () => {
      setImage(img);
      setStatus('loaded');
    };
    
    img.onerror = () => {
      setStatus('failed');
      setImage(null);
    };
    
    img.src = src;

    // Cleanup
    return () => {
      img.onload = null;
      img.onerror = null;
    };
  }, [src]);

  return { image, status };
};

export default useKonvaImage;

