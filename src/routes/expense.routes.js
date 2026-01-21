import { Router } from "express";
import { verifyJWT } from "../middlewares/auth.middleware.js";
import {
  getExpenses,
  addExpense,
  deleteExpense,
} from "../controllers/expense.controller.js";

const router = Router();

router.use(verifyJWT);

router.route("/").get(getExpenses).post(addExpense);
router.route("/:expenseId").delete(deleteExpense);

export default router;
