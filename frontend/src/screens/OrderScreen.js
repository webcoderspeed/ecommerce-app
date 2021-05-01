import React, {useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import axios from 'axios'
import { Row, Col, ListGroup, Image, Card, Button } from 'react-bootstrap'
import { useDispatch, useSelector } from 'react-redux'
import Message from '../components/Message'
import Loader from '../components/Loader'
import StripeCheckout from 'react-stripe-checkout';
import emailjs from 'emailjs-com';
import {
  getOrderDetails,
  payOrder,
  deliverOrder,
} from '../actions/orderActions'
import {
  ORDER_PAY_RESET,
  ORDER_DELIVER_RESET,
} from '../constants/orderConstants'

const OrderScreen = ({ match, history }) => {
  const orderId = match.params.id


  const dispatch = useDispatch()

  const orderDetails = useSelector((state) => state.orderDetails)
  const { order, loading, error } = orderDetails

  const orderPay = useSelector((state) => state.orderPay)
  const { success: successPay } = orderPay

  const orderDeliver = useSelector((state) => state.orderDeliver)
  const { loading: loadingDeliver, success: successDeliver } = orderDeliver

  const userLogin = useSelector((state) => state.userLogin)
  const { userInfo } = userLogin

  if (!loading) {
    //   Calculate prices
    const addDecimals = (num) => {
      return (Math.round(num * 100) / 100).toFixed(2)
    }

    order.itemsPrice = addDecimals(
      order.orderItems.reduce((acc, item) => acc + item.price * item.qty, 0)
    )
  }


  // Email Js Integration
  const [EMAIL_JS_SERVICE_ID, SET_EMAIL_JS_SERVICE_ID] = useState('');
  const [EMAIL_JS_TEMPLATE_ID, SET_EMAIL_JS_TEMPLATE_ID] = useState('');
  const [EMAIL_JS_USER_ID, SET_EMAIL_JS_USER_ID] = useState('');

  const emailJS = async () => {
    const {data : EMAIL_JS_SERVICE} = await axios.get('/api/config/emailjsservice')
    const {data : EMAIL_JS_TEMPLATE} = await axios.get('/api/config/emailjstemplate')
    const {data : EMAIL_JS_USER} = await axios.get('/api/config/emailjsuser')

    SET_EMAIL_JS_SERVICE_ID(EMAIL_JS_SERVICE)
    SET_EMAIL_JS_TEMPLATE_ID(EMAIL_JS_TEMPLATE)
    SET_EMAIL_JS_USER_ID(EMAIL_JS_USER)    
  }

  console.log(order)

  // Stripe Integration
   const onToken = (token) => {
     console.log(token)
      axios.post('/api/config/secret',{
        token,
        amount: Math.floor(order.totalPrice)*100
      }).then(res => {
    console.log(res)
        if(res.data.status==='success'){
          const paymentResult = {
            id: userInfo._id,
            status:res.data.status,
            email_address: token.email,
          }
          console.log(paymentResult)
          dispatch(payOrder(orderId, paymentResult))

          // Sending Email
          const data = {
            from_name: 'kashyapnipun.1999@gmail.com',
            to_email:token.email,
            message:"Thanks for purchase :)",
            to_name:token.name,
            order_id:order._id,
            order_item_name: order.orderItems[0].name,
            order_item_price: order.orderItems[0].price,
            order_item_product: order.orderItems[0].product,
            order_item_quantity: order.orderItems[0].qty,
            shipping_address: order.shippingAddress.address,
            shipping_price: order.shippingPrice,
            tax_price: order.taxPrice,
            total_price: order.totalPrice,
            phone:order.shippingAddress.phone
          }

        emailjs.send(EMAIL_JS_SERVICE_ID, EMAIL_JS_TEMPLATE_ID, data, EMAIL_JS_USER_ID)
        .then(response => {
          console.log(response.status, response.text);
        })
        .catch(err => console.log(err))
        }
      })
      
  }

  const [stripeKey, setStripeKey] = useState('');

  useEffect(() => {
    if (!userInfo) {
      history.push('/login')
    }
    const fetchStripe = async () => {
      const { data: key } = await axios.get('/api/config/stripe')
      setStripeKey(key) 
    } 

    if (!order || successPay || successDeliver || order._id !== orderId) {
      dispatch({ type: ORDER_PAY_RESET })
      dispatch({ type: ORDER_DELIVER_RESET })
      dispatch(getOrderDetails(orderId))
    }  else {
      fetchStripe()
      emailJS()
    }
    

  }, [dispatch, orderId, successPay, successDeliver, order])


  const deliverHandler = () => {
    dispatch(deliverOrder(order))
  }

  return loading ? (
    <Loader />
  ) : error ? (
    <Message variant='danger'>{error}</Message>
  ) : (
    <>
      <h1>Order {order._id}</h1>
      <Row>
        <Col md={8}>
          <ListGroup variant='flush'>
            <ListGroup.Item>
              <h2>Shipping</h2>
              <p>
                <strong>Name: </strong> {order.user.name}
              </p>
              <p>
                <strong>Email: </strong>{' '}
                <a href={`mailto:${order.user.email}`}>{order.user.email}</a>
              </p>
              <p>
                <strong>Address:</strong>
                {order.shippingAddress.address}, {order.shippingAddress.city}{' '}
                {order.shippingAddress.postalCode},{' '}
                {order.shippingAddress.country}
              </p>
              <p>
                <strong>Phone:</strong>
                {order.shippingAddress.phone}
              </p>
              {order.isDelivered ? (
                <Message variant='success'>
                  Delivered on {order.deliveredAt}
                </Message>
              ) : (
                <Message variant='danger'>Not Delivered</Message>
              )}
            </ListGroup.Item>

            <ListGroup.Item>
              <h2>Payment Method</h2>
              <p>
                <strong>Method: </strong>
                {order.paymentMethod}
              </p>
              {order.isPaid ? (
                <Message variant='success'>Paid on {order.paidAt}</Message>
              ) : (
                <Message variant='danger'>Not Paid</Message>
              )}
            </ListGroup.Item>

            <ListGroup.Item>
              <h2>Order Items</h2>
              {order.orderItems.length === 0 ? (
                <Message>Order is empty</Message>
              ) : (
                <ListGroup variant='flush'>
                  {order.orderItems.map((item, index) => (
                    <ListGroup.Item key={index}>
                      <Row>
                        <Col md={1}>
                          <Image
                            src={item.image}
                            alt={item.name}
                            fluid
                            rounded
                          />
                        </Col>
                        <Col>
                          <Link to={`/product/${item.product}`}>
                            {item.name}
                          </Link>
                        </Col>
                        <Col md={4}>
                          {item.qty} x Rs. {item.price} = Rs. {item.qty * item.price}
                        </Col>
                      </Row>
                    </ListGroup.Item>
                  ))}
                </ListGroup>
              )}
            </ListGroup.Item>
          </ListGroup>
        </Col>
        <Col md={4}>
          <Card>
            <ListGroup variant='flush'>
              <ListGroup.Item>
                <h2>Order Summary</h2>
              </ListGroup.Item>
              <ListGroup.Item>
                <Row>
                  <Col>Items</Col>
                  <Col>Rs. {order.itemsPrice}</Col>
                </Row>
              </ListGroup.Item>
              <ListGroup.Item>
                <Row>
                  <Col>Shipping</Col>
                  <Col>Rs. {order.shippingPrice}</Col>
                </Row>
              </ListGroup.Item>
              <ListGroup.Item>
                <Row>
                  <Col>Tax</Col>
                  <Col>Rs. {order.taxPrice}</Col>
                </Row>
              </ListGroup.Item>
              <ListGroup.Item>
                <Row>
                  <Col>Total</Col>
                  <Col>Rs .{order.totalPrice}</Col>
                </Row>
              </ListGroup.Item>
              {!order.isPaid && (
                <ListGroup.Item>
                    <StripeCheckout
                    token={onToken}
                    stripeKey={stripeKey}
                    amount={Math.floor(order.totalPrice)*100}
                    shippingAddress={true}
                    email={userInfo.email}
                    currency='INR'
                    zipCode={false}
                    billingAddress={true}
                  >
                     <button className="btn btn-primary">
                      Pay with credit card
                       </button>
                    </StripeCheckout>
                </ListGroup.Item>
              )}
              {loadingDeliver && <Loader />}
              {userInfo &&
                userInfo.isAdmin &&
                order.isPaid &&
                !order.isDelivered && (
                  <ListGroup.Item>
                    <Button
                      type='button'
                      className='btn btn-block'
                      onClick={deliverHandler}
                    >
                      Mark As Delivered
                    </Button>
                  </ListGroup.Item>
                )}
            </ListGroup>
          </Card>
        </Col>
      </Row>
    </>
  )
}

export default OrderScreen
