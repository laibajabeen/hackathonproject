import { useState } from "react";
import { MapPin, Clock, Car, Train, Bike, Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";

interface TravelDestination {
  id: string;
  name: string;
  address: string;
  travelMode: "driving" | "transit" | "walking" | "bicycling";
}

interface TravelCalculatorProps {
  onDestinationsChange: (destinations: TravelDestination[]) => void;
}

const TravelCalculator = ({ onDestinationsChange }: TravelCalculatorProps) => {
  const [destinations, setDestinations] = useState<TravelDestination[]>([]);
  const [newDestination, setNewDestination] = useState({
    name: "",
    address: "",
    travelMode: "driving" as const,
  });

  const addDestination = () => {
    if (!newDestination.name || !newDestination.address) return;

    const destination: TravelDestination = {
      id: Date.now().toString(),
      name: newDestination.name,
      address: newDestination.address,
      travelMode: newDestination.travelMode,
    };

    const updatedDestinations = [...destinations, destination];
    setDestinations(updatedDestinations);
    onDestinationsChange(updatedDestinations);

    setNewDestination({ name: "", address: "", travelMode: "driving" });
  };

  const removeDestination = (id: string) => {
    const updatedDestinations = destinations.filter((dest) => dest.id !== id);
    setDestinations(updatedDestinations);
    onDestinationsChange(updatedDestinations);
  };

  const getTravelIcon = (mode: string) => {
    switch (mode) {
      case "driving":
        return <Car className="h-4 w-4" />;
      case "transit":
        return <Train className="h-4 w-4" />;
      case "bicycling":
        return <Bike className="h-4 w-4" />;
      default:
        return <MapPin className="h-4 w-4" />;
    }
  };

  const getTravelModeLabel = (mode: string) => {
    switch (mode) {
      case "driving":
        return "Driving";
      case "transit":
        return "Public Transport";
      case "bicycling":
        return "Cycling";
      default:
        return "Walking";
    }
  };

  return (
    <Card className="property-card">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Clock className="h-5 w-5 text-primary" />
          Travel Time Calculator
        </CardTitle>
        <p className="text-sm text-muted-foreground">
          Add places you frequently visit to see travel times from properties
        </p>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Add New Destination */}
        <div className="space-y-3 p-4 bg-secondary/30 rounded-lg">
          <h4 className="font-medium text-sm">Add New Destination</h4>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <Input
              placeholder="Name (e.g., Work, School)"
              value={newDestination.name}
              onChange={(e) =>
                setNewDestination((prev) => ({ ...prev, name: e.target.value }))
              }
              className="search-input"
            />
            <Input
              placeholder="Address or postcode"
              value={newDestination.address}
              onChange={(e) =>
                setNewDestination((prev) => ({
                  ...prev,
                  address: e.target.value,
                }))
              }
              className="search-input"
            />
            <div className="flex gap-2">
              <Select
                value={newDestination.travelMode}
                onValueChange={(value: any) =>
                  setNewDestination((prev) => ({ ...prev, travelMode: value }))
                }
              >
                <SelectTrigger className="search-input">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="driving">Driving</SelectItem>
                  <SelectItem value="transit">Public Transport</SelectItem>
                  <SelectItem value="bicycling">Cycling</SelectItem>
                  <SelectItem value="walking">Walking</SelectItem>
                </SelectContent>
              </Select>
              <Button
                onClick={addDestination}
                size="sm"
                className="bg-primary hover:bg-primary-hover"
              >
                <Plus className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>

        {/* Destinations List */}
        {destinations.length > 0 && (
          <div className="space-y-2">
            <h4 className="font-medium text-sm">Your Destinations</h4>
            {destinations.map((dest) => (
              <div
                key={dest.id}
                className="flex items-center justify-between p-3 bg-card border border-border rounded-lg"
              >
                <div className="flex items-center gap-3">
                  <div className="flex items-center gap-2">
                    {getTravelIcon(dest.travelMode)}
                    <div>
                      <p className="font-medium text-sm">{dest.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {dest.address}
                      </p>
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant="secondary" className="text-xs">
                    {getTravelModeLabel(dest.travelMode)}
                  </Badge>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => removeDestination(dest.id)}
                    className="h-8 w-8 p-0 text-muted-foreground hover:text-destructive"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}

        {destinations.length === 0 && (
          <div className="text-center py-8 text-muted-foreground">
            <MapPin className="h-12 w-12 mx-auto mb-3 opacity-50" />
            <p className="text-sm">No destinations added yet</p>
            <p className="text-xs">
              Add places you visit regularly to see travel times
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default TravelCalculator;
