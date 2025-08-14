import { useEffect } from 'react';

export function MonetagAds() {
  useEffect(() => {
    // Primer script
    const script1 = document.createElement('script');
    script1.src = 'https://upskittyan.com/act/files/tag.min.js?z=9688577';
    script1.setAttribute('data-cfasync', 'false');
    script1.async = true;
    document.body.appendChild(script1);

    // Segundo script
    const script2 = document.createElement('script');
    script2.src = 'https://vemtoutcheeg.com/400/9688580';
    document.body.appendChild(script2);

    // Tercer script
    const script3 = document.createElement('script');
    script3.src = 'https://groleegni.net/401/9688582';
    document.body.appendChild(script3);

   

    // Limpieza al desmontar
    return () => {
      document.body.removeChild(script1);
      document.body.removeChild(script2);
      document.body.removeChild(script3);
    };
  }, []);

  return null;
}

