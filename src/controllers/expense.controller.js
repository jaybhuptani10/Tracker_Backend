import { Expense } from "../models/expense.model.js";
import userModel from "../models/user.model.js";
import { ApiResponse } from "../utils/apiresponse.js";
import asyncHandler from "../utils/asynchandler.js";

const getExpenses = asyncHandler(async (req, res) => {
  const { id } = req.user;
  const { startDate, endDate } = req.query;

  const user = await userModel.findById(id);
  const partnerId = user?.partnerId;

  // 1. Build Date Query
  // Default to last 30 days if no date provided to avoid loading everything
  let dateQuery = {};
  if (startDate && endDate) {
    dateQuery = {
      date: {
        $gte: new Date(startDate),
        $lte: new Date(endDate),
      },
    };
  } else {
    // If no filter, show all? Or default to recent?
    // User asked for "Yesterday" etc., implying dynamic filters.
    // Let's default to ALL if not specified to allow "All Time" view,
    // but typically paging is better. For now, let's allow ALL if explicit,
    // otherwise if the frontend sends nothing, maybe we just show last 50?
    // Let's stick to the request: Filter if params exist.
    // If NO params, we'll fetch everything (or limit 50 for list).
    // Actually, to support "All Time", we effectively query {}
  }

  // To properly support "Yesterday", we need strict filtering.
  // If params are passed, use them.

  // 2. Fetch Global Expenses (For Balance - All Time)
  // We need this to calculate who owes whom regardless of the view
  const globalExpenses = await Expense.find({ partners: id });

  let mySharedTotalGlobal = 0;
  let partnerSharedTotalGlobal = 0;

  globalExpenses.forEach((exp) => {
    // Only shared expenses affect balance
    const isShared = exp.type === "Shared" || exp.partners.length > 1;
    if (isShared) {
      if (exp.paidBy.toString() === id) {
        mySharedTotalGlobal += exp.amount;
      } else {
        partnerSharedTotalGlobal += exp.amount;
      }
    }
  });

  const balance = (mySharedTotalGlobal - partnerSharedTotalGlobal) / 2;

  // 3. Fetch Filtered Expenses (For List & Period Stats)
  const filterQuery = {
    partners: id,
    ...dateQuery,
  };

  const periodExpenses = await Expense.find(filterQuery)
    .sort({ date: -1 })
    //.limit(startDate ? 0 : 50) // If filtering, show all matches. If no filter, limit 50?
    // Better: If date filter exists, NO limit. If no filter, limit 50.
    .limit(startDate ? 1000 : 50)
    .populate("paidBy", "name");

  // We also need ALL period expenses for stats (in case limit 50 cut them off)
  // But wait, if we limit 50, stats might be wrong for "All Time".
  // Let's fetch ALL period expenses for Stats, but only return top 50 for List if no filter.
  const allPeriodExpenses = await Expense.find(filterQuery);

  // If partner exists, fetch their filtered personal expenses
  let partnerPersonalExpenses = [];
  if (partnerId) {
    const partnerFilter = {
      partners: partnerId,
      type: "Personal",
      ...dateQuery,
    };
    partnerPersonalExpenses = await Expense.find(partnerFilter)
      .sort({ date: -1 })
      .limit(startDate ? 1000 : 50)
      .populate("paidBy", "name");
  }

  // 4. Calculate Period Stats
  let mySharedTotal = 0;
  let partnerSharedTotal = 0;
  let myPersonalTotal = 0;
  let partnerPersonalTotal = 0;

  const sharedCategoryStats = {};
  const personalCategoryStats = {};
  const partnerPersonalCategoryStats = {};

  allPeriodExpenses.forEach((exp) => {
    const isPersonal = exp.type === "Personal" || exp.partners.length === 1;

    if (isPersonal) {
      // Personal Stats
      if (exp.paidBy.toString() === id) {
        myPersonalTotal += exp.amount;
        if (!personalCategoryStats[exp.category])
          personalCategoryStats[exp.category] = 0;
        personalCategoryStats[exp.category] += exp.amount;
      }
    } else {
      // Shared Stats
      if (exp.paidBy.toString() === id) {
        mySharedTotal += exp.amount;
      } else {
        partnerSharedTotal += exp.amount;
      }

      if (!sharedCategoryStats[exp.category])
        sharedCategoryStats[exp.category] = 0;
      sharedCategoryStats[exp.category] += exp.amount;
    }
  });

  // Calculate partner's PERSONAL stats for period
  if (partnerId) {
    const partnerFilterAll = {
      partners: partnerId,
      type: "Personal",
      ...dateQuery,
    };
    const allPartnerPeriodExpenses = await Expense.find(partnerFilterAll);

    allPartnerPeriodExpenses.forEach((exp) => {
      if (exp.paidBy.toString() === partnerId) {
        partnerPersonalTotal += exp.amount;
        if (!partnerPersonalCategoryStats[exp.category])
          partnerPersonalCategoryStats[exp.category] = 0;
        partnerPersonalCategoryStats[exp.category] += exp.amount;
      }
    });
  }

  const totalSharedSpent = mySharedTotal + partnerSharedTotal;

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

  const partnerPersonalCategoryChartData = Object.keys(
    partnerPersonalCategoryStats,
  ).map((cat) => ({
    name: cat,
    value: partnerPersonalCategoryStats[cat],
  }));

  return res.status(200).json(
    new ApiResponse(true, "Expenses fetched", {
      expenses: periodExpenses,
      partnerPersonalExpenses,
      stats: {
        myTotal: mySharedTotal,
        partnerTotal: partnerSharedTotal,
        totalSpent: totalSharedSpent,
        balance, // Global Balance
        categoryChartData,
        // Personal
        myPersonalTotal,
        personalCategoryChartData,
        // Partner
        partnerPersonalTotal,
        partnerPersonalCategoryChartData,
        hasPartner: !!partnerId,
        total: myPersonalTotal + mySharedTotal, // Total of all user's expenses
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
