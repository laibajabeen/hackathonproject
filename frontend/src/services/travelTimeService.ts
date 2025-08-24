// services/travelTimeService.ts
interface TravelTimeResult {
  duration: number; // in minutes
  distance: number; // in miles or km
  mode: string;
}

interface TravelDestination {
  address: string;
  mode: "driving" | "transit" | "walking" | "bicycling";
}

const API_BASE_URL = "http://127.0.0.1:8000";

export class TravelTimeService {
  private sessionId: string;

  constructor(sessionId: string = "travel_default") {
    this.sessionId = sessionId;
  }

  async calculateMultipleDestinations(
    propertyCoords: [number, number], // [longitude, latitude]
    destinations: TravelDestination[]
  ): Promise<(TravelTimeResult | null)[]> {
    try {
      const results: (TravelTimeResult | null)[] = [];

      for (const destination of destinations) {
        try {
          const result = await this.calculateSingleDestination(
            propertyCoords,
            destination
          );
          results.push(result);
        } catch (error) {
          console.error(
            `Error calculating travel time for ${destination.address}:`,
            error
          );
          results.push(null);
        }
      }

      return results;
    } catch (error) {
      console.error("Error in calculateMultipleDestinations:", error);
      return destinations.map(() => null);
    }
  }

  private async calculateSingleDestination(
    propertyCoords: [number, number],
    destination: TravelDestination
  ): Promise<TravelTimeResult | null> {
    try {
      // Create a natural language query for the AI
      const query = `Calculate travel time and distance from coordinates ${propertyCoords[1]}, ${propertyCoords[0]} to ${destination.address} by ${destination.mode}. 

Please provide the result in this EXACT format:
Duration: X minutes
Distance: X miles
Mode: ${destination.mode}

Be as accurate as possible based on typical UK travel times and distances.`;

      console.log(
        `🚗 Calculating travel time from [${propertyCoords[1]}, ${propertyCoords[0]}] to ${destination.address} by ${destination.mode}`
      );

      const response = await fetch(`${API_BASE_URL}/realestate-agent`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          prompt: query,
          session_id: this.sessionId, // Add the missing session_id
        }),
      });

      if (!response.ok) {
        console.error(`HTTP ${response.status}: ${response.statusText}`);
        throw new Error(
          `Travel time calculation failed: ${response.statusText}`
        );
      }

      const data = await response.json();
      console.log("🤖 AI Response for travel:", data.result);

      const result = this.parseTravelResponse(data.result);
      console.log("📊 Parsed travel result:", result);

      return result;
    } catch (error) {
      console.error("❌ Error calculating single destination:", error);
      return null;
    }
  }

  private parseTravelResponse(responseText: string): TravelTimeResult | null {
    try {
      console.log("🔍 Parsing travel response:", responseText);

      // Enhanced parsing with multiple patterns
      const patterns = [
        // Standard format
        {
          duration: /Duration:\s*(\d+(?:\.\d+)?)\s*minutes?/i,
          distance: /Distance:\s*(\d+(?:\.\d+)?)\s*miles?/i,
          mode: /Mode:\s*(\w+)/i,
        },
        // Alternative formats
        {
          duration: /(\d+(?:\.\d+)?)\s*(?:min|minutes|mins)/i,
          distance: /(\d+(?:\.\d+)?)\s*(?:miles?|mi|km)/i,
          mode: /(?:by|via|using)\s*(\w+)/i,
        },
        // Sentence format
        {
          duration:
            /takes?\s+(?:about|approximately)?\s*(\d+(?:\.\d+)?)\s*(?:min|minutes)/i,
          distance:
            /(?:about|approximately)?\s*(\d+(?:\.\d+)?)\s*(?:miles?|mi)/i,
          mode: /travel(?:ling)?\s+by\s+(\w+)/i,
        },
      ];

      let duration = null;
      let distance = null;
      let mode = "driving";

      // Try each pattern set
      for (const pattern of patterns) {
        const durationMatch = responseText.match(pattern.duration);
        const distanceMatch = responseText.match(pattern.distance);
        const modeMatch = responseText.match(pattern.mode);

        if (durationMatch) duration = parseFloat(durationMatch[1]);
        if (distanceMatch) distance = parseFloat(distanceMatch[1]);
        if (modeMatch) mode = modeMatch[1];

        if (duration && distance) break;
      }

      // Convert km to miles if needed
      if (distance && responseText.toLowerCase().includes("km")) {
        distance = distance * 0.621371;
      }

      // If we have both duration and distance
      if (duration && distance) {
        const result = {
          duration: duration,
          distance: distance,
          mode: mode,
        };
        console.log("✅ Successfully parsed:", result);
        return result;
      }

      // Fallback: estimate based on typical UK travel patterns
      console.log("🔄 Using fallback estimation...");

      // Try to extract just the numbers for fallback
      const anyDuration = responseText.match(/(\d+(?:\.\d+)?)/);
      const fallbackDuration = anyDuration ? parseFloat(anyDuration[1]) : 25;

      const fallbackDistance = Math.max(5, fallbackDuration * 0.4); // Rough estimate

      return {
        duration: Math.min(fallbackDuration, 120), // Cap at 2 hours
        distance: Math.min(fallbackDistance, 50), // Cap at 50 miles
        mode: mode,
      };
    } catch (error) {
      console.error("❌ Error parsing travel response:", error);
      return {
        duration: 30,
        distance: 10,
        mode: "driving",
      };
    }
  }

  // Method to update session ID
  setSessionId(sessionId: string) {
    this.sessionId = sessionId;
  }
}

// Utility functions for formatting
export const formatTravelTime = (minutes: number): string => {
  if (minutes < 60) {
    return `${Math.round(minutes)} min`;
  } else {
    const hours = Math.floor(minutes / 60);
    const mins = Math.round(minutes % 60);
    return mins > 0 ? `${hours}h ${mins}min` : `${hours}h`;
  }
};

export const formatDistance = (distance: number): string => {
  return `${distance.toFixed(1)} miles`;
};
