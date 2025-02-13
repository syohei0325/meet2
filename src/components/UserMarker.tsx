import React from 'react';
import { Marker, InfoWindow } from '@react-google-maps/api';

interface UserMarkerProps {
  user: {
    id: string;
    user_metadata: {
      avatar_url?: string;
    };
    status?: string;
    status_type?: string;
  };
  position: {
    lat: number;
    lng: number;
  };
}

export function UserMarker({ user, position }: UserMarkerProps) {
  const [isOpen, setIsOpen] = React.useState(false);

  return (
    <Marker
      position={position}
      onClick={() => setIsOpen(true)}
      icon={{
        url: user.user_metadata.avatar_url || '/default-avatar.png',
        scaledSize: new google.maps.Size(40, 40)
      }}
    >
      {isOpen && (
        <InfoWindow onCloseClick={() => setIsOpen(false)}>
          <div className="p-2">
            <div className="flex items-center space-x-2">
              <div className={`w-2 h-2 rounded-full ${
                user.status_type === 'online' ? 'bg-green-500' :
                user.status_type === 'lunch' ? 'bg-yellow-500' :
                user.status_type === 'busy' ? 'bg-red-500' :
                'bg-gray-500'
              }`} />
              <span>{user.status || 'オフライン'}</span>
            </div>
          </div>
        </InfoWindow>
      )}
    </Marker>
  );
} 