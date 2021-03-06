const express = require('express');
const { MongoClient } = require('mongodb');
const cors = require("cors");
const ObjectId = require("mongodb").ObjectId;
require('dotenv').config()

const bodyParser = require('body-parser');
var admin = require("firebase-admin");

var serviceAccount = require('./ema-john-simple-auth-b0d08-firebase-adminsdk-8qorz-2571bdb289.json');

admin.initializeApp({
    credential: admin.credential.cert(serviceAccount)
});



const port = process.env.PORT || 5000;
const app = express();

// middleware 
app.use(cors());
app.use(express.json());
app.use(bodyParser.json());

const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.jyrw6.mongodb.net/myFirstDatabase?retryWrites=true&w=majority`;

const client = new MongoClient(uri, { useNewUrlParser: true, useUnifiedTopology: true });

async function verifyToken(req,res,next){
    if (req.headers?.authorization?.startsWith("Bearer ")) {   
        const idToken = req.headers.authorization.split("Bearer ")[1];   
        
        try {
            const decoderUser = await admin.auth().verifyIdToken(idToken);
            req.decoderUserEmail = decoderUser.email;
        } catch (error) {
            
        }
    }
    next();
}

async function run() {
    try {
        await client.connect();
        console.log("database connected");
        const database = client.db("online_shop");
        const productsCollection = database.collection("products");
        const ordersCollection = database.collection("orders");
        
        // get all products API
        app.get("/products",async (req,res)=>{
            const cursor = productsCollection.find({});
            const page = req.query.page;
            const size = parseInt(req.query.size);
            const count = await cursor.count();
            let products;
            if (page) {
                products = await cursor.skip(page*size).limit(10).toArray();
            }
            else{
                products = await cursor.toArray();
            }
            res.send(
                {
                    count, 
                    products
                }
                );
        }) 

        // use post to get data by keys
        app.get('/products/byKeys/:key', async (req,res)=>{
            const keys = req.params.key;
            const newKeys = keys.split(',');
            const query = {key: { $in : newKeys }};
            const products = await productsCollection.find(query).toArray();
            res.json(products);
            // res.json("hit the projects");
        });

        // GET API for find multiple data.
        app.get("/orders", verifyToken, async (req,res)=>{
            const email = req.query.Email;
            console.log(email);
            if (req.decoderUserEmail === email) {
                const  query = {email :email};
                const cursor =  ordersCollection.find(query);
                const orders = await cursor.toArray();
                res.send(orders);
            }
            else{
                res.status(401).json({message:"User not authorized"});
            }
            
        });

        // Add Orders API
        app.post('/orders', async (req, res) => {
            const order = req.body;
            order.createdAt = new Date();
            const result = await ordersCollection.insertOne(order);
            res.json(result);
        });
        }
    finally {
    // await client.close();
    }
    }

    run().catch(console.dir);

app.get('/', (req, res) => {
    res.send('ema john server is started!');
})

app.listen(port, () => {
    console.log(`app listening at http://localhost:${port}`);
})
