import { useNavigate } from "react-router-dom";

interface Store {
  id: string;
  name: string;
  category: string;
  logo_url: string | null;
  cover_image_url: string | null;
  lat: number | null;
  lng: number | null;
  address: string | null;
  points?: number;
  distance?: number;
}

interface StoreCardProps {
  store: Store;
}

const StoreCard = ({ store }: StoreCardProps) => {
  const navigate = useNavigate();

  return (
    <button
      onClick={() => navigate(`/app/merchant/${store.id}`)}
      className="w-full rounded-xl overflow-hidden shadow-md hover:shadow-lg transition-shadow text-left relative"
      style={{ aspectRatio: '1.55 / 1' }}
    >
      {/* Background - Cover Image or Gradient */}
      <div className="absolute inset-0">
        {store.cover_image_url ? (
          <img
            src={store.cover_image_url}
            alt={store.name}
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="w-full h-full bg-gradient-to-br from-primary/20 to-primary/40" />
        )}
      </div>

      {/* Logo - Top Left */}
      <div className="absolute top-3 left-3 z-10">
        {store.logo_url ? (
          <img
            src={store.logo_url}
            alt={`${store.name} Logo`}
            className="w-12 h-12 rounded-full object-cover border-2 border-white shadow-md bg-white"
          />
        ) : (
          <div className="w-12 h-12 rounded-full bg-white border-2 border-white shadow-md flex items-center justify-center">
            <span className="text-lg font-bold text-primary">
              {store.name.charAt(0).toUpperCase()}
            </span>
          </div>
        )}
      </div>

      {/* Distance Badge - Top Right */}
      {store.distance !== undefined && (
        <div className="absolute top-3 right-3 z-10">
          <span className="bg-white/95 backdrop-blur-sm text-gray-800 text-xs font-medium px-2 py-1 rounded-full shadow-sm">
            {store.distance < 1 
              ? `${Math.round(store.distance * 1000)}m` 
              : `${store.distance.toFixed(1)}km`}
          </span>
        </div>
      )}

      {/* Gradient Overlay for Text */}
      <div className="absolute inset-x-0 bottom-0 h-1/2 bg-gradient-to-t from-black/70 via-black/40 to-transparent" />

      {/* Name and Category - Bottom Left */}
      <div className="absolute bottom-3 left-3 right-3 z-10">
        <h3 className="text-white font-semibold text-base truncate drop-shadow-md">
          {store.name}
        </h3>
        <p className="text-white/80 text-sm truncate drop-shadow-md">
          {store.category}
        </p>
      </div>
    </button>
  );
};

export default StoreCard;
