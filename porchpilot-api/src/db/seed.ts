import { query } from './pool.js';
import { hash } from 'crypto';

/**
 * Optional seed script for local development.
 * Creates test user, connected inbox, and sample orders/shipments.
 */
async function seed() {
  console.log('Seeding database...');

  // Create a test user
  const testEmail = 'demo@porchpilot.app';
  const { rows: users } = await query(
    `INSERT INTO users (email, name, status)
     VALUES ($1, $2, 'active')
     ON CONFLICT (email) DO UPDATE SET name = EXCLUDED.name
     RETURNING id`,
    [testEmail, 'Demo User'],
  );
  const userId = users[0].id;
  console.log(`  ✓ Test user: ${userId}`);

  // Create connected inbox
  const { rows: inboxes } = await query(
    `INSERT INTO email_accounts (user_id, provider, email_address, access_token, is_active)
     VALUES ($1, 'google', 'demo@gmail.com', 'mock-token-placeholder', true)
     ON CONFLICT (user_id, provider, email_address) DO NOTHING
     RETURNING id`,
    [userId],
  );
  const inboxId = inboxes.length > 0 ? inboxes[0].id : null;
  if (inboxId) console.log(`  ✓ Connected inbox: ${inboxId}`);

  // Create sample orders
  const sampleOrders = [
    {
      retailer: 'Amazon',
      retailerOrderId: '113-1234567-8901234',
      items: [
        { name: 'Wireless Bluetooth Headphones', quantity: 1, price: 49.99 },
        { name: 'USB-C Charging Cable 6ft', quantity: 2, price: 8.99 },
      ],
      total: 67.97,
    },
    {
      retailer: 'Chewy',
      retailerOrderId: 'CHW-9876543',
      items: [
        { name: 'Purina Pro Plan Dog Food 30lb', quantity: 1, price: 54.99 },
        { name: 'KONG Classic Dog Toy', quantity: 2, price: 14.99 },
      ],
      total: 84.97,
    },
    {
      retailer: 'Walgreens',
      retailerOrderId: 'WAG-5551212',
      items: [
        { name: 'Vitamin D3 2000 IU (200 ct)', quantity: 1, price: 12.99 },
        { name: 'DayQuil Severe Cold & Flu', quantity: 2, price: 11.49 },
      ],
      total: 35.97,
    },
  ];

  for (const order of sampleOrders) {
    const orderDate = new Date();
    orderDate.setDate(orderDate.getDate() - Math.floor(Math.random() * 5));

    const { rows: orders } = await query(
      `INSERT INTO orders (user_id, email_account_id, retailer, retailer_order_id,
         order_date, status, total_amount, currency)
       VALUES ($1, $2, $3, $4, $5, $6, $7, 'USD')
       RETURNING id`,
      [
        userId,
        inboxId,
        order.retailer,
        order.retailerOrderId,
        orderDate.toISOString(),
        'shipped',
        order.total,
      ],
    );
    const orderId = orders[0].id;
    console.log(`  ✓ Order: ${order.retailer} (${orderId})`);

    // Insert items
    for (const item of order.items) {
      await query(
        `INSERT INTO order_items (order_id, name, quantity, price, currency)
         VALUES ($1, $2, $3, $4, 'USD')`,
        [orderId, item.name, item.quantity, item.price],
      );
    }

    // Create a shipment with tracking
    const trackingHash = hash('sha256', `${order.retailer}-${Date.now()}`).substring(0, 18).toUpperCase();
    const deliveryDate = new Date();
    deliveryDate.setDate(deliveryDate.getDate() + 2);

    const { rows: shipments } = await query(
      `INSERT INTO shipments (order_id, tracking_number, carrier,
         estimated_delivery_date, status, is_delivered)
       VALUES ($1, $2, $3, $4, 'in_transit', false)
       RETURNING id`,
      [orderId, `1Z${trackingHash}`, 'UPS', deliveryDate.toISOString().split('T')[0]],
    );
    const shipmentId = shipments[0].id;

    // Add a tracking event
    await query(
      `INSERT INTO tracking_events (shipment_id, status, location, description, occurred_at)
       VALUES ($1, 'in_transit', 'Memphis, TN', 'Package in transit to destination', $2)`,
      [shipmentId, orderDate.toISOString()],
    );
  }

  console.log('Seed complete!');
}

seed().catch(console.error);