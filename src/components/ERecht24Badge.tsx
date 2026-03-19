import { useLocation } from 'react-router-dom';
import erecht24Siegel from '@/assets/erecht24-siegel.png';
import erecht24Impressum from '@/assets/erecht24-impressum.png';
import erecht24Datenschutz from '@/assets/erecht24-datenschutz.png';

const ERecht24Badge = () => {
  const location = useLocation();

  let src = erecht24Siegel;
  let alt = 'eRecht24 Agentur Partner für rechtssichere Webseiten';

  if (location.pathname === '/impressum') {
    src = erecht24Impressum;
    alt = 'eRecht24 Impressum für rechtssichere Webseiten';
  } else if (location.pathname === '/datenschutz') {
    src = erecht24Datenschutz;
    alt = 'eRecht24 Datenschutzerklärung für rechtssichere Webseiten';
  }

  return (
    <a
      href="https://www.e-recht24.de"
      target="_blank"
      rel="noopener noreferrer"
      className="fixed bottom-4 right-4 z-50 transition-opacity hover:opacity-80"
    >
      <img
        src={src}
        alt={alt}
        className="w-40 sm:w-48 h-auto rounded-lg shadow-lg"
      />
    </a>
  );
};

export default ERecht24Badge;
