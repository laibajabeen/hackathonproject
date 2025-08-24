import { useState } from "react";
import { Search, MapPin, PoundSterling, Filter } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

interface SearchFilters {
  location: string;
  minBudget: string;
  maxBudget: string;
  propertyType: string;
}

interface PropertySearchProps {
  onSearch: (filters: SearchFilters) => void;
}

const PropertySearch = ({ onSearch }: PropertySearchProps) => {
  const [filters, setFilters] = useState<SearchFilters>({
    location: "",
    minBudget: "",
    maxBudget: "",
    propertyType: ""
  });

  const handleSearch = () => {
    onSearch(filters);
  };

  const updateFilter = (key: keyof SearchFilters, value: string) => {
    setFilters(prev => ({ ...prev, [key]: value }));
  };

  return (
    <Card className="property-card p-6 bg-white/95 backdrop-blur-sm">
      <div className="space-y-4">
        <div className="flex items-center gap-2 mb-4">
          <Filter className="h-5 w-5 text-primary" />
          <h3 className="text-lg font-semibold text-foreground">Find Your Perfect Home</h3>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Location Input */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-foreground">Location</label>
            <div className="relative">
              <MapPin className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="City or postcode"
                value={filters.location}
                onChange={(e) => updateFilter("location", e.target.value)}
                className="search-input pl-10"
              />
            </div>
          </div>

          {/* Min Budget */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-foreground">Min Budget</label>
            <div className="relative">
              <PoundSterling className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="500"
                value={filters.minBudget}
                onChange={(e) => updateFilter("minBudget", e.target.value)}
                className="search-input pl-10"
                type="number"
              />
            </div>
          </div>

          {/* Max Budget */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-foreground">Max Budget</label>
            <div className="relative">
              <PoundSterling className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="2000"
                value={filters.maxBudget}
                onChange={(e) => updateFilter("maxBudget", e.target.value)}
                className="search-input pl-10"
                type="number"
              />
            </div>
          </div>

          {/* Property Type */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-foreground">Property Type</label>
            <Select value={filters.propertyType} onValueChange={(value) => updateFilter("propertyType", value)}>
              <SelectTrigger className="search-input">
                <SelectValue placeholder="Any type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="room">Room</SelectItem>
                <SelectItem value="flat">Flat/Apartment</SelectItem>
                <SelectItem value="house">House</SelectItem>
                <SelectItem value="studio">Studio</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <Button 
          onClick={handleSearch}
          className="btn-hero w-full md:w-auto"
        >
          <Search className="h-4 w-4 mr-2" />
          Search Properties
        </Button>
      </div>
    </Card>
  );
};

export default PropertySearch;