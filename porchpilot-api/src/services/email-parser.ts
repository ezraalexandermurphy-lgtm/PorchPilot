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
    const retailer = this.detectRetailer(from, subject);
    if (!retailer) {
      return null;
    }

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

    if (lower.includes('@amazon.') || subjLower.includes('amazon') || subjLower.includes('your amazon')) return 'Amazon';
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
   * Strip HTML tags and decode common entities.
   */
  private stripHtml(html: string): string {
    return html
      .replace(/<br\s*\/?>/gi, '\n')
      .replace(/<[^>]*>/g, ' ')
      .replace(/&amp;/g, '&')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&nbsp;/g, ' ')
      .replace(/&quot;/g, '"')
      .replace(/&#39;/g, "'")
      .replace(/\s+/g, ' ')
      .trim();
  }

  /**
   * Extract a value from text using a regex pattern.
   */
  private extractValue(text: string, pattern: RegExp): string | null {
    const match = text.match(pattern);
    return match ? match[1].trim() : null;
  }

  /**
   * Parse a dollar amount from a string.
   */
  private parseAmount(text: string): { amount: number | null; currency: string | null } {
    const match = text.match(/([A-Z]{3})?\s*\$?([0-9,]+\.\d{2})/);
    if (match) {
      return {
        amount: parseFloat(match[2].replace(/,/g, '')),
        currency: match[1] ?? 'USD',
      };
    }
    return { amount: null, currency: 'USD' };
  }

  /**
   * Extract all tracking numbers from text.
   */
  private extractAllTrackingNumbers(text: string): Array<{ trackingNumber: string; carrier: string }> {
    const results: Array<{ trackingNumber: string; carrier: string }> = [];
    const seen = new Set<string>();

    // UPS: 1Z followed by 16-18 alphanumeric chars
    const upsMatches = text.match(/\b1Z[A-Z0-9]{15,17}\b/g);
    if (upsMatches) {
      for (const tn of upsMatches) {
        if (!seen.has(tn)) { seen.add(tn); results.push({ trackingNumber: tn, carrier: 'UPS' }); }
      }
    }

    // FedEx: 12-15 digits
    const fedexMatches = text.match(/\b(\d{12,15})\b/g);
    if (fedexMatches) {
      for (const tn of fedexMatches) {
        if (!seen.has(tn)) { seen.add(tn); results.push({ trackingNumber: tn, carrier: 'FedEx' }); }
      }
    }

    // USPS: 20-22 digits starting with 9
    const uspsMatches = text.match(/\b(9\d{19,21})\b/g);
    if (uspsMatches) {
      for (const tn of uspsMatches) {
        if (!seen.has(tn)) { seen.add(tn); results.push({ trackingNumber: tn, carrier: 'USPS' }); }
      }
    }

    // Amazon Logistics: TBA + digits
    const amzMatches = text.match(/\b(TBA\d{8,15})\b/g);
    if (amzMatches) {
      for (const tn of amzMatches) {
        if (!seen.has(tn)) { seen.add(tn); results.push({ trackingNumber: tn, carrier: 'Amazon Logistics' }); }
      }
    }

    // DHL: starts with JJD
    const dhlMatches = text.match(/\b(JJD\d{7,12})\b/g);
    if (dhlMatches) {
      for (const tn of dhlMatches) {
        if (!seen.has(tn)) { seen.add(tn); results.push({ trackingNumber: tn, carrier: 'DHL' }); }
      }
    }

    return results;
  }

  /**
   * Extract a delivery date from text.
   */
  private extractDeliveryDate(text: string): Date | null {
    const datePatterns = [
      /(\w+)\s+(\d{1,2}),?\s+(\d{4})/g,
      /(\d{1,2})\/(\d{1,2})\/(\d{4})/g,
      /(\d{4})-(\d{1,2})-(\d{1,2})/g,
    ];

    for (const pattern of datePatterns) {
      const matches = text.matchAll(pattern);
      for (const m of matches) {
        let month: number, day: number, year: number;
        if (m[0].includes('-') && m[0].length === 10) {
          year = parseInt(m[1]);
          month = parseInt(m[2]) - 1;
          day = parseInt(m[3]);
        } else if (m[0].includes('/')) {
          month = parseInt(m[1]) - 1;
          day = parseInt(m[2]);
          year = parseInt(m[3]);
        } else {
          const monthNames: Record<string, number> = {
            january: 0, february: 1, march: 2, april: 3, may: 4, june: 5,
            july: 6, august: 7, september: 8, october: 9, november: 10, december: 11,
          };
          month = monthNames[m[1].toLowerCase()] ?? -1;
          day = parseInt(m[2]);
          year = parseInt(m[3]);
        }

        if (month >= 0 && day >= 1 && year >= 2024) {
          const date = new Date(year, month, day);
          if (!isNaN(date.getTime())) return date;
        }
      }
    }
    return null;
  }

  // ─── Amazon-specific parser ──────────────────────────────────────────

  private async parseAmazonEmail(
    html: string, subject: string, snippet: string,
  ): Promise<ParsedOrder | null> {
    const text = this.stripHtml(html);
    const combined = `${subject} ${snippet} ${text}`;

    // Extract order ID: 113-1234567-8901234
    const orderId = this.extractValue(combined, /\b(\d{3}-\d{7}-\d{7})\b/);

    // Order date
    const orderDate = new Date();

    // Delivery estimate: "Arriving January 20, 2025"
    const deliveryStr = this.extractValue(combined, /(?:Arriving|Get it by|Delivery date|Delivering)\s+([^.\n]+)/i);
    const deliveryDate = deliveryStr ? this.extractDeliveryDate(deliveryStr + ' ' + combined) : null;

    // Extract items from Amazon's item list
    const items: ParsedOrderItem[] = [];
    const itemRegex = new RegExp(
      '([A-Z][A-Za-z0-9\\s,.\'\\"!&/-]{5,150}?)\\s*\\$?([0-9,]+\\.\\d{2})?',
      'g'
    );
    let itemMatch;
    while ((itemMatch = itemRegex.exec(combined)) !== null) {
      const name = itemMatch[1].trim();
      const price = itemMatch[2] ? parseFloat(itemMatch[2].replace(/,/g, '')) : null;
      if (name.length > 5 && !name.toLowerCase().includes('amazon') && !name.toLowerCase().includes('order')) {
        items.push({ name, quantity: 1, price, currency: 'USD', imageUrl: null, sku: null });
      }
    }

    // Total
    const totalMatch = combined.match(/(?:Order total|Total charged|Total)[:\s]*\$?[0-9,]+\.\d{2}/i);
    const totalAmount = totalMatch ? this.parseAmount(totalMatch[0]).amount : this.parseAmount(combined).amount;

    // Tracking numbers
    const trackingNumbers = this.extractAllTrackingNumbers(combined);

    const shipments: ParsedShipment[] = trackingNumbers.length > 0
      ? trackingNumbers.map((t) => ({
          trackingNumber: t.trackingNumber,
          carrier: t.carrier,
          estimatedDeliveryDate: deliveryDate,
          serviceLevel: null,
        }))
      : [{ trackingNumber: 'PENDING', carrier: 'Amazon Logistics', estimatedDeliveryDate: deliveryDate, serviceLevel: null }];

    // Shipping address
    const shippingAddress = this.extractValue(combined, /(?:Shipping address|Deliver to)[:\s]+([^.\n]{10,200})/i);

    return {
      retailer: 'Amazon',
      retailerOrderId: orderId,
      orderDate,
      estimatedDeliveryStart: deliveryDate,
      estimatedDeliveryEnd: deliveryDate ? new Date(deliveryDate.getTime() + 86400000) : null,
      items,
      shipments,
      totalAmount,
      currency: 'USD',
      shippingAddress,
      rawSubject: subject,
      rawSnippet: snippet,
    };
  }

  // ─── Chewy-specific parser ───────────────────────────────────────────

  private async parseChewyEmail(
    html: string, subject: string, snippet: string,
  ): Promise<ParsedOrder | null> {
    const text = this.stripHtml(html);
    const combined = `${subject} ${snippet} ${text}`;

    const orderId = this.extractValue(combined, /(?:Order\s*#|Order Number|CHW-)[:\s]*([A-Z0-9-]+)/i)
      ?? this.extractValue(combined, /\b(CHW-\d{5,8})\b/);

    const orderDate = new Date();
    const deliveryDate = this.extractDeliveryDate(combined);

    const items: ParsedOrderItem[] = [];
    const itemRegex = new RegExp(
      '([A-Z][A-Za-z0-9\\s,.\'\\"!&/-]{5,120}?)\\s*(?:\\(Qty:\\s*(\\d+)\\))?\\s*\\$?([0-9,]+\\.\\d{2})?',
      'g'
    );
    let itemMatch;
    while ((itemMatch = itemRegex.exec(combined)) !== null) {
      const name = itemMatch[1].trim();
      const qty = itemMatch[2] ? parseInt(itemMatch[2]) : 1;
      const price = itemMatch[3] ? parseFloat(itemMatch[3].replace(/,/g, '')) : null;
      if (name.length > 5 && !name.toLowerCase().includes('chewy')) {
        items.push({ name, quantity: qty, price, currency: 'USD', imageUrl: null, sku: null });
      }
    }

    const totalAmount = this.parseAmount(combined).amount;
    const trackingNumbers = this.extractAllTrackingNumbers(combined);

    const shipments: ParsedShipment[] = trackingNumbers.length > 0
      ? trackingNumbers.map((t) => ({
          trackingNumber: t.trackingNumber,
          carrier: t.carrier,
          estimatedDeliveryDate: deliveryDate,
          serviceLevel: null,
        }))
      : [];

    return {
      retailer: 'Chewy',
      retailerOrderId: orderId,
      orderDate,
      estimatedDeliveryStart: deliveryDate,
      estimatedDeliveryEnd: deliveryDate ? new Date(deliveryDate.getTime() + 86400000) : null,
      items,
      shipments,
      totalAmount,
      currency: 'USD',
      shippingAddress: null,
      rawSubject: subject,
      rawSnippet: snippet,
    };
  }

  // ─── Walgreens-specific parser ───────────────────────────────────────

  private async parseWalgreensEmail(
    html: string, subject: string, snippet: string,
  ): Promise<ParsedOrder | null> {
    const text = this.stripHtml(html);
    const combined = `${subject} ${snippet} ${text}`;

    const orderId = this.extractValue(combined, /(?:Order\s*#|Order Number)[:\s]*([A-Z0-9-]+)/i)
      ?? this.extractValue(combined, /\b(WAG-\d{5,8})\b/);

    const orderDate = new Date();
    const deliveryDate = this.extractDeliveryDate(combined);

    const items: ParsedOrderItem[] = [];
    const itemRegex = new RegExp(
      '([A-Z][A-Za-z0-9\\s,.\'\\"!&/-]{5,100}?)\\s*\\$?([0-9,]+\\.\\d{2})?',
      'g'
    );
    let itemMatch;
    while ((itemMatch = itemRegex.exec(combined)) !== null) {
      const name = itemMatch[1].trim();
      if (name.length > 5 && !name.toLowerCase().includes('walgreens')) {
        items.push({
          name, quantity: 1,
          price: itemMatch[2] ? parseFloat(itemMatch[2].replace(/,/g, '')) : null,
          currency: 'USD', imageUrl: null, sku: null,
        });
      }
    }

    const totalAmount = this.parseAmount(combined).amount;
    const trackingNumbers = this.extractAllTrackingNumbers(combined);

    const shipments: ParsedShipment[] = trackingNumbers.length > 0
      ? trackingNumbers.map((t) => ({
          trackingNumber: t.trackingNumber,
          carrier: t.carrier,
          estimatedDeliveryDate: deliveryDate,
          serviceLevel: null,
        }))
      : [];

    return {
      retailer: 'Walgreens',
      retailerOrderId: orderId,
      orderDate,
      estimatedDeliveryStart: deliveryDate,
      estimatedDeliveryEnd: deliveryDate ? new Date(deliveryDate.getTime() + 86400000) : null,
      items,
      shipments,
      totalAmount,
      currency: 'USD',
      shippingAddress: null,
      rawSubject: subject,
      rawSnippet: snippet,
    };
  }

  // ─── Walmart-specific parser ─────────────────────────────────────────

  private async parseWalmartEmail(
    html: string, subject: string, snippet: string,
  ): Promise<ParsedOrder | null> {
    const text = this.stripHtml(html);
    const combined = `${subject} ${snippet} ${text}`;

    const orderId = this.extractValue(combined, /(?:Order\s*#|Order Number)[:\s]*([A-Z0-9-]+)/i)
      ?? this.extractValue(combined, /\b(\d{8,15})\b/);

    const orderDate = new Date();
    const deliveryDate = this.extractDeliveryDate(combined);

    const items: ParsedOrderItem[] = [];
    const itemRegex = new RegExp(
      '([A-Z][A-Za-z0-9\\s,.\'\\"!&/-]{5,120}?)\\s*\\$?([0-9,]+\\.\\d{2})?',
      'g'
    );
    let itemMatch;
    while ((itemMatch = itemRegex.exec(combined)) !== null) {
      const name = itemMatch[1].trim();
      if (name.length > 5 && !name.toLowerCase().includes('walmart')) {
        items.push({
          name, quantity: 1,
          price: itemMatch[2] ? parseFloat(itemMatch[2].replace(/,/g, '')) : null,
          currency: 'USD', imageUrl: null, sku: null,
        });
      }
    }

    const totalAmount = this.parseAmount(combined).amount;
    const trackingNumbers = this.extractAllTrackingNumbers(combined);

    const shipments: ParsedShipment[] = trackingNumbers.length > 0
      ? trackingNumbers.map((t) => ({
          trackingNumber: t.trackingNumber,
          carrier: t.carrier,
          estimatedDeliveryDate: deliveryDate,
          serviceLevel: null,
        }))
      : [];

    const shippingAddress = this.extractValue(combined, /(?:Shipping to|Deliver to|Ship to)[:\s]+([^.\n]{10,200})/i);

    return {
      retailer: 'Walmart',
      retailerOrderId: orderId,
      orderDate,
      estimatedDeliveryStart: deliveryDate,
      estimatedDeliveryEnd: deliveryDate ? new Date(deliveryDate.getTime() + 86400000) : null,
      items,
      shipments,
      totalAmount,
      currency: 'USD',
      shippingAddress,
      rawSubject: subject,
      rawSnippet: snippet,
    };
  }

  // ─── Target-specific parser ──────────────────────────────────────────

  private async parseTargetEmail(
    html: string, subject: string, snippet: string,
  ): Promise<ParsedOrder | null> {
    const text = this.stripHtml(html);
    const combined = `${subject} ${snippet} ${text}`;

    const orderId = this.extractValue(combined, /(?:Order\s*#|Order Number|Confirmation #)[:\s]*([A-Z0-9-]+)/i)
      ?? this.extractValue(combined, /\b(\d{8,12})\b/);

    const orderDate = new Date();
    const deliveryDate = this.extractDeliveryDate(combined);

    const items: ParsedOrderItem[] = [];
    const itemRegex = new RegExp(
      '([A-Z][A-Za-z0-9\\s,.\'\\"!&/-]{5,120}?)\\s*\\$?([0-9,]+\\.\\d{2})?',
      'g'
    );
    let itemMatch;
    while ((itemMatch = itemRegex.exec(combined)) !== null) {
      const name = itemMatch[1].trim();
      if (name.length > 5 && !name.toLowerCase().includes('target')) {
        items.push({
          name, quantity: 1,
          price: itemMatch[2] ? parseFloat(itemMatch[2].replace(/,/g, '')) : null,
          currency: 'USD', imageUrl: null, sku: null,
        });
      }
    }

    const totalAmount = this.parseAmount(combined).amount;
    const trackingNumbers = this.extractAllTrackingNumbers(combined);

    const shipments: ParsedShipment[] = trackingNumbers.length > 0
      ? trackingNumbers.map((t) => ({
          trackingNumber: t.trackingNumber,
          carrier: t.carrier,
          estimatedDeliveryDate: deliveryDate,
          serviceLevel: null,
        }))
      : [];

    return {
      retailer: 'Target',
      retailerOrderId: orderId,
      orderDate,
      estimatedDeliveryStart: deliveryDate,
      estimatedDeliveryEnd: deliveryDate ? new Date(deliveryDate.getTime() + 86400000) : null,
      items,
      shipments,
      totalAmount,
      currency: 'USD',
      shippingAddress: null,
      rawSubject: subject,
      rawSnippet: snippet,
    };
  }

  // ─── Generic fallback parser ─────────────────────────────────────────

  private async parseGenericEmail(
    html: string, subject: string, snippet: string, retailer: string,
  ): Promise<ParsedOrder | null> {
    const text = this.stripHtml(html);
    const combined = `${subject} ${snippet} ${text}`;

    const orderId = this.extractValue(combined, /(?:Order\s*#|Order Number|Confirmation #|Order ID)[:\s]*([A-Z0-9-]+)/i);
    const orderDate = new Date();
    const deliveryDate = this.extractDeliveryDate(combined);

    const items: ParsedOrderItem[] = [];
    const itemRegex = new RegExp(
      '([A-Z][A-Za-z0-9\\s,.\'\\"!&/-]{5,100}?)\\s*\\$?([0-9,]+\\.\\d{2})?',
      'g'
    );
    let itemMatch;
    while ((itemMatch = itemRegex.exec(combined)) !== null) {
      const name = itemMatch[1].trim();
      if (name.length > 5 && !name.toLowerCase().includes(retailer.toLowerCase())) {
        items.push({
          name, quantity: 1,
          price: itemMatch[2] ? parseFloat(itemMatch[2].replace(/,/g, '')) : null,
          currency: 'USD', imageUrl: null, sku: null,
        });
      }
    }

    const totalAmount = this.parseAmount(combined).amount;
    const trackingNumbers = this.extractAllTrackingNumbers(combined);

    const shipments: ParsedShipment[] = trackingNumbers.length > 0
      ? trackingNumbers.map((t) => ({
          trackingNumber: t.trackingNumber,
          carrier: t.carrier,
          estimatedDeliveryDate: deliveryDate,
          serviceLevel: null,
        }))
      : [];

    return {
      retailer,
      retailerOrderId: orderId,
      orderDate,
      estimatedDeliveryStart: deliveryDate,
      estimatedDeliveryEnd: deliveryDate ? new Date(deliveryDate.getTime() + 86400000) : null,
      items,
      shipments,
      totalAmount,
      currency: 'USD',
      shippingAddress: null,
      rawSubject: subject,
      rawSnippet: snippet,
    };
  }
}

export const emailParser = new EmailParserService();