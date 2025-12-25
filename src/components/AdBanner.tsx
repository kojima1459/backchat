import { useEffect, useState } from 'react';

export const AdBanner = () => {
    // Add a random query param to prevent caching issues if needed, or just keep it simple
    // Simple version first.
  return (
    <div className="flex justify-center items-center w-full h-[50px] bg-transparent my-4">
      <iframe
        src="/ad_320x50.html"
        width="320"
        height="50"
        style={{ border: 'none', overflow: 'hidden' }}
        title="Advertisement"
        scrolling="no"
      />
    </div>
  );
};
