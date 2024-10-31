import express from 'express';
import cors from 'cors';
import Database from 'better-sqlite3';
import nodemailer from 'nodemailer';
import cron from 'node-cron';

const app = express();
const db = new Database('mamellada.db');

app.use(cors());
app.use(express.json());

// Initialize database tables
db.exec(`
  CREATE TABLE IF NOT EXISTS contacts (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    email TEXT,
    phone TEXT,
    company TEXT,
    nextFollowUp DATE,
    notes TEXT,
    createdAt DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS product_interests (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    contactId INTEGER,
    productName TEXT NOT NULL,
    interestLevel TEXT,
    notes TEXT,
    createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (contactId) REFERENCES contacts (id)
  );

  CREATE TABLE IF NOT EXISTS follow_ups (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    contactId INTEGER,
    dueDate DATE NOT NULL,
    completed BOOLEAN DEFAULT FALSE,
    notes TEXT,
    FOREIGN KEY (contactId) REFERENCES contacts (id)
  );

  CREATE TABLE IF NOT EXISTS products (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    description TEXT,
    category TEXT
  );
`);

// Insert sample products if none exist
const products = db.prepare('SELECT COUNT(*) as count FROM products').get();
if (products.count === 0) {
  const sampleProducts = [
    { name: 'Premium Jam', description: 'Artisanal fruit jam', category: 'Preserves' },
    { name: 'Organic Honey', description: 'Pure organic honey', category: 'Natural' },
    { name: 'Fruit Spread', description: 'Low sugar fruit spread', category: 'Preserves' },
    { name: 'Gift Basket', description: 'Assorted products gift basket', category: 'Gifts' },
    { name: 'Seasonal Box', description: 'Seasonal product collection', category: 'Special' }
  ];
  
  const insertProduct = db.prepare('INSERT INTO products (name, description, category) VALUES (?, ?, ?)');
  sampleProducts.forEach(product => {
    insertProduct.run(product.name, product.description, product.category);
  });
}

// Insert sample contacts if none exist
const contacts = db.prepare('SELECT COUNT(*) as count FROM contacts').get();
if (contacts.count === 0) {
  const sampleContacts = [
    {
      name: 'Sarah Johnson',
      email: 'sarah.j@example.com',
      phone: '555-0123',
      company: 'Gourmet Foods Inc.',
      nextFollowUp: '2024-01-15',
      notes: 'Interested in wholesale Premium Jam orders'
    },
    {
      name: 'Michael Chen',
      email: 'mchen@example.com',
      phone: '555-0124',
      company: 'Natural Markets',
      nextFollowUp: '2024-01-10',
      notes: 'Looking for organic product line'
    },
    {
      name: 'Emma Rodriguez',
      email: 'emma.r@example.com',
      phone: '555-0125',
      company: 'Sweet Delights Bakery',
      nextFollowUp: '2024-01-20',
      notes: 'Regular buyer of Fruit Spread'
    },
    {
      name: 'David Kim',
      email: 'david.k@example.com',
      phone: '555-0126',
      company: 'Gift Box Co.',
      nextFollowUp: '2024-01-12',
      notes: 'Interested in custom gift baskets'
    },
    {
      name: 'Lisa Thompson',
      email: 'lisa.t@example.com',
      phone: '555-0127',
      company: 'Wellness Store',
      nextFollowUp: '2024-01-18',
      notes: 'Regular orders of Organic Honey'
    }
  ];

  const insertContact = db.prepare(`
    INSERT INTO contacts (name, email, phone, company, nextFollowUp, notes)
    VALUES (?, ?, ?, ?, ?, ?)
  `);

  const insertInterest = db.prepare(`
    INSERT INTO product_interests (contactId, productName, interestLevel, notes)
    VALUES (?, ?, ?, ?)
  `);

  sampleContacts.forEach(contact => {
    const result = insertContact.run(
      contact.name,
      contact.email,
      contact.phone,
      contact.company,
      contact.nextFollowUp,
      contact.notes
    );
    
    // Add sample product interests
    if (contact.name === 'Sarah Johnson') {
      insertInterest.run(result.lastInsertRowid, 'Premium Jam', 'High', 'Interested in bulk orders');
    } else if (contact.name === 'Michael Chen') {
      insertInterest.run(result.lastInsertRowid, 'Organic Honey', 'Medium', 'Requesting samples');
    } else if (contact.name === 'Emma Rodriguez') {
      insertInterest.run(result.lastInsertRowid, 'Fruit Spread', 'High', 'Monthly recurring order');
    } else if (contact.name === 'David Kim') {
      insertInterest.run(result.lastInsertRowid, 'Gift Basket', 'High', 'Seasonal orders');
    } else if (contact.name === 'Lisa Thompson') {
      insertInterest.run(result.lastInsertRowid, 'Organic Honey', 'High', 'Regular customer');
      insertInterest.run(result.lastInsertRowid, 'Premium Jam', 'Medium', 'Interested in new flavors');
    }
  });
}

// Contact routes
app.get('/api/contacts', (req, res) => {
  const contacts = db.prepare('SELECT * FROM contacts ORDER BY name').all();
  res.json(contacts);
});

app.get('/api/contacts/:id', (req, res) => {
  const contact = db.prepare('SELECT * FROM contacts WHERE id = ?').get(req.params.id);
  if (contact) {
    res.json(contact);
  } else {
    res.status(404).json({ error: 'Contact not found' });
  }
});

app.post('/api/contacts', (req, res) => {
  const { name, email, phone, company, nextFollowUp, notes } = req.body;
  const stmt = db.prepare(`
    INSERT INTO contacts (name, email, phone, company, nextFollowUp, notes)
    VALUES (?, ?, ?, ?, ?, ?)
  `);
  const result = stmt.run(name, email, phone, company, nextFollowUp, notes);
  res.json({ id: result.lastInsertRowid });
});

// Product routes
app.get('/api/products', (req, res) => {
  const products = db.prepare('SELECT * FROM products ORDER BY name').all();
  res.json(products);
});

// Product interest routes
app.post('/api/interests', (req, res) => {
  const { contactId, productName, interestLevel, notes } = req.body;
  const stmt = db.prepare(`
    INSERT INTO product_interests (contactId, productName, interestLevel, notes)
    VALUES (?, ?, ?, ?)
  `);
  const result = stmt.run(contactId, productName, interestLevel, notes);
  res.json({ id: result.lastInsertRowid });
});

app.get('/api/interests/:contactId', (req, res) => {
  const interests = db.prepare('SELECT * FROM product_interests WHERE contactId = ?')
    .all(req.params.contactId);
  res.json(interests);
});

// Follow-up routes and email setup
const transporter = nodemailer.createTransport({
  host: "smtp.gmail.com",
  port: 587,
  secure: false,
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});

app.post('/api/follow-ups', (req, res) => {
  const { contactId, dueDate, notes } = req.body;
  const stmt = db.prepare(`
    INSERT INTO follow_ups (contactId, dueDate, notes)
    VALUES (?, ?, ?)
  `);
  const result = stmt.run(contactId, dueDate, notes);
  res.json({ id: result.lastInsertRowid });
});

// Resend follow-up email
app.post('/api/follow-ups/:id/resend', async (req, res) => {
  try {
    const followUp = db.prepare(`
      SELECT f.*, c.name, c.email 
      FROM follow_ups f 
      JOIN contacts c ON f.contactId = c.id 
      WHERE f.id = ?
    `).get(req.params.id);

    if (!followUp) {
      return res.status(404).json({ error: 'Follow-up not found' });
    }

    await transporter.sendMail({
      from: process.env.EMAIL_USER,
      to: process.env.ADMIN_EMAIL,
      subject: `Follow-up Reminder: ${followUp.name}`,
      text: `Don't forget to follow up with ${followUp.name} (due: ${followUp.dueDate})!\nNotes: ${followUp.notes}`,
    });

    res.json({ message: 'Follow-up email resent successfully' });
  } catch (error) {
    console.error('Email sending failed:', error);
    res.status(500).json({ error: 'Failed to send follow-up email' });
  }
});

// Daily follow-up check
cron.schedule('0 9 * * *', async () => {
  const todayFollowUps = db.prepare(`
    SELECT f.*, c.name, c.email 
    FROM follow_ups f 
    JOIN contacts c ON f.contactId = c.id 
    WHERE DATE(f.dueDate) = DATE('now') AND f.completed = FALSE
  `).all();

  for (const followUp of todayFollowUps) {
    if (followUp.email) {
      try {
        await transporter.sendMail({
          from: process.env.EMAIL_USER,
          to: process.env.ADMIN_EMAIL,
          subject: `Follow-up Reminder: ${followUp.name}`,
          text: `Don't forget to follow up with ${followUp.name} today!\nNotes: ${followUp.notes}`,
        });
      } catch (error) {
        console.error('Email sending failed:', error);
      }
    }
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});