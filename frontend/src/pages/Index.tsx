import { useState, useEffect } from "react";
import { MapPin, Home, Clock, Zap, User } from "lucide-react";
import PropertySearch from "@/components/PropertySearch";
import PropertyCard from "@/components/PropertyCard";
import PropertyMap from "@/components/PropertyMap";
import TravelCalculator from "@/components/TravelCalculator";
import { Button } from "@/components/ui/button";

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import {
  TravelTimeService,
  formatTravelTime,
  formatDistance,
} from "@/services/travelTimeService";
import heroImage from "@/assets/hero-property.jpg";

interface SearchFilters {
  location: string;
  minBudget: string;
  maxBudget: string;
  propertyType: string;
}

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
  link?: string;
  postcode?: string;
  calculatedTravelTimes?: Array<{
    destinationName: string;
    duration: string;
    distance: string;
    mode: string;
  }>;
}

interface TravelDestination {
  id: string;
  name: string;
  address: string;
  travelMode: "driving" | "transit" | "walking" | "bicycling";
}

// API configuration
const API_BASE_URL = "http://127.0.0.1:8000";

// API service function - Updated to handle structured response
const searchProperties = async (filters: SearchFilters, sessionId: string) => {
  if (!sessionId.trim()) {
    throw new Error("Session ID is required");
  }

  const query = `Find ${filters.propertyType || "properties"} in ${
    filters.location
  } with budget between £${filters.minBudget || "0"} and £${
    filters.maxBudget || "unlimited"
  }`;

  const response = await fetch(`${API_BASE_URL}/realestate-agent`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      prompt: query,
      session_id: sessionId,
    }),
  });

  if (!response.ok) throw new Error("Search failed");
  return await response.json();
};

// For location/distance queries
const searchLocation = async (query: string) => {
  const response = await fetch(`${API_BASE_URL}/realestate-agent`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ prompt: query }),
  });

  if (!response.ok) throw new Error("Location search failed");
  return await response.json();
};

const Index = () => {
  const [searchFilters, setSearchFilters] = useState<SearchFilters | null>(
    null
  );
  const [travelDestinations, setTravelDestinations] = useState<
    TravelDestination[]
  >([]);
  const [properties, setProperties] = useState<Property[]>([]);
  const [isCalculating, setIsCalculating] = useState(false);
  const [isSearching, setIsSearching] = useState(false);
  const [agentResponse, setAgentResponse] = useState<string>("");
  const [sessionId, setSessionId] = useState<string>("");
  const [sessionHistory, setSessionHistory] = useState<any[]>([]);
  const [emailRequest, setEmailRequest] = useState("");
  const [generatedEmail, setGeneratedEmail] = useState("");
  const { toast } = useToast();

  const getSessionHistory = async (sessionId: string) => {
    if (!sessionId.trim()) return;

    try {
      const response = await fetch(
        `${API_BASE_URL}/api/sessions/${sessionId}/history`
      );
      if (response.ok) {
        const data = await response.json();
        setSessionHistory(data.history || []);
      }
    } catch (error) {
      console.error("Error fetching session history:", error);
    }
  };
  const handleSearch = async (filters: SearchFilters) => {
    if (!sessionId.trim()) {
      toast({
        title: "Session ID Required",
        description: "Please enter a session ID before searching.",
        variant: "destructive",
      });
      return;
    }

    setSearchFilters(filters);
    setIsSearching(true);
    setAgentResponse("");

    try {
      const response = await searchProperties(filters, sessionId);

      console.log("Full API Response:", response);

      setAgentResponse(response.result);

      if (response.properties && response.properties.length > 0) {
        const structuredProperties: Property[] = response.properties.map(
          (prop: any) => ({
            ...prop,
            image: heroImage,
            priceType: "month" as const,
          })
        );

        setProperties(structuredProperties);

        toast({
          title: "Properties Found!",
          description: `Found ${structuredProperties.length} properties matching your criteria`,
        });
      } else {
        setProperties([]);

        toast({
          title: "Search Completed",
          description: `Search results received for ${
            filters.propertyType || "properties"
          } in ${filters.location || "all areas"}`,
        });
      }

      // Refresh session history
      await getSessionHistory(sessionId);
    } catch (error) {
      console.error("Search error:", error);
      toast({
        title: "Search Failed",
        description:
          error instanceof Error
            ? error.message
            : "Unable to search properties. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsSearching(false);
    }
  };

  // Load session history when session ID changes
  useEffect(() => {
    if (sessionId.trim()) {
      getSessionHistory(sessionId);
    }
  }, [sessionId]);
  const handleEmailGeneration = async () => {
    if (!emailRequest.trim() || !sessionId.trim()) return;

    try {
      const response = await fetch(`${API_BASE_URL}/realestate-agent`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          prompt: `Draft email: ${emailRequest}`,
          session_id: sessionId,
        }),
      });

      const data = await response.json();
      setGeneratedEmail(data.result);
    } catch (error) {
      console.error("Email generation failed:", error);
    }
  };
  const handleContact = (property: Property) => {
    // If property has a link, you could open it or handle contact differently
    if (property.link) {
      window.open(property.link, "_blank");
    }

    toast({
      title: "Contact Request Sent",
      description: `Our agent will contact the landlord for "${property.title}" and get back to you soon.`,
    });
  };

  const handleViewDetails = (property: Property) => {
    // If property has a link, open it
    if (property.link) {
      window.open(property.link, "_blank");
    }

    toast({
      title: "Property Details",
      description: `Opening details for "${property.title}"`,
    });
  };
  // Update your calculateTravelTimes function in Index.tsx

  const calculateTravelTimes = async (destinations: TravelDestination[]) => {
    if (destinations.length === 0) {
      // Clear all calculated travel times if no destinations
      setProperties((prevProps) =>
        prevProps.map((prop) => ({
          ...prop,
          calculatedTravelTimes: [],
        }))
      );
      return;
    }

    if (properties.length === 0) {
      toast({
        title: "No Properties",
        description: "Search for properties first to calculate travel times.",
        variant: "destructive",
      });
      return;
    }

    if (!sessionId.trim()) {
      toast({
        title: "Session ID Required",
        description: "Please enter a session ID to calculate travel times.",
        variant: "destructive",
      });
      return;
    }

    setIsCalculating(true);

    // Create travel service with session ID
    const travelService = new TravelTimeService(sessionId);

    console.log(
      "🚗 Starting travel time calculation for destinations:",
      destinations
    );
    console.log("📍 Using session ID:", sessionId);

    try {
      // Calculate travel times for all properties
      const updatedProperties = await Promise.all(
        properties.map(async (property) => {
          console.log(
            `🏠 Calculating travel time from property "${property.title}" at [${property.longitude}, ${property.latitude}]`
          );

          try {
            const travelTimes =
              await travelService.calculateMultipleDestinations(
                [property.longitude, property.latitude],
                destinations.map((dest) => ({
                  address: dest.address,
                  mode: dest.travelMode,
                }))
              );

            console.log(`📊 Travel times for ${property.title}:`, travelTimes);

            const calculatedTravelTimes = destinations.map((dest, index) => {
              const result = travelTimes[index];
              console.log(`🎯 Destination "${dest.name}" result:`, result);

              if (!result) {
                console.warn(
                  `⚠️ No travel time result for destination: ${dest.name}`
                );
                return {
                  destinationName: dest.name,
                  duration: "N/A",
                  distance: "N/A",
                  mode: dest.travelMode,
                };
              }

              return {
                destinationName: dest.name,
                duration: formatTravelTime(result.duration),
                distance: formatDistance(result.distance),
                mode: dest.travelMode,
              };
            });

            console.log(
              `✅ Final calculated travel times for ${property.title}:`,
              calculatedTravelTimes
            );

            return {
              ...property,
              calculatedTravelTimes,
            };
          } catch (error) {
            console.error(
              `❌ Error calculating travel times for property ${property.title}:`,
              error
            );
            return {
              ...property,
              calculatedTravelTimes: destinations.map((dest) => ({
                destinationName: dest.name,
                duration: "Error",
                distance: "Error",
                mode: dest.travelMode,
              })),
            };
          }
        })
      );

      console.log(
        "🎉 All travel times calculated, updating state:",
        updatedProperties
      );
      setProperties(updatedProperties);

      toast({
        title: "Travel Times Updated",
        description: `Calculated travel times for ${destinations.length} destination(s)`,
      });
    } catch (error) {
      console.error("❌ Error in calculateTravelTimes:", error);
      toast({
        title: "Calculation Failed",
        description: "Unable to calculate travel times. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsCalculating(false);
    }
  };

  // Calculate travel times when destinations change
  useEffect(() => {
    if (travelDestinations.length > 0 && properties.length > 0) {
      calculateTravelTimes(travelDestinations);
    } else if (travelDestinations.length === 0) {
      // Clear travel times when no destinations
      setProperties((prevProps) =>
        prevProps.map((prop) => ({
          ...prop,
          calculatedTravelTimes: [],
        }))
      );
    }
  }, [travelDestinations]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-background to-secondary/20">
      {/* Hero Section */}
      <section className="relative bg-gradient-to-r from-primary to-primary-hover text-primary-foreground py-20">
        <div className="absolute inset-0 bg-black/20"></div>
        <div className="relative container mx-auto px-6 text-center">
          <h1 className="text-5xl md:text-6xl font-bold mb-6">
            Find Your Perfect Home in the UK
          </h1>
          <p className="text-xl md:text-2xl mb-8 text-primary-foreground/90 max-w-3xl mx-auto">
            Discover properties by budget and location, see travel times to your
            favorite places, and let our agents handle the contact process for
            you.
          </p>
          <div className="flex flex-wrap justify-center gap-6 mb-12">
            <div className="flex items-center gap-2 bg-white/10 rounded-lg px-4 py-2">
              <Home className="h-5 w-5" />
              <span>Budget-Based Search</span>
            </div>
            <div className="flex items-center gap-2 bg-white/10 rounded-lg px-4 py-2">
              <Clock className="h-5 w-5" />
              <span>Travel Time Calculator</span>
            </div>
            <div className="flex items-center gap-2 bg-white/10 rounded-lg px-4 py-2">
              <Zap className="h-5 w-5" />
              <span>Auto Contact Forms</span>
            </div>
          </div>
        </div>
      </section>
      <section className="py-6 container mx-auto px-6">
        <div className="max-w-2xl mx-auto">
          <div className="bg-card p-6 rounded-lg shadow-card">
            <div className="flex items-center gap-3 mb-4">
              <User className="h-6 w-6 text-primary" />
              <h3 className="text-xl font-semibold">Session Management</h3>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label
                  htmlFor="sessionId"
                  className="block text-sm font-medium text-muted-foreground mb-2"
                >
                  Your Session ID
                </label>
                <input
                  id="sessionId"
                  type="text"
                  value={sessionId}
                  onChange={(e) => setSessionId(e.target.value)}
                  placeholder="Enter unique session ID (e.g., john_doe_123)"
                  className="w-full px-3 py-2 border border-input rounded-md focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary"
                />
                <p className="text-xs text-muted-foreground mt-1">
                  Use the same ID to continue previous conversations
                </p>
              </div>

              <div className="flex flex-col justify-center">
                {sessionId ? (
                  <div className="space-y-2">
                    <div className="flex items-center gap-2 text-green-600">
                      <div className="w-2 h-2 bg-green-600 rounded-full"></div>
                      <span className="text-sm font-medium">
                        Active: {sessionId}
                      </span>
                    </div>
                    {sessionHistory.length > 0 && (
                      <p className="text-xs text-muted-foreground">
                        {sessionHistory.length} previous conversation
                        {sessionHistory.length !== 1 ? "s" : ""}
                      </p>
                    )}
                  </div>
                ) : (
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <div className="w-2 h-2 bg-muted-foreground rounded-full"></div>
                    <span className="text-sm">No active session</span>
                  </div>
                )}
              </div>
            </div>

            {/* Session History Preview */}
            {sessionHistory.length > 0 && (
              <div className="mt-4 pt-4 border-t"></div>
            )}
          </div>
        </div>
      </section>
      {/* Search Section */}
      <section className="py-12 container mx-auto px-6">
        <PropertySearch onSearch={handleSearch} />
      </section>

      {/* Main Content */}
      <section className="py-8 container mx-auto px-6">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Travel Calculator Sidebar */}
          <div className="lg:col-span-1">
            <TravelCalculator onDestinationsChange={setTravelDestinations} />

            {isCalculating && (
              <div className="mt-4 p-4 bg-primary/10 rounded-lg text-center">
                <div className="animate-spin h-6 w-6 border-2 border-primary border-t-transparent rounded-full mx-auto mb-2"></div>
                <p className="text-sm text-primary">
                  Calculating travel times...
                </p>
              </div>
            )}
            <div className="mt-6 p-4 bg-card rounded-lg shadow-card">
              <h4 className="font-medium mb-3">📧 Email Composer</h4>

              <input
                type="text"
                value={emailRequest}
                onChange={(e) => setEmailRequest(e.target.value)}
                placeholder="e.g., Email to landlord about viewing a flat"
                className="w-full p-2 border rounded mb-3"
              />

              <button
                onClick={handleEmailGeneration}
                className="w-full bg-primary text-white p-2 rounded mb-3"
              >
                Generate Email
              </button>

              {generatedEmail && (
                <textarea
                  value={generatedEmail}
                  onChange={(e) => setGeneratedEmail(e.target.value)}
                  rows={8}
                  className="w-full p-2 border rounded text-sm"
                  placeholder="Generated email will appear here..."
                />
              )}
            </div>

            {/* Show current destinations */}
            {travelDestinations.length > 0 && (
              <div className="mt-4 p-4 bg-secondary/10 rounded-lg">
                <h4 className="font-medium mb-2">Active Destinations:</h4>
                <ul className="text-sm space-y-1">
                  {travelDestinations.map((dest) => (
                    <li key={dest.id} className="flex items-center gap-2">
                      <span className="w-2 h-2 bg-primary rounded-full"></span>
                      {dest.name} ({dest.travelMode})
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>

          {/* Properties and Map */}
          <div className="lg:col-span-2">
            <Tabs defaultValue="list" className="w-full">
              <TabsList className="grid w-full grid-cols-2 mb-6">
                <TabsTrigger value="list" className="flex items-center gap-2">
                  <Home className="h-4 w-4" />
                  Properties ({properties.length})
                </TabsTrigger>
                <TabsTrigger value="map" className="flex items-center gap-2">
                  <MapPin className="h-4 w-4" />
                  Map View
                </TabsTrigger>
              </TabsList>

              <TabsContent value="list" className="space-y-6">
                <div className="flex items-center justify-between">
                  <h2 className="text-2xl font-bold text-foreground">
                    Search Results
                  </h2>
                  <span className="text-muted-foreground">
                    {isSearching
                      ? "Searching..."
                      : `${properties.length} properties found`}
                  </span>
                </div>

                {/* Agent Response */}
                {agentResponse && (
                  <div className="bg-card p-6 rounded-lg shadow-card mb-6"></div>
                )}

                {isSearching ? (
                  <div className="text-center py-12">
                    <div className="animate-spin h-8 w-8 border-2 border-primary border-t-transparent rounded-full mx-auto mb-4"></div>
                    <p className="text-lg">Searching for properties...</p>
                  </div>
                ) : properties.length > 0 ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {properties.map((property) => (
                      <PropertyCard
                        key={property.id}
                        property={property}
                        onContact={handleContact}
                        onViewDetails={handleViewDetails}
                      />
                    ))}
                  </div>
                ) : searchFilters ? (
                  <div className="text-center py-12">
                    <p className="text-lg text-muted-foreground">
                      No structured property data found. Check the agent
                      response above for details.
                    </p>
                  </div>
                ) : (
                  <div className="text-center py-12 bg-card p-8 rounded-lg">
                    <Home className="h-16 w-16 mx-auto mb-4 text-muted-foreground" />
                    <p className="text-lg text-muted-foreground mb-2">
                      Ready to find your perfect home?
                    </p>
                    <p className="text-sm text-muted-foreground">
                      Use the search form above to get started. Our AI agents
                      will search across Rightmove, Zoopla, and SpareRoom for
                      you.
                    </p>
                  </div>
                )}
              </TabsContent>

              <TabsContent value="map" className="h-[600px]">
                {properties.length > 0 ? (
                  <PropertyMap
                    properties={properties}
                    center={[51.5074, -0.1278]} // London center
                    onPropertyClick={handleViewDetails}
                  />
                ) : (
                  <div className="flex items-center justify-center h-full bg-card rounded-lg">
                    <div className="text-center">
                      <MapPin className="h-16 w-16 mx-auto mb-4 text-muted-foreground" />
                      <p className="text-lg text-muted-foreground">
                        No properties to display on map
                      </p>
                      <p className="text-sm text-muted-foreground">
                        Search for properties to see them plotted here
                      </p>
                    </div>
                  </div>
                )}
              </TabsContent>
            </Tabs>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-20 bg-secondary/30">
        <div className="container mx-auto px-6">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-4">
              Why Choose RealEstate Buddy?
            </h2>
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
              We make finding your perfect home easier with smart features
              designed for busy people.
            </p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="text-center p-8 bg-card rounded-xl shadow-card">
              <div className="bg-primary/10 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                <Home className="h-8 w-8 text-primary" />
              </div>
              <h3 className="text-xl font-semibold mb-3">
                Smart Budget Search
              </h3>
              <p className="text-muted-foreground">
                Find properties that match your exact budget and location
                preferences across the UK.
              </p>
            </div>
            <div className="text-center p-8 bg-card rounded-xl shadow-card">
              <div className="bg-primary/10 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                <Clock className="h-8 w-8 text-primary" />
              </div>
              <h3 className="text-xl font-semibold mb-3">
                Travel Time Insights
              </h3>
              <p className="text-muted-foreground">
                See exactly how long it takes to get to work, gym, or anywhere
                else that matters to you.
              </p>
            </div>
            <div className="text-center p-8 bg-card rounded-xl shadow-card">
              <div className="bg-primary/10 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                <Zap className="h-8 w-8 text-primary" />
              </div>
              <h3 className="text-xl font-semibold mb-3">Auto Contact Forms</h3>
              <p className="text-muted-foreground">
                Our agents handle all the paperwork and contact forms, so you
                don't have to.
              </p>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
};

export default Index;
