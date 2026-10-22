import { Router } from "express";
import { ObjectId } from "mongodb";
import { getDatabase } from "../database.js";

const router = Router();
const allowedTypes = new Set(["income", "expense"]);
const allowedFinanceRoles = new Set(["admin", "finance"]);
const maximumAmountCents = 100_000_000;

function financeAccessOnly(request, response, next) {
  if (!allowedFinanceRoles.has(request.authenticatedUser?.role)) {
    return response.status(403).json({ error: "Finance access required." });
  }
  next();
}

function transactionFromDocument(document) {
  return {
    id: document._id.toString(),
    type: document.type,
    amountCents: document.amountCents,
    category: document.category,
    description: document.description,
    date: document.transactionDate.toISOString().slice(0, 10),
    monthsPaid: document.monthsPaid || [],
    months: document.months,
  };
}

function isValidDate(value) {
  return typeof value === "string"
    && /^\d{4}-\d{2}-\d{2}$/.test(value)
    && !Number.isNaN(Date.parse(`${value}T00:00:00.000Z`))
    && new Date(`${value}T00:00:00.000Z`).toISOString().slice(0, 10) === value;
}

function isMonthKey(value) {
  return typeof value === "string" && /^\d{4}-(0[1-9]|1[0-2])$/.test(value);
}

function monthKeyForDate(date) {
  return date.toISOString().slice(0, 7);
}

router.use(financeAccessOnly);

router.get("/members/:memberId/payments", async (request, response) => {
  if (!ObjectId.isValid(request.params.memberId)) {
    return response.status(400).json({ error: "Invalid member ID." });
  }

  try {
    const database = await getDatabase();
    const memberId = new ObjectId(request.params.memberId);
    const [member, payments] = await Promise.all([
      database.collection("users").findOne(
        { _id: memberId },
        { projection: { firstName: 1, lastName: 1, createdAt: 1 } },
      ),
      database.collection("finance_transactions")
        .find({ memberId, type: "income" })
        .sort({ transactionDate: -1, createdAt: -1 })
        .toArray(),
    ]);

    if (!member) return response.status(404).json({ error: "Member not found." });

    const paymentHistory = payments.map(transactionFromDocument);
    response.json({
      member: {
        id: member._id.toString(),
        firstName: member.firstName || "",
        lastName: member.lastName || "",
        membershipStartMonth: (member.createdAt instanceof Date ? member.createdAt : new Date()).toISOString().slice(0, 7),
      },
      totalPaidCents: paymentHistory.reduce((total, payment) => total + payment.amountCents, 0),
      paidMonths: [...new Set(paymentHistory.flatMap((payment) => payment.monthsPaid))],
      unallocatedMonthsCount: paymentHistory.reduce((total, payment) => total + (payment.months && !payment.monthsPaid.length ? payment.months : 0), 0),
      payments: paymentHistory,
    });
  } catch (error) {
    console.error("Unable to load member payment history:", error);
    response.status(503).json({ error: "Payment history is temporarily unavailable." });
  }
});

router.post("/members/:memberId/payments/record", async (request, response) => {
  if (!ObjectId.isValid(request.params.memberId)) {
    return response.status(400).json({ error: "Invalid member ID." });
  }

  const monthsPaid = request.body?.monthsPaid;
  if (
    !Array.isArray(monthsPaid)
    || monthsPaid.length < 1
    || monthsPaid.length > 12
    || new Set(monthsPaid).size !== monthsPaid.length
    || !monthsPaid.every(isMonthKey)
  ) {
    return response.status(400).json({ error: "Select between 1 and 12 different membership months." });
  }

  const now = new Date();

  try {
    const database = await getDatabase();
    const memberId = new ObjectId(request.params.memberId);
    const member = await database.collection("users").findOne(
      { _id: memberId, isActive: true },
      { projection: { firstName: 1, lastName: 1, createdAt: 1 } },
    );
    if (!member) return response.status(404).json({ error: "Active member not found." });

    const startDate = member.createdAt instanceof Date ? member.createdAt : now;
    const membershipStartMonth = monthKeyForDate(startDate);
    if (monthsPaid.some((month) => month < membershipStartMonth)) {
      return response.status(400).json({ error: "Cannot record dues before the member's start date." });
    }

    const transactions = database.collection("finance_transactions");
    const existingPayment = await transactions.findOne(
      { memberId, type: "income", monthsPaid: { $in: monthsPaid } },
      { projection: { monthsPaid: 1 } },
    );
    const alreadyPaid = new Set((existingPayment?.monthsPaid || []));
    if (monthsPaid.some((month) => alreadyPaid.has(month))) {
      return response.status(409).json({ error: "One or more selected months have already been paid." });
    }

    await transactions.createIndex(
      { memberId: 1, monthsPaid: 1 },
      { unique: true, partialFilterExpression: { monthsPaid: { $exists: true } } },
    );
    const document = {
      type: "income",
      amountCents: monthsPaid.length * 3_000,
      category: "Membership payment",
      description: `${monthsPaid.length} month${monthsPaid.length === 1 ? "" : "s"} membership payment`,
      transactionDate: now,
      createdAt: now,
      createdBy: request.authenticatedUser._id,
      memberId,
      memberName: `${member.firstName || ""} ${member.lastName || ""}`.trim(),
      months: monthsPaid.length,
      monthsPaid: [...monthsPaid].sort(),
      source: "direct_membership_payment",
    };
    const result = await transactions.insertOne(document);
    return response.status(201).json({ transaction: transactionFromDocument({ ...document, _id: result.insertedId }) });
  } catch (error) {
    if (error?.code === 11000) {
      return response.status(409).json({ error: "One or more selected months have already been recorded as paid." });
    }
    console.error("Unable to record member payment:", error);
    return response.status(503).json({ error: "Unable to record the member payment." });
  }
});

router.get("/", async (request, response) => {
  const { startDate, endDate } = request.query;
  if (!isValidDate(startDate) || !isValidDate(endDate) || startDate > endDate) {
    return response.status(400).json({ error: "Provide a valid startDate and endDate range." });
  }

  try {
    const transactionsCollection = (await getDatabase()).collection("finance_transactions");
    const transactionDate = {
      $gte: new Date(`${startDate}T00:00:00.000Z`),
      $lt: new Date(Date.parse(`${endDate}T00:00:00.000Z`) + 24 * 60 * 60 * 1000),
    };
    const [transactions, totals] = await Promise.all([
      transactionsCollection
        .find({ transactionDate }, { projection: { type: 1, amountCents: 1, category: 1, description: 1, transactionDate: 1 } })
        .sort({ transactionDate: -1, createdAt: -1 })
        .limit(10)
        .toArray(),
      transactionsCollection.aggregate([
        { $match: { transactionDate } },
        { $group: { _id: "$type", totalCents: { $sum: "$amountCents" } } },
      ]).toArray(),
    ]);

    const incomeCents = totals.find((total) => total._id === "income")?.totalCents || 0;
    const expenseCents = totals.find((total) => total._id === "expense")?.totalCents || 0;
    response.json({
      summary: { incomeCents, expenseCents, balanceCents: incomeCents - expenseCents },
      transactions: transactions.map(transactionFromDocument),
    });
  } catch (error) {
    console.error("Unable to load finance records:", error);
    response.status(503).json({ error: "Finance records are temporarily unavailable." });
  }
});

router.post("/", async (request, response) => {
  const type = typeof request.body?.type === "string" ? request.body.type.trim().toLowerCase() : "";
  const category = typeof request.body?.category === "string" ? request.body.category.trim() : "";
  const description = typeof request.body?.description === "string" ? request.body.description.trim() : "";
  const date = typeof request.body?.date === "string" ? request.body.date : "";
  const amountCents = request.body?.amountCents;
  const memberIdValue = typeof request.body?.memberId === "string" ? request.body.memberId : "";

  if (!allowedTypes.has(type)) {
    return response.status(400).json({ error: "Choose income or expense." });
  }
  if (!Number.isSafeInteger(amountCents) || amountCents < 1 || amountCents > maximumAmountCents) {
    return response.status(400).json({ error: "Enter an amount between $0.01 and $1,000,000.00." });
  }
  if (!category || category.length > 80) {
    return response.status(400).json({ error: "Enter a category of no more than 80 characters." });
  }
  if (!description || description.length > 240) {
    return response.status(400).json({ error: "Enter a description of no more than 240 characters." });
  }
  if (!isValidDate(date)) {
    return response.status(400).json({ error: "Enter a valid transaction date." });
  }
  if (memberIdValue && (type !== "income" || !ObjectId.isValid(memberIdValue))) {
    return response.status(400).json({ error: "Choose a valid member for an income payment." });
  }

  try {
    const database = await getDatabase();
    let linkedMember;
    if (memberIdValue) {
      linkedMember = await database.collection("users").findOne(
        { _id: new ObjectId(memberIdValue), isActive: true },
        { projection: { firstName: 1, lastName: 1 } },
      );
      if (!linkedMember) return response.status(404).json({ error: "Active member not found." });
    }
    const document = {
      type,
      amountCents,
      category,
      description,
      transactionDate: new Date(`${date}T00:00:00.000Z`),
      createdAt: new Date(),
      createdBy: request.authenticatedUser._id,
      ...(linkedMember ? {
        memberId: linkedMember._id,
        memberName: `${linkedMember.firstName || ""} ${linkedMember.lastName || ""}`.trim(),
      } : {}),
    };
    const result = await database.collection("finance_transactions").insertOne(document);
    response.status(201).json({ transaction: transactionFromDocument({ ...document, _id: result.insertedId }) });
  } catch (error) {
    console.error("Unable to save finance record:", error);
    response.status(503).json({ error: "Unable to save the finance record." });
  }
});

export default router;