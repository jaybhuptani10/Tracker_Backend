import { Expense } from "../models/expense.model.js";
import userModel from "../models/user.model.js";
import { ApiResponse } from "../utils/apiresponse.js";
import asyncHandler from "../utils/asynchandler.js";

const getExpenses = asyncHandler(async (req, res) => {
  const { id } = req.user;

  const user = await userModel.findById(id);
  if (!user || (!user.partnerId && !req.query.personal)) {
    // Return empty if no partner, unless personal tracking requested (future proof)
    return res
      .status(200)
      .json(
        new ApiResponse(true, "No partner linked", { expenses: [], stats: {} }),
      );
  }

  const partnerId = user.partnerId;

  // Fetch last 50 expenses between these two users
  const expenses = await Expense.find({
    partners: { $all: [id, partnerId] },
  })
    .sort({ date: -1 })
    .limit(50)
    .populate("paidBy", "name");

  // Calculate stats
  // Total spending
  // Who owes whom
  const allExpenses = await Expense.find({
    partners: { $all: [id, partnerId] },
  });

  let myTotal = 0;
  let partnerTotal = 0;

  allExpenses.forEach((exp) => {
    if (exp.paidBy.toString() === id) {
      myTotal += exp.amount;
    } else {
      partnerTotal += exp.amount;
    }
  });

  const totalSpent = myTotal + partnerTotal;
  const splitAmount = totalSpent / 2;

  // Logic:
  // I paid 600, Partner paid 400. Total 1000. Split 500 each.
  // Partner owes me 100 (500 - 400).
  // Or: (MyTotal - PartnerTotal) / 2
  // (600 - 400) / 2 = 100. Positive means I am owed. Negative means I owe.

  const balance = (myTotal - partnerTotal) / 2;

  return res.status(200).json(
    new ApiResponse(true, "Expenses fetched", {
      expenses,
      stats: {
        myTotal,
        partnerTotal,
        totalSpent,
        balance, // +ve: Receive, -ve: Pay
      },
    }),
  );
});

const addExpense = asyncHandler(async (req, res) => {
  const { id } = req.user;
  const { description, amount, category } = req.body;

  const user = await userModel.findById(id);
  if (!user || !user.partnerId) {
    return res.status(400).json(new ApiResponse(false, "No partner linked"));
  }

  const expense = await Expense.create({
    description,
    amount,
    category,
    paidBy: id,
    partners: [id, user.partnerId],
    date: new Date(),
  });

  return res.status(201).json(new ApiResponse(true, "Expense added", expense));
});

const deleteExpense = asyncHandler(async (req, res) => {
  const { expenseId } = req.params;
  await Expense.findByIdAndDelete(expenseId);
  return res.status(200).json(new ApiResponse(true, "Expense deleted"));
});

export { getExpenses, addExpense, deleteExpense };
