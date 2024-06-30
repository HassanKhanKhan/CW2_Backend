// Import necessary modules
const express = require('express');
const bodyParser = require('body-parser');
const { MongoClient, ObjectId } = require('mongodb');
const path = require('path');

// Initialize Express app
const app = express();
const port = process.env.PORT || 3000;

app.use((req, res, next) => {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader("Access-Control-Allow-Credentials", "true");
    res.setHeader("Access-Control-Allow-Methods", "GET,HEAD,OPTIONS,POST,PUT");
    res.setHeader("Access-Control-Allow-Headers", "Access-Control-Allow-Headers, Origin,Accept, X-Requested-With, Content-Type, Access-Control-Request-Method, Access-Control-Request-Headers")

    next();
})

// Serve static files from the "public" directory
app.use(express.static(path.join(__dirname, 'public')));
app.use(bodyParser.json());

// MongoDB connection URI
const mongoURI = 'mongodb+srv://hassankhan:3Hfkhan800774256@cluster0.txjv8ql.mongodb.net/';

// MongoDB collections
let ordersCollection;
let lessonsCollection;


// Connect to MongoDB
async function connectToMongo() {
    const client = new MongoClient(mongoURI, { useNewUrlParser: true, useUnifiedTopology: true });
    try {
        await client.connect();
        console.log('Connected to MongoDB');
        
        const db = client.db('MongoCLoud');
        ordersCollection = db.collection('orders');
        lessonsCollection = db.collection('lessons');

        // Start the server
        app.listen(port, () => {
            console.log(`Server is running on port ${port}`);
        });
    } catch (error) {
        console.error('Error connecting to MongoDB:', error);
    }
}

// Middleware to log requests
app.use((req, res, next) => {
    console.log(`${req.method} ${req.url}`);
    next();
});

// Call the function to connect to MongoDB
connectToMongo();

// Define GET route to fetch all lessons
app.get('/lessons', (req, res) => {
    lessonsCollection.find({}).toArray()
        .then(lessons => {
            res.status(200).json(lessons);
        })
        .catch(err => {
            console.error('Error fetching lessons:', err);
            res.status(500).json({ error: 'An error occurred while fetching lessons' });
        });
});

// Define GET route to fetch a specific lesson by ID
app.get('/lessons/:id', (req, res) => {
    const lessonId = req.params.id;
    try {
        const objectId = new ObjectId(lessonId);
        lessonsCollection.findOne({ _id: objectId })
            .then(lesson => {
                if (!lesson) {
                    return res.status(404).json({ error: 'Lesson not found' });
                }
                res.status(200).json(lesson);
            })
            .catch(err => {
                console.error('Error fetching lesson:', err);
                res.status(500).json({ error: 'An error occurred while fetching the lesson' });
            });
    } catch (error) {
        console.error('Invalid lesson ID:', error);
        res.status(400).json({ error: 'Invalid lesson ID' });
    }
});

// Define POST route to place new orders
app.post('/new-orders', (req, res) => {
    const orderData = req.body; // Get order data from request body
    
    // Validate that orderData is not null or undefined
    if (!orderData) {
        return res.status(400).json({ error: 'Order data is missing or invalid' });
    }

    // Validate that orderData contains lessonIds property
    if (!orderData.lessonIds || !Array.isArray(orderData.lessonIds)) {
        return res.status(400).json({ error: 'Lesson IDs are missing or invalid' });
    }

    ordersCollection.insertOne(orderData)
        .then(result => {
            console.log('Order placed:', result.insertedId);
            // Call function to update lesson inventory
            updateLessonInventory(orderData.lessonIds);
            res.status(201).json({ message: 'Order placed successfully' });
        })
        .catch(err => {
            console.error('Error placing order:', err);
            res.status(500).json({ error: 'An error occurred while placing the order' });
        });
});

// Define GET route to fetch all orders
app.get('/orders', (req, res) => {
    ordersCollection.find({}).toArray()
        .then(orders => {
            res.status(200).json(orders);
        })
        .catch(err => {
            console.error('Error fetching orders:', err);
            res.status(500).json({ error: 'An error occurred while fetching orders' });
        });
});




// Define PUT route to update available lesson spaces
// im not sure what to put for path 
app.put('/lessons/:id/update-space', (req, res) => {
    const lessonId = req.params.id;
    console.log(req.body);
    const newSpace = req.body.availableInventory;

    lessonsCollection.updateOne({ _id: new ObjectId(lessonId) }, { $set: { availableInventory: newSpace } })
        .then(result => {
            res.status(200).json({ message: 'Lesson space updated successfully' });
        })
        .catch(err => {
            console.error('Error updating lesson space:', err);
            res.status(500).json({ error: 'An error occurred while updating lesson space' });
        });
});

// Function to update lesson inventory
function updateLessonInventory(lessonIds) {
    lessonIds.forEach(lessonId => {
        const objectId = new ObjectId(lessonId); // Convert lessonId to ObjectId
        const lessonUpdate = { $inc: { availableInventory: -1 } }; // Decrease available inventory by 1
        lessonsCollection.updateOne({ _id: objectId }, lessonUpdate)
            .then(result => {
                console.log(`Inventory updated for lesson with ID ${lessonId}`);
            })
            .catch(err => {
                console.error(`Error updating inventory for lesson with ID ${lessonId}:`, err);
            });
    });
}


// Handle errors
app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(500).json({ error: 'Internal Server Error' });
});
