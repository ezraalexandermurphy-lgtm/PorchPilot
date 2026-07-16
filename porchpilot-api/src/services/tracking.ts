import type { ShipmentStatus, TrackingEvent } from '../types/index.js';

/**
 * Supported carrier identifiers and their tracking URL patterns.
 */
const CARRIER_TRACKING_URLS: Record<string, string> = {
  UPS: 'https://www.ups.com/track?tracknum={tracking}',
  FedEx: 'https://www.fedex.com/fedextrack/?trknbr={tracking}',
  USPS: 'https://tools.usps.com/go/TrackConfirmAction?tLabels={tracking}',
  DHL: 'https://www.dhl.com/us-en/home/tracking/tracking-global.html?tracking-id={tracking}',
  'Amazon Logistics': 'https://www.amazon.com/gp/css/account/track/{tracking}',
  Ontrac: 'https://www.ontrac.com/track?number={tracking}',
  'UPS MI': 'https://www.ups.com/track?tracknum={tracking}',
  'FedEx SmartPost': 'https://www.fedex.com/fedextrack/?trknbr={tracking}',
};

export interface CarrierLookupResult {
  carrier: string;
  confidence: number;
}

/**
 * Service for querying carrier tracking APIs and resolving tracking numbers.
 */
export class TrackingService {
  /**
   * Identify the carrier from a tracking number.
   */
  identifyCarrier(trackingNumber: string): CarrierLookupResult[] {
    const results: CarrierLookupResult[] = [];
    const upper = trackingNumber.toUpperCase();

    // UPS: starts with "1Z"
    if (/^1Z[A-Z0-9]{15,17}$/.test(upper)) {
      results.push({ carrier: 'UPS', confidence: 0.99 });
    }

    // FedEx: 12-15 digits
    if (/^\d{12,15}$/.test(upper)) {
      results.push({ carrier: 'FedEx', confidence: 0.8 });
    }

    // USPS: starts with 9 + 19-21 digits (tracking), or 20-22 digits
    if (/^9\d{19,21}$/.test(upper)) {
      results.push({ carrier: 'USPS', confidence: 0.9 });
    }

    // DHL: 10 digits starting with JJD or uniq
    if (/^JJD\d{7,10}$/.test(upper)) {
      results.push({ carrier: 'DHL', confidence: 0.85 });
    }

    return results;
  }

  /**
   * Get tracking URL for a given carrier and tracking number.
   */
  getTrackingUrl(carrier: string, trackingNumber: string): string | null {
    const pattern = CARRIER_TRACKING_URLS[carrier];
    if (!pattern) return null;
    return pattern.replace('{tracking}', trackingNumber);
  }

  /**
   * Estimate delivery date range from tracking events.
   */
  estimateDeliveryDate(
    events: TrackingEvent[],
    _carrier: string,
  ): { start: Date | null; end: Date | null } {
    if (events.length === 0) return { start: null, end: null };

    // If delivered, use the delivery event's timestamp
    const delivered = events.find((e) => e.status === 'delivered');
    if (delivered) {
      return {
        start: new Date(delivered.occurred_at),
        end: new Date(delivered.occurred_at),
      };
    }

    // Simplistic: if in transit, assume 2-5 days from last event
    const lastEvent = events[events.length - 1];
    const lastDate = new Date(lastEvent.occurred_at);
    const start = new Date(lastDate);
    start.setDate(start.getDate() + 2);
    const end = new Date(lastDate);
    end.setDate(end.getDate() + 5);

    return { start, end };
  }

  /**
   * Interpret a status string into our normalized ShipmentStatus.
   */
  normalizeStatus(carrierStatus: string): ShipmentStatus {
    const lower = carrierStatus.toLowerCase();

    if (lower.includes('delivered') || lower.includes('delivery complete')) return 'delivered';
    if (lower.includes('out for delivery')) return 'out_for_delivery';
    if (lower.includes('in transit') || lower.includes('en route')) return 'in_transit';
    if (lower.includes('picked up') || lower.includes('pickup')) return 'picked_up';
    if (lower.includes('label created') || lower.includes('shipping label')) return 'label_created';
    if (lower.includes('delay') || lower.includes('late')) return 'delayed';
    if (lower.includes('exception') || lower.includes('damage') || lower.includes('return')) return 'exception';
    if (lower.includes('cancel')) return 'cancelled';

    return 'in_transit'; // fallback
  }
}

export const trackingService = new TrackingService();