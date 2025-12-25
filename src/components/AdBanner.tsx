import { useEffect, useRef } from 'react';

export const AdBanner = () => {
  const bannerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const banner = bannerRef.current;
    if (!banner) return;

    // Clear previous content
    banner.innerHTML = '';

    // Create iframe
    const iframe = document.createElement('iframe');
    iframe.width = '320';
    iframe.height = '50';
    iframe.style.border = 'none';
    iframe.style.overflow = 'hidden';
    
    banner.appendChild(iframe);

    const doc = iframe.contentWindow?.document;
    if (doc) {
      doc.open();
      doc.write(`
        <!DOCTYPE html>
        <html>
          <head>
            <style>body { margin: 0; padding: 0; overflow: hidden; display: flex; justify-content: center; align-items: center; }</style>
          </head>
          <body>
            <script type="text/javascript">
              atOptions = {
                'key' : '255f191345a7735c21b322e2228feb31',
                'format' : 'iframe',
                'height' : 50,
                'width' : 320,
                'params' : {}
              };
            </script>
            <script type="text/javascript" src="//www.highperformanceformat.com/255f191345a7735c21b322e2228feb31/invoke.js"></script>
          </body>
        </html>
      `);
      doc.close();
    }

    return () => {
      if (bannerRef.current) {
        bannerRef.current.innerHTML = '';
      }
    };
  }, []);

  return (
    <div className="flex justify-center items-center w-full h-[50px] bg-transparent my-4">
      <div ref={bannerRef} className="w-[320px] h-[50px]" />
    </div>
  );
};
