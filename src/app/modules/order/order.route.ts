import express from 'express';
import { OrderControllers } from './order.controller';
import {  validateRequest } from '../../middlewares/validateRequest';
import { OrderValidationSchema } from './order.validation';
import  auth  from '../../middlewares/auth';
import { USER_ROLE } from '../user/user.constant';

const router = express.Router();


router.get("/verify", auth(USER_ROLE.USER), OrderControllers.verifyPayment);

router.post(
  '/',
  auth(USER_ROLE.USER, USER_ROLE.ADMIN),
  validateRequest(OrderValidationSchema.createOrderValidationSchema),
  OrderControllers.createOrderController,
);

router.get(
  '/byUser',
  auth(USER_ROLE.USER, USER_ROLE.ADMIN),
  OrderControllers.getOrderHistoryBySpecificUserController,
);

router.get('/', auth(USER_ROLE.ADMIN), OrderControllers.getAllOrdersController);

router.get('/:id', auth(USER_ROLE.ADMIN), OrderControllers.getOrderController);

router.patch(
  '/:id/status',
  auth(USER_ROLE.ADMIN),
  OrderControllers.updateOrderStatusController,
);

export const OrderRoutes = router;