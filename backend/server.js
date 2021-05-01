import path from 'path'
import express from 'express'
import dotenv from 'dotenv'
import colors from 'colors'
import morgan from 'morgan'
import { notFound, errorHandler } from './middleware/errorMiddleware.js'
import connectDB from './config/db.js';
import  Stripe from "stripe"
import productRoutes from './routes/productRoutes.js'
import userRoutes from './routes/userRoutes.js'
import orderRoutes from './routes/orderRoutes.js'
import uploadRoutes from './routes/uploadRoutes.js'

dotenv.config()

connectDB()

const app = express()

if (process.env.NODE_ENV === 'development') {
  app.use(morgan('dev'))
}

app.use(express.json())

app.use('/api/products', productRoutes)
app.use('/api/users', userRoutes)
app.use('/api/orders', orderRoutes)
app.use('/api/upload', uploadRoutes)

// Stripe Integration
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY)

app.get('/api/config/stripe', async (req, res) =>
  res.send(process.env.STRIPE_PUBLISHABLE_KEY)
)

app.post('/api/config/secret', async (req, res) => {
  let error;
  let status = 'failed';
  try {
    const {
      amount,
      token,
    } = req.body;


    // TODO: Lookup existing customer or create a new customer.
    // TODO: Save relevant billing and shipping address information.
    const customer = await stripe.customers.create({
      email: token.email,
      source: token.id,
      metadata: {
        userId: token.id
      },
    });
      const charge = await stripe.charges.create(
        {
          amount,
          currency: 'inr',
          customer: customer.id,
        }
      );
      console.log('charge:',JSON.stringify(charge));
      status = 'success';
    } catch (err) {
      console.error(err);
      error = err;
    }
    
  res.status(200).json({error, status });
})

// Email JS Data
app.get('/api/config/emailjsservice', async (req, res) =>
  res.send(process.env.EMAIL_JS_SERVICE_ID)
)
app.get('/api/config/emailjstemplate', async (req, res) =>
  res.send(process.env.EMAIL_JS_TEMPLATE_ID)
)
app.get('/api/config/emailjsuser', async (req, res) =>
  res.send(process.env.USER_ID)
)

const __dirname = path.resolve()
app.use('/uploads', express.static(path.join(__dirname, '/uploads')))

if (process.env.NODE_ENV === 'production') {
  app.use(express.static(path.join(__dirname, '/frontend/build')))

  app.get('*', (req, res) =>
    res.sendFile(path.resolve(__dirname, 'frontend', 'build', 'index.html'))
  )
} else {
  app.get('/', (req, res) => {
    res.send('API is running....')
  })
}


app.use(notFound)
app.use(errorHandler)

const PORT = process.env.PORT || 5000

app.listen(
  PORT,
  console.log(
    `Server running in ${process.env.NODE_ENV} mode on port ${PORT}`.yellow.bold
  )
)
