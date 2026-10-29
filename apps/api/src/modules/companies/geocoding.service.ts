import { Injectable, Logger } from '@nestjs/common';
import { outboundFetch, TIMEOUT_PUBLIC_LOOKUP_MS } from '../../common/http/outbound';

@Injectable()
export class GeocodingService {
  private readonly logger = new Logger(GeocodingService.name);

  async findCoordinates(address: string): Promise<{ latitude: number; longitude: number } | null> {
    try {
      if (!address.trim()) return null;

      const url = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(address)}&limit=1`;
      
      const response = await outboundFetch(url, { headers: { 'User-Agent': 'InnovationRH/1.0' } }, { timeoutMs: TIMEOUT_PUBLIC_LOOKUP_MS });

      if (!response.ok) {
        this.logger.warn(`Geocoding failed with status: ${response.status}`);
        return null;
      }

      const data = await response.json();
      if (Array.isArray(data) && data.length > 0) {
        return {
          latitude: parseFloat(data[0].lat),
          longitude: parseFloat(data[0].lon),
        };
      }
      return null;
    } catch (error) {
      this.logger.error('Error in geocoding service', error);
      return null;
    }
  }
}
