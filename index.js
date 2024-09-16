const express = require('express');
const fetch = require('node-fetch');
const { MongoClient, ServerApiVersion } = require('mongodb');
const path = require('path');

const app = express();
const port = 3000;

app.set('view engine', 'ejs');
app.use(express.static('public'));

const uri = "mongodb+srv://sp01csit:soumen2486@cluster0.qovwx.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0";
const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  }
});

let db;

async function connectToDatabase() {
  try {
    await client.connect();
    db = client.db("hodlinfo_db");
    console.log("Successfully connected to MongoDB Atlas!");
  } catch (error) {
    console.error("Error connecting to MongoDB Atlas:", error);
    process.exit(1);
  }
}

async function fetchAndStoreData() {
  try {
    const response = await fetch('https://api.wazirx.com/api/v2/tickers');
    const data = await response.json();
    const top10 = Object.values(data).slice(0, 10).map(ticker => ({
      name: ticker.name,
      last: parseFloat(ticker.last),
      buy: parseFloat(ticker.buy),
      sell: parseFloat(ticker.sell),
      volume: parseFloat(ticker.volume),
      base_unit: ticker.base_unit
    }));
    const collection = db.collection('tickers');
    await collection.deleteMany({});
    await collection.insertMany(top10);
    console.log('Data updated successfully');
  } catch (error) {
    console.error('Error fetching and storing data:', error);
  }
}

app.get('/', async (req, res) => {
  try {
    const collection = db.collection('tickers');
    const tickers = await collection.find({}).toArray();
    res.render('index', { tickers });
  } catch (error) {
    console.error('Error fetching data from database:', error);
    res.status(500).send('Internal Server Error');
  }
});

async function startServer() {
  await connectToDatabase();
  await fetchAndStoreData();
  
  app.listen(port, () => {
    console.log(`Server running at http://localhost:${port}`);
  });
  
  // Fetch and store data every 5 minutes
  setInterval(fetchAndStoreData, 5 * 60 * 1000);
}

process.on('SIGINT', async () => {
  await client.close();
  console.log('MongoDB connection closed');
  process.exit(0);
});

startServer().catch(console.dir);