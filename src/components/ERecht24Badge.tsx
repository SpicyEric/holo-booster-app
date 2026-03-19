import erecht24Siegel from '@/assets/erecht24-siegel.png';

const ERecht24Badge = () => {
  return (
    <a
      href="https://www.e-recht24.de"
      target="_blank"
      rel="noopener noreferrer"
      className="fixed bottom-4 right-4 z-50 transition-opacity hover:opacity-80"
    >
      <img
        src={erecht24Siegel}
        alt="eRecht24 Agentur Partner für rechtssichere Webseiten"
        className="w-40 sm:w-48 h-auto rounded-lg shadow-lg"
      />
    </a>
  );
};

export default ERecht24Badge;
