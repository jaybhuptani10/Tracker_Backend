import { Expense } from "../models/expense.model.js";
import userModel from "../models/user.model.js";
import { ApiResponse } from "../utils/apiresponse.js";
import asyncHandler from "../utils/asynchandler.js";

const getExpenses = asyncHandler(async (req, res) => {
  const { id } = req.user;

  const user = await userModel.findById(id);
  // Allow fetching if no partner, but just return personal expenses then
  const partnerId = user?.partnerId;

  // Fetch last 50 expenses (Personal OR Shared)
  const expenses = await Expense.find({ partners: id })
    .sort({ date: -1 })
    .limit(50)
    .populate("paidBy", "name");

  // Fetch ALL expenses to calculate accruals/totals
  const allExpenses = await Expense.find({ partners: id });

  let mySharedTotal = 0;
  let partnerSharedTotal = 0;
  let myPersonalTotal = 0;

  const sharedCategoryStats = {};
  const personalCategoryStats = {};

  allExpenses.forEach((exp) => {
    const isPersonal = exp.type === "Personal" || exp.partners.length === 1;

    if (isPersonal) {
      // Personal Stats
      if (exp.paidBy.toString() === id) {
        myPersonalTotal += exp.amount;
        // Personal Category
        if (!personalCategoryStats[exp.category])
          personalCategoryStats[exp.category] = 0;
        personalCategoryStats[exp.category] += exp.amount;
      }
    } else {
      // Shared Stats (Only if valid shared expense)
      if (exp.paidBy.toString() === id) {
        mySharedTotal += exp.amount;
      } else {
        partnerSharedTotal += exp.amount;
      }

      // Shared Category
      if (!sharedCategoryStats[exp.category])
        sharedCategoryStats[exp.category] = 0;
      sharedCategoryStats[exp.category] += exp.amount;
    }
  });

  const totalSharedSpent = mySharedTotal + partnerSharedTotal;
  const balance = (mySharedTotal - partnerSharedTotal) / 2;

  // Format charts
  const categoryChartData = Object.keys(sharedCategoryStats).map((cat) => ({
    name: cat,
    value: sharedCategoryStats[cat],
  }));

  const personalCategoryChartData = Object.keys(personalCategoryStats).map(
    (cat) => ({
      name: cat,
      value: personalCategoryStats[cat],
    }),
  );

  return res.status(200).json(
    new ApiResponse(true, "Expenses fetched", {
      expenses,
      stats: {
        myTotal: mySharedTotal, // For backward compat with "My Share" display
        partnerTotal: partnerSharedTotal,
        totalSpent: totalSharedSpent,
        balance,
        categoryChartData,
        // New Stats
        myPersonalTotal,
        personalCategoryChartData,
      },
    }),
  );
});

const addExpense = asyncHandler(async (req, res) => {
  const { id } = req.user;
  const { description, amount, category, type = "Shared" } = req.body; // Default to Shared

  const user = await userModel.findById(id);
  const partnerId = user?.partnerId;

  // Use array of partners based on type
  // Personal: Just me. Shared: Me + Partner (if exists)
  const partners = type === "Personal" || !partnerId ? [id] : [id, partnerId];

  const expense = await Expense.create({
    description,
    amount,
    category,
    type,
    paidBy: id,
    partners,
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
