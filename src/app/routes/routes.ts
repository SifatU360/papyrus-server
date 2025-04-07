import { Router } from "express";
import {UserRoutes} from "../modules/user/user.route";
import {ProductRoutes} from "../modules/product/product.route";
import {OrderRoutes} from "../modules/order/order.route";

const router = Router();

router.use("/user", UserRoutes);
router.use("/product", ProductRoutes);
router.use("/order", OrderRoutes);

export default router;