
import QueryBuilder from '../../builder/QueryBuilder'
import { HttpError } from '../../errors/HttpError'
import { Product } from '../product/product.model'
import { User } from '../user/user.model'
import { TOrder } from './order.interface'
import { Order } from './order.model'
import { orderUtils } from './order.utils'


type TOrderResponse = {
  createdOrder: TOrder
  // checkout_url: string
  payment: any
}

const createOrder = async (
  payload: TOrder,
  userEmail: string,
  client_ip: string,
): Promise<TOrderResponse> => {
  // Check if user exists
  const user = await User.isUserExistsByCustomEmail(userEmail)
  if (!user) throw new HttpError(404, 'User not found')
  if (user.status === 'blocked') {
    throw new HttpError(
      403,
      'Your account is banned. You cannot perform this action.',
   )
  }

  //  Validate payload
  if (!payload.products || payload.products.length === 0) {
    throw new HttpError(400, 'At least one product is required.')
  }

  // Fetch products from DB
  const productIds = payload.products.map((p) => p.productId)
  const productsFromDB = await Product.find({ _id: { $in: productIds } })

  if (productsFromDB.length !== payload.products.length) {
    throw new HttpError(404, 'One or more products not found.')
  }

  
  const productMap = new Map<string, (typeof productsFromDB)[0]>()
  productsFromDB.forEach((product) => {
    productMap.set(product._id.toString(), product)
  })

  let totalAmount = 0

  //  Validate stock and calculate total
  for (const item of payload.products) {
    const product = productMap.get(item.productId.toString())

    if (!product) {
      throw new HttpError(404, `Product with ID ${item.productId} not found.`)
    }

    if (product.quantity <= 0) {
      throw new HttpError(400, `Product "${product.name}" is out of stock.`)
    }

    if (item.quantity > product.quantity) {
      throw new HttpError(
        400,
        `Only ${product.quantity} units of "${product.name}" are available.`,
      )
    }

    totalAmount += product.price * item.quantity
  }

  // Prepare order data
  payload.totalAmount = totalAmount
  payload.userId = user._id

  try {
    //  Create order
    // await OrderValidationSchema.parseAsync({ body: req.body }); 
    const createdOrder = await Order.create(payload)

    // update product quantities
    const bulkUpdates = payload.products.map((item) => ({
      updateOne: {
        filter: { _id: item.productId },
        update: { $inc: { quantity: -item.quantity } },
      },
    }))

    await Product.bulkWrite(bulkUpdates)

    // Payment integration
    const shurjopayPayload = {
      amount: totalAmount,
      order_id: createdOrder._id,
      currency: 'BDT',
      customer_name: user.name,
      customer_address: user.address,
      customer_email: user.email,
      customer_phone: user.phone,
      customer_city: user.city,
      client_ip,
    }

    const payment = await orderUtils.makePaymentAsync(shurjopayPayload)

    if (payment?.transactionStatus) {
      await Order.updateOne(
        { _id: createdOrder._id },
        {
          $set: {
            transaction: {
              id: payment.sp_order_id,
              transactionStatus: payment.transactionStatus,
            },
          },
        },
      )
    }
    
    // console.log('Payment Response:', payment);  
    // console.log(payment.checkout_url)
    
    return {
      createdOrder,
      // checkout_url: payment?.checkout_url || '',
      payment,
    }
  } catch (error) {
    console.error('Order creation error:', error)
    throw new HttpError(500, 'Failed to initiate order.')
  }
}

const VALID_ORDER_STATUSES = [
  'Pending',
  'Paid',
  'Shipped',
  'Completed',
  'Cancelled',
]

const getAllOrders = async (query: Record<string, unknown>) => {
  const orderQuery = new QueryBuilder(
    Order.find().populate('userId').populate('products.productId'),
    query,
  )
    .filter()
    .sort()
    .paginate()

  const meta = await orderQuery.countTotal()
  const result = await orderQuery.modelQuery

  if (!result?.length) {
    throw new HttpError(404, 'No orders found in the database')
  }

  return { meta, result }
}

const getOrderById = async (id: string) => {
  const order = await Order.findById(id)
    .populate('userId')
    .populate('products.productId')

  if (!order) {
    throw new HttpError(404, 'No order found with the provided ID')
  }

  return order
}

const getOrderHistoryBySpecificUser = async (userEmail: string) => {
  const user = await User.isUserExistsByCustomEmail(userEmail)

  if (!user) {
    throw new HttpError(404, 'User not found')
  }

  const orders = await Order.find({ userId: user.id })
    .populate('userId', '_id name identifier role')
    .populate('products.productId')
    

  if (!orders?.length) {
    throw new HttpError(404, 'No order history found for this user')
  }

  return orders
}

const updateOrderStatusById = async (id: string, status: string) => {
  if (!VALID_ORDER_STATUSES.includes(status)) {
    throw new HttpError(400, `Invalid status: ${status}`)
  }

  const updatedOrder = await Order.findByIdAndUpdate(
    id,
    { status },
    { new: true, runValidators: true },
  )

  if (!updatedOrder) {
    throw new HttpError(404, 'No order found with the provided ID')
  }

  return updatedOrder
}

const verifyPayment = async (order_id: string) => {
  const verifiedPayment = await orderUtils.verifyPaymentAsync(order_id)

  if (verifiedPayment.length) {
    await Order.findOneAndUpdate(
      {
        'transaction.id': order_id,
      },
      {
        'transaction.bank_status': verifiedPayment[0].bank_status,
        'transaction.sp_code': verifiedPayment[0].sp_code,
        'transaction.sp_message': verifiedPayment[0].sp_message,
        'transaction.transactionStatus': verifiedPayment[0].transaction_status,
        'transaction.method': verifiedPayment[0].method,
        'transaction.date_time': verifiedPayment[0].date_time,
        status:
          verifiedPayment[0].bank_status == 'Success'
            ? 'Paid'
            : verifiedPayment[0].bank_status == 'Failed'
              ? 'Pending'
              : verifiedPayment[0].bank_status == 'Cancel'
                ? 'Cancelled'
                : '',
      },
    )
  }

  return verifiedPayment
}

export const OrderServices = {
  createOrder,
  getAllOrders,
  getOrderById,
  getOrderHistoryBySpecificUser,
  updateOrderStatusById,
  verifyPayment,
}
