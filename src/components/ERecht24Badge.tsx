import { useLocation } from 'react-router-dom';
import erecht24AgenturLight from '@/assets/erecht24-agentur-light.png';
import erecht24ImpressumDark from '@/assets/erecht24-impressum-dark.png';
import erecht24DatenschutzDark from '@/assets/erecht24-datenschutz-dark.png';

const PUBLIC_PATHS = ['/', '/home', '/impressum', '/datenschutz', '/kontakt', '/karriere', '/delete'];

const ERecht24Badge = () => {
  const location = useLocation();

  // Only show on public-facing pages
  if (!PUBLIC_PATHS.includes(location.pathname)) return null;

  let src = erecht24AgenturLight;
  let alt = 'eRecht24 Agentur Partner für rechtssichere Webseiten';

  if (location.pathname === '/impressum') {
    src = erecht24ImpressumDark;
    alt = 'eRecht24 Impressum für rechtssichere Webseiten';
  } else if (location.pathname === '/datenschutz') {
    src = erecht24DatenschutzDark;
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
        className="w-24 sm:w-28 h-auto rounded-lg shadow-lg"
      />
    </a>
  );
};

export default ERecht24Badge;
