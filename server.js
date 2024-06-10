const express = require('express');
const bodyParser = require('body-parser');
const admin = require('firebase-admin');
const path = require('path');
const passwordHash = require('password-hash');

const app = express();

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: false }));
app.use(express.static(path.join(__dirname, 'public')));

const { initializeApp, cert } = require('firebase-admin/app');
const { getFirestore, FieldValue } = require('firebase-admin/firestore');

const serviceAccount = require('./key.json');

admin.initializeApp({
    credential: admin.credential.cert(serviceAccount)
});

const db = getFirestore();

app.set('view engine', 'ejs');

app.get('/', async (req, res) => {
    const productsSnapshot = await db.collection('products').get();
    const products = productsSnapshot.docs.map(doc => doc.data());
    res.render('index', { products });
});

app.get('/login', (req, res) => {
    res.render('login');
});

app.get('/signup', (req, res) => {
    res.render('signup');
});

app.get('/addProduct', (req, res) => {
    res.render('addProduct');
});

app.post('/signupSubmit', async (req, res) => {
    const { username, email, password } = req.body;

    try {
        const usersData = await db.collection('users')
            .where('email', '==', email)
            .get();

        if (!usersData.empty) {
            return res.send('Hey! This account already exists...');
        }

        await db.collection('users').add({
            userName: username,
            email: email,
            password: passwordHash.generate(password)
        });

        res.redirect('/login');
    } catch (error) {
        console.error('Error during signup:', error);
        res.send('Something went wrong...');
    }
});

app.post('/loginSubmit', async (req, res) => {
    const { username, password } = req.body;

    try {
        const usersData = await db.collection('users')
            .where('userName', '==', username)
            .get();

        let verified = false;
        let user = null;

        usersData.forEach((doc) => {
            if (passwordHash.verify(password, doc.data().password)) {
                verified = true;
                user = doc.data();
            }
        });

        if (verified) {
            res.render('dashboard', { username: user.userName });
        } else {
            res.send('Login failed...');
        }
    } catch (error) {
        console.error('Error during login:', error);
        res.send('Something went wrong...');
    }
});

app.post('/addProductSubmit', async (req, res) => {
    const { productName, productDescription, productPrice } = req.body;

    try {
        await db.collection('products').add({
            name: productName,
            description: productDescription,
            price: productPrice
        });

        res.redirect('/');
    } catch (error) {
        console.error('Error during product addition:', error);
        res.send('Something went wrong...');
    }
});

app.listen(2000, () => {
    console.log('server is running on port 2000');
});