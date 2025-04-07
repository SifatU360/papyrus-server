import  catchAsync  from '../../utils/catchAsync'
import  sendResponse  from '../../utils/sendResponse'
import { User } from '../user/user.model'
import { OrderServices } from './order.service'
// import { Document } from 'mongoose'

const createOrderController = catchAsync(async (req, res) => {
  const orderPayload = req.body;
  const { userId } = req.body;

  if (!userId) {
    return res.status(400).json({ success: false, message: 'User ID is required' });
  }

  // Fetch the user by ID
  const user = await User.findById(userId);

  if (!user) {
    return res.status(404).json({ success: false, message: 'User not found' });
  }

  // Proceed with order creation
  const { createdOrder, checkout_url, payment } = await OrderServices.createOrder(
    orderPayload,
    user.email,
    req.ip || '::1'
  );

  return res.status(201).json({
    success: true,
    message: 'Order placed successfully.',
    data: {
      order: createdOrder,
      checkout_url,
      paymentResponse: payment,
    },
  });
});


const getAllOrdersController = catchAsync(async (req, res) => {
  const query = req.query
  const result = await OrderServices.getAllOrders(query)

  sendResponse(res, {
    success: true,
    message: 'Orders retrieved successfully',
    statusCode: 200,
    data: result.result,
  })
})

const getOrderController = catchAsync(async (req, res) => {
  const id = req.params.id
  const order = await OrderServices.getOrderById(id)

  sendResponse(res, {
    success: true,
    message: 'Order retrieved successfully',
    statusCode: 200,
    data: order,
  })
})

const getOrderHistoryBySpecificUserController = catchAsync(
  async (req, res) => {
    const userEmail = req.userId.email
    const orders = await OrderServices.getOrderHistoryBySpecificUser(userEmail)

    sendResponse(res, {
      success: true,
      message: 'Specific user wise order history are retrieved successfully',
      statusCode: 200,
      data: orders,
    })
  },
)

const updateOrderStatusController = catchAsync(async (req, res) => {
  const id = req.params.id
  const { status } = req.body
  const updatedStatus = await OrderServices.updateOrderStatusById(id, status)

  sendResponse(res, {
    success: true,
    message: 'Order status updated successfully',
    statusCode: 200,
    data: updatedStatus,
  })
})


const verifyPayment = catchAsync(async (req, res) => {
  const order = await OrderServices.verifyPayment(req.query.order_id as string);

  sendResponse(res, {
    success: true,
    message: "Order verified successfully",
    statusCode: 200,
    data: order,
  });
});
export const OrderControllers = {
  createOrderController,
  getAllOrdersController,
  getOrderController,
  getOrderHistoryBySpecificUserController,
  updateOrderStatusController,
  verifyPayment
}
