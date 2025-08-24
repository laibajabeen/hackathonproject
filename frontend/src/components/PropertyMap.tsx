import { useEffect, useRef } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { MapPin } from 'lucide-react';

// Fix for default markers in Leaflet
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

interface Property {
  id: string;
  title: string;
  location: string;
  price: number;
  priceType: "week" | "month";
  latitude: number;
  longitude: number;
  available: boolean;
}

interface PropertyMapProps {
  properties: Property[];
  center: [number, number];
  onPropertyClick?: (property: Property) => void;
}

const PropertyMap = ({ properties, center, onPropertyClick }: PropertyMapProps) => {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);

  useEffect(() => {
    if (!mapRef.current) return;

    // Initialize map
    mapInstanceRef.current = L.map(mapRef.current).setView(center, 12);

    // Add tile layer
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '© OpenStreetMap contributors'
    }).addTo(mapInstanceRef.current);

    return () => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
    };
  }, [center]);

  useEffect(() => {
    if (!mapInstanceRef.current) return;

    // Clear existing markers
    mapInstanceRef.current.eachLayer((layer) => {
      if (layer instanceof L.Marker) {
        mapInstanceRef.current?.removeLayer(layer);
      }
    });

    // Add property markers
    properties.forEach((property) => {
      if (!mapInstanceRef.current) return;

      const icon = L.divIcon({
        className: 'custom-marker',
        html: `
          <div class="property-marker ${property.available ? 'available' : 'unavailable'}">
            <div class="marker-content">
              <span class="price">£${property.price}</span>
            </div>
          </div>
        `,
        iconSize: [80, 40],
        iconAnchor: [40, 40],
      });

      const marker = L.marker([property.latitude, property.longitude], { icon })
        .addTo(mapInstanceRef.current)
        .bindPopup(`
          <div class="property-popup">
            <h3 class="font-semibold text-sm">${property.title}</h3>
            <p class="text-xs text-gray-600 mt-1">${property.location}</p>
            <p class="font-bold text-primary mt-2">£${property.price}/${property.priceType}</p>
          </div>
        `);

      if (onPropertyClick) {
        marker.on('click', () => onPropertyClick(property));
      }
    });
  }, [properties, onPropertyClick]);

  return (
    <div className="relative h-full w-full">
      <div ref={mapRef} className="h-full w-full rounded-xl" />
      
      {/* Custom CSS for markers */}
      <style dangerouslySetInnerHTML={{__html: `
        .property-marker {
          position: relative;
          background: white;
          border: 2px solid hsl(213 94% 45%);
          border-radius: 8px;
          padding: 4px 8px;
          font-size: 12px;
          font-weight: 600;
          color: hsl(213 94% 45%);
          box-shadow: 0 2px 8px rgba(0,0,0,0.1);
          transform: translate(-50%, -100%);
        }
        
        .property-marker.unavailable {
          background: #f5f5f5;
          border-color: #999;
          color: #999;
        }
        
        .property-marker:after {
          content: '';
          position: absolute;
          bottom: -6px;
          left: 50%;
          transform: translateX(-50%);
          width: 0;
          height: 0;
          border-left: 6px solid transparent;
          border-right: 6px solid transparent;
          border-top: 6px solid hsl(213 94% 45%);
        }
        
        .property-marker.unavailable:after {
          border-top-color: #999;
        }
        
        .property-popup {
          padding: 8px;
          min-width: 200px;
        }
      `}} />
    </div>
  );
};

export default PropertyMap;