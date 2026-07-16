/**
 * Parsed result from a shipping confirmation email.
 */
export interface ParsedOrder {
  retailer: string;
  retailerOrderId: string | null;
  orderDate: Date;
  estimatedDeliveryStart: Date | null;
  estimatedDeliveryEnd: Date | null;
  items: ParsedOrderItem[];
  shipments: ParsedShipment[];
  totalAmount: number | null;
  currency: string | null;
  shippingAddress: string | null;
  rawSubject: string;
  rawSnippet: string;
}

export interface ParsedOrderItem {
  name: string;
  quantity: number;
  price: number | null;
  currency: string | null;
  imageUrl: string | null;
  sku: string | null;
}

export interface ParsedShipment {
  trackingNumber: string;
  carrier: string;
  estimatedDeliveryDate: Date | null;
  serviceLevel: string | null;
}

/**
 * Retailer-specific email parsing strategies.
 * Each retailer's confirmation emails have distinct HTML structures.
 */
export class EmailParserService {
  /**
   * Parse a shipping confirmation email body into structured order data.
   */
  async parseOrderEmail(
    bodyHtml: string,
    subject: string,
    snippet: string,
    from: string,
  ): Promise<ParsedOrder | null> {
    // Detect retailer from sender domain
    const retailer = this.detectRetailer(from, subject);
    if (!retailer) {
      return null; // Not a known shipping confirmation sender
    }

    // Route to retailer-specific parser
    switch (retailer) {
      case 'Amazon':
        return this.parseAmazonEmail(bodyHtml, subject, snippet);
      case 'Chewy':
        return this.parseChewyEmail(bodyHtml, subject, snippet);
      case 'Walgreens':
        return this.parseWalgreensEmail(bodyHtml, subject, snippet);
      case 'Walmart':
        return this.parseWalmartEmail(bodyHtml, subject, snippet);
      case 'Target':
        return this.parseTargetEmail(bodyHtml, subject, snippet);
      default:
        return this.parseGenericEmail(bodyHtml, subject, snippet, retailer);
    }
  }

  /**
   * Identify the retailer from the sender email domain and subject line.
   */
  private detectRetailer(from: string, subject: string): string | null {
    const lower = from.toLowerCase();
    const subjLower = subject.toLowerCase();

    if (lower.includes('@amazon.') || subjLower.includes('amazon')) return 'Amazon';
    if (lower.includes('@chewy.') || subjLower.includes('chewy')) return 'Chewy';
    if (lower.includes('@walgreens.') || subjLower.includes('walgreens')) return 'Walgreens';
    if (lower.includes('@walmart.') || subjLower.includes('walmart')) return 'Walmart';
    if (lower.includes('@target.') || subjLower.includes('target')) return 'Target';
    if (lower.includes('@bestbuy.') || subjLower.includes('best buy')) return 'Best Buy';
    if (lower.includes('@ebay.') || subjLower.includes('ebay')) return 'eBay';
    if (lower.includes('@etsy.') || subjLower.includes('etsy')) return 'Etsy';
    if (lower.includes('@homedepot.') || subjLower.includes('home depot')) return 'Home Depot';
    if (lower.includes('@lowes.') || subjLower.includes("lowes")) return 'Lowe\'s';

    return null;
  }

  /**
   * Extract tracking number using common carrier patterns.
   */
  extractTrackingNumber(text: string): string | null {
    // UPS: 1Z followed by 16 chars
    const upsMatch = text.match(/1Z[A-Z0-9]{15,17}/);
    if (upsMatch) return upsMatch[0];

    // FedEx: 12-15 digit number
    const fedexMatch = text.match(/\b(\d{12,15})\b/);
    if (fedexMatch) return fedexMatch[0];

    // USPS: 20-22 digit number or alphanumeric
    const uspsMatch = text.match(/\b(9\d{19,21})\b/);
    if (uspsMatch) return uspsMatch[0];

    return null;
  }

  // ─── Retailer-specific parsers (stubs) ────────────────────────────────

  private async parseAmazonEmail(
    _html: string, _subject: string, _snippet: string,
  ): Promise<ParsedOrder | null> {
    return null; // TODO: implement Amazon-specific HTML parsing
  }

  private async parseChewyEmail(
    _html: string, _subject: string, _snippet: string,
  ): Promise<ParsedOrder | null> {
    return null;
  }

  private async parseWalgreensEmail(
    _html: string, _subject: string, _snippet: string,
  ): Promise<ParsedOrder | null> {
    return null;
  }

  private async parseWalmartEmail(
    _html: string, _subject: string, _snippet: string,
  ): Promise<ParsedOrder | null> {
    return null;
  }

  private async parseTargetEmail(
    _html: string, _subject: string, _snippet: string,
  ): Promise<ParsedOrder | null> {
    return null;
  }

  private async parseGenericEmail(
    _html: string, _subject: string, _snippet: string, _retailer: string,
  ): Promise<ParsedOrder | null> {
    return null;
  }
}

export const emailParser = new EmailParserService();