const express = require('express');
const { MongoClient } = require('mongodb');
const ObjectId = require('mongodb').ObjectId;
const cors = require('cors');
require('dotenv').config();
const app = express();
const port = process.env.PORT || 5000;

// middleware
app.use(cors());
app.use(express.json());

const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.9dqst.mongodb.net/myFirstDatabase?retryWrites=true&w=majority`;
// console.log(uri);

const client = new MongoClient(uri, {
	useNewUrlParser: true,
	useUnifiedTopology: true,
});

async function verifyToken(req, res, next) {
	if (req.headers?.authorization?.startsWith('Bearer ')) {
		const token = req.headers.authorization.split(' ')[1];

		try {
			const decodedUser = await admin.auth().verifyIdToken(token);
			req.decodedEmail = decodedUser.email;
		} catch {}
	}
	next();
}

async function run() {
	try {
		await client.connect();
		// making database
		const database = client.db('cars');
		// collection
		const servicesCollection = database.collection('services');
		const ordersCollection = database.collection('orders');
		const usersCollection = database.collection('users');
		const reviewsCollection = database.collection('reviews');

		// get api

		app.get('/services', async (req, res) => {
			const cursor = servicesCollection.find({});
			const services = await cursor.toArray();
			res.send(services);
		});
		// get reviews
		app.get('/reviews', async (req, res) => {
			const cursor = reviewsCollection.find({});
			const reviews = await cursor.toArray();
			res.send(reviews);
		});
		// get single service
		app.get('/services/:id', async (req, res) => {
			const id = req.params.id;
			const query = { _id: ObjectId(id) };
			const service = await servicesCollection.findOne(query);
			res.json(service);
		});

		// get all orders
		app.get('/orders', async (req, res) => {
			const cursor = ordersCollection.find({});
			const orders = await cursor.toArray();

			res.send(orders);
		});

		// get user orders
		app.get('/order/:uid', async (req, res) => {
			const uid = req.params.uid;

			const query = { user_id: uid };

			const cursor = ordersCollection.find(query);
			const orders = await cursor.toArray();

			res.send(orders);
		});

		// app.get('/services', async (req, res) => {
		// 	const email = req.query.email;
		// 	const query = { email: email };
		// 	const cursor = servicesCollection.find(query);
		// 	const bookings = await cursor.toArray();
		// 	res.json(bookings);
		// });
		// Post of service
		app.post('/services', async (req, res) => {
			const service = req.body;
			console.log('hit post', service);

			const result = await servicesCollection.insertOne(service);
			console.log(result);
			res.json(result);
		});

		// post of orders
		app.post('/orders', async (req, res) => {
			const order = req.body;
			console.log(order);

			const result = await ordersCollection.insertOne(order);
			res.json(result);
		});

		// post of reviews
		app.post('/reviews', async (req, res) => {
			const review = req.body;
			console.log(review);

			const result = await reviewsCollection.insertOne(review);
			res.json(result);
		});

		// delete api
		app.delete('/order/:id', async (req, res) => {
			const id = req.params.id;
			const query = { _id: ObjectId(id) };
			const result = await ordersCollection.deleteOne(query);
			res.json(result);
		});

		app.get('/users/:email', async (req, res) => {
			const email = req.params.email;
			const query = { email: email };
			const user = await usersCollection.findOne(query);
			let isAdmin = false;
			if (user?.role === 'admin') {
				isAdmin = true;
			}
			res.json({ admin: isAdmin });
		});

		app.post('/users', async (req, res) => {
			const user = req.body;
			const result = await usersCollection.insertOne(user);
			console.log(result);
			res.json(result);
		});

		app.put('/users', async (req, res) => {
			const user = req.body;
			const filter = { email: user.email };
			const options = { upsert: true };
			const updateDoc = { $set: user };
			const result = await usersCollection.updateOne(
				filter,
				updateDoc,
				options
			);
			res.json(result);
		});

		app.put('/users/admin', verifyToken, async (req, res) => {
			const user = req.body;
			const requester = req.decodedEmail;
			if (requester) {
				const requesterAccount = await usersCollection.findOne({
					email: requester,
				});
				if (requesterAccount.role === 'admin') {
					const filter = { email: user.email };
					const updateDoc = { $set: { role: 'admin' } };
					const result = await usersCollection.updateOne(
						filter,
						updateDoc
					);
					res.json(result);
				}
			} else {
				res.status(403).json({
					message: 'you do not have access to make admin',
				});
			}
		});
	} finally {
		// await client.close();
	}
}

run().catch(console.dir);

app.get('/', (req, res) => {
	res.send('Running cars server');
});

app.listen(port, () => {
	console.log('car server', port);
});
