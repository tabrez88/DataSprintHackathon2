const express = require('express');
const mysql = require('mysql');
const bodyParser = require('body-parser');
const cors = require('cors');

const app = express();
const port = 3000;

// --- MySQL Connection Configuration ---
const db = mysql.createConnection({
    host: 'localhost',      
    user: 'root',           
    password: 'tabrez2007', 
    database: 'tripnest_db', 
    insecureAuth : true 
});

db.connect((err) => {
    if (err) {
        console.error('❌ Error connecting to MySQL:', err.message); 
        return;
    }
    console.log('✅ Connected to MySQL Database: tripnest_db!');
});

// --- Middleware ---
app.use(cors()); 
app.use(bodyParser.json()); 

// Utility function to generate a simple booking reference
const generateReference = (serviceType) => {
    const prefix = serviceType.toUpperCase().substring(0, 3);
    const random = Math.random().toString(36).substring(2, 7).toUpperCase();
    return `${prefix}-${new Date().getTime().toString().slice(-4)}-${random}`;
};


// ----------------------------------------------------------------------
// --- 1. GENERALIZED BOOKING FUNCTION ---
// ----------------------------------------------------------------------

const handleBooking = (serviceType) => (req, res) => {
    // Data structure from dash.html: { userId, from, to, date, price, details }
    const { userId, from, to, date, price, details } = req.body;
    
    if (!userId || !date || !price || !details) {
        return res.status(400).send({ message: `Missing required data for ${serviceType} booking.` });
    }
    
    const bookingRef = generateReference(serviceType);
    const serviceDetailsJSON = JSON.stringify(details); 

    const query = `
        INSERT INTO booking 
        (user_name, service_type, from_location, to_location, travel_date, price, booking_reference, service_details, booking_status) 
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'Confirmed')
    `;
    
    const values = [
        userId, 
        serviceType, 
        from || null, 
        to || null, 
        date, 
        price, 
        bookingRef, 
        serviceDetailsJSON, 
    ];

    db.query(query, values, (err, result) => {
        if (err) {
            console.error(`Error inserting ${serviceType} data:`, err);
            return res.status(500).send({ message: `Database insertion failed for ${serviceType}.`, error: err.code });
        }
        
        res.status(201).send({
            message: `${serviceType} booking successful.`, 
            bookingId: result.insertId,
            bookingReference: bookingRef
        });
    });
};


// ----------------------------------------------------------------------
// --- 2. API Endpoints (ROUTES) ---
// ----------------------------------------------------------------------

app.post('/api/book-flight', handleBooking('flight'));
app.post('/api/book-hotel', handleBooking('hotel'));
app.post('/api/book-bus', handleBooking('bus'));
app.post('/api/book-train', handleBooking('train'));
app.post('/api/book-cabs', handleBooking('cab')); 


// ----------------------------------------------------------------------
// --- 3. Cancel Booking (UPDATED: DELETE query used) ---
// ----------------------------------------------------------------------

app.delete('/api/cancel-booking/:bookingId', (req, res) => {
    const bookingId = req.params.bookingId; 
    if (!bookingId) {
        return res.status(400).send({ message: 'Missing booking ID for cancellation.' });
    }

    // BADLAV: DELETE query use ki gayi hai
    const query = 'DELETE FROM booking WHERE id = ?';
    
    db.query(query, [bookingId], (err, result) => {
        if (err) {
            console.error('Error deleting booking:', err);
            return res.status(500).send({ message: 'Database deletion failed.' });
        }
        // Agar affectedRows 0 hai, toh iska matlab hai ki woh record mila hi nahi
        if (result.affectedRows === 0) {
            return res.status(404).send({ message: 'Booking not found.' });
        }
        
        // SUCCESS: Record database se permanently delete ho gaya
        res.status(200).send({ 
            message: `Booking ${bookingId} successfully deleted from the database.`,
            deletedId: bookingId
        });
    });
});


// ----------------------------------------------------------------------
// --- 4. Get User Bookings ---
// ----------------------------------------------------------------------

app.get('/api/user-bookings/:userName', (req, res) => {
    const userName = req.params.userName; 
    if (!userName) {
        return res.status(400).send({ message: 'Missing user name.' });
    }
    
    // Table name 'booking' use kiya gaya
    const query = 'SELECT * FROM booking WHERE user_name = ? ORDER BY created_at DESC LIMIT 20';
    
    db.query(query, [userName], (err, results) => {
        if (err) {
            console.error('Error fetching data:', err);
            return res.status(500).send({ message: 'Database fetch failed.' });
        }
        res.status(200).json(results);
    });
});


// Start the Server
app.listen(port, () => {
    console.log(`🌍 Backend server running at http://localhost:${port}`);
    console.log(`----------------------------------------------------`);
});