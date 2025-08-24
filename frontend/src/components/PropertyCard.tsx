import { MapPin, Clock, PoundSterling, Bed, Bath, User } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

interface Property {
  id: string;
  title: string;
  location: string;
  price: number;
  priceType: "week" | "month";
  propertyType: "room" | "flat" | "house" | "studio";
  bedrooms?: number;
  bathrooms?: number;
  image: string;
  latitude: number;
  longitude: number;
  distance?: string;
  travelTime?: string;
  available: boolean;
  calculatedTravelTimes?: Array<{
    destinationName: string;
    duration: string;
    distance: string;
    mode: string;
  }>;
}

interface PropertyCardProps {
  property: Property;
  onContact: (property: Property) => void;
  onViewDetails: (property: Property) => void;
}

const PropertyCard = ({ property, onContact, onViewDetails }: PropertyCardProps) => {
  const getPropertyTypeColor = (type: string) => {
    switch (type) {
      case "room": return "bg-blue-100 text-blue-800";
      case "flat": return "bg-green-100 text-green-800";
      case "house": return "bg-purple-100 text-purple-800";
      case "studio": return "bg-orange-100 text-orange-800";
      default: return "bg-gray-100 text-gray-800";
    }
  };

  return (
    <Card className="property-card group">
      <div className="relative overflow-hidden">
        <img 
          src={property.image} 
          alt={property.title}
          className="w-full h-48 object-cover group-hover:scale-105 transition-transform duration-300"
        />
        <div className="absolute top-3 left-3">
          <Badge className={getPropertyTypeColor(property.propertyType)}>
            {property.propertyType}
          </Badge>
        </div>
        {!property.available && (
          <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
            <Badge variant="destructive" className="text-sm font-medium">
              No Longer Available
            </Badge>
          </div>
        )}
      </div>

      <CardContent className="p-5">
        <div className="space-y-3">
          {/* Title */}
          <h3 className="font-semibold text-lg text-foreground line-clamp-2 group-hover:text-primary transition-colors">
            {property.title}
          </h3>

          {/* Location */}
          <div className="flex items-center gap-2 text-muted-foreground">
            <MapPin className="h-4 w-4" />
            <span className="text-sm">{property.location}</span>
          </div>

          {/* Price */}
          <div className="flex items-center gap-2">
            <PoundSterling className="h-5 w-5 text-primary" />
            <span className="text-2xl font-bold text-foreground">
              £{property.price.toLocaleString()}
            </span>
            <span className="text-muted-foreground">/{property.priceType}</span>
          </div>

          {/* Property Details */}
          <div className="flex items-center gap-4 text-sm text-muted-foreground">
            {property.bedrooms && (
              <div className="flex items-center gap-1">
                <Bed className="h-4 w-4" />
                <span>{property.bedrooms} bed{property.bedrooms > 1 ? 's' : ''}</span>
              </div>
            )}
            {property.bathrooms && (
              <div className="flex items-center gap-1">
                <Bath className="h-4 w-4" />
                <span>{property.bathrooms} bath{property.bathrooms > 1 ? 's' : ''}</span>
              </div>
            )}
          </div>

          {/* Calculated Travel Times */}
          {property.calculatedTravelTimes && property.calculatedTravelTimes.length > 0 && (
            <div className="p-3 bg-secondary/30 rounded-lg">
              <h4 className="text-sm font-medium text-foreground mb-2 flex items-center gap-1">
                <Clock className="h-4 w-4 text-primary" />
                Travel Times
              </h4>
              <div className="space-y-1">
                {property.calculatedTravelTimes.slice(0, 3).map((travel, index) => (
                  <div key={index} className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground truncate flex-1">
                      {travel.destinationName}
                    </span>
                    <span className="text-foreground font-medium ml-2">
                      {travel.duration}
                    </span>
                  </div>
                ))}
                {property.calculatedTravelTimes.length > 3 && (
                  <p className="text-xs text-muted-foreground">
                    +{property.calculatedTravelTimes.length - 3} more
                  </p>
                )}
              </div>
            </div>
          )}

          {/* Fallback Travel Info */}
          {(!property.calculatedTravelTimes || property.calculatedTravelTimes.length === 0) && 
           property.distance && property.travelTime && (
            <div className="flex items-center gap-2 p-2 bg-secondary/50 rounded-lg">
              <Clock className="h-4 w-4 text-primary" />
              <span className="text-sm text-foreground">
                {property.distance} • {property.travelTime} commute
              </span>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex gap-2 pt-2">
            <Button 
              variant="outline" 
              size="sm" 
              onClick={() => onViewDetails(property)}
              className="flex-1"
            >
              View Details
            </Button>
            <Button 
              size="sm" 
              onClick={() => onContact(property)}
              className="flex-1 bg-primary hover:bg-primary-hover"
              disabled={!property.available}
            >
              <User className="h-4 w-4 mr-1" />
              Contact
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default PropertyCard;