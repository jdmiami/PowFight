import type { MetadataRoute } from 'next';

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'The Play House',
    short_name: 'Play House',
    description: 'Act out plays one selfie line at a time.',
    start_url: '/',
    display: 'standalone',
    background_color: '#0e0608',
    theme_color: '#0e0608',
    icons: [{ src: '/icon.svg', sizes: 'any', type: 'image/svg+xml' }],
  };
}
