import { randomUUID } from "node:crypto";
import { Router } from "express";
import { getDatabase } from "../database.js";
import { requireAuthentication } from "./auth.js";

const router = Router();
const allowedGenders = new Set(["female", "male", "non_binary", "prefer_not_to_say"]);
const monthlyDuesCents = 3_000;

function cleanText(value) {
  return typeof value === "string" ? value.trim() : "";
}

function normalizeTelephone(value) {
  return value.replace(/\D/g, "");
}

function monthKey(date) {
  return date.toISOString().slice(0, 7);
}

function membershipMonths(startDate, endDate) {
  const start = monthKey(startDate);
  const end = monthKey(endDate);
  if (start > end) return [];

  const [startYear, startMonth] = start.split("-").map(Number);
  const [endYear, endMonth] = end.split("-").map(Number);
  const result = [];
  for (let cursor = startYear * 12 + startMonth - 1; cursor <= endYear * 12 + endMonth - 1; cursor += 1) {
    const year = Math.floor(cursor / 12);
    const month = (cursor % 12) + 1;
    result.push(`${year}-${String(month).padStart(2, "0")}`);
  }
  return result;
}

function publicChild(child, index) {
  return {
    id: typeof child.id === "string" ? child.id : `legacy-${index}`,
    firstName: child.firstName || "",
    lastName: child.lastName || "",
    gender: child.gender || "prefer_not_to_say",
    birthMonth: Number(child.birthMonth) || 1,
    birthYear: Number(child.birthYear) || new Date().getFullYear(),
  };
}

function publicPayment(payment) {
  return {
    id: payment._id.toString(),
    amountCents: payment.amountCents || 0,
    category: payment.category || "Membership payment",
    description: payment.description || "Payment",
    date: payment.transactionDate instanceof Date ? payment.transactionDate.toISOString().slice(0, 10) : "",
    monthsPaid: payment.monthsPaid || [],
    months: payment.months || 0,
  };
}

router.use(requireAuthentication);

router.get("/", async (request, response) => {
  try {
    const database = await getDatabase();
    const userId = request.authenticatedUser._id;
    const [user, paymentDocuments] = await Promise.all([
      database.collection("users").findOne({ _id: userId, isActive: true }),
      database.collection("finance_transactions")
        .find({ memberId: userId, type: "income" })
        .sort({ transactionDate: -1, createdAt: -1 })
        .toArray(),
    ]);
    if (!user) return response.status(404).json({ error: "Profile not found." });

    const payments = paymentDocuments.map(publicPayment);
    const dueMonths = membershipMonths(user.createdAt instanceof Date ? user.createdAt : new Date(), new Date());
    const paidMonths = [...new Set(payments.flatMap((payment) => payment.monthsPaid))];
    const unpaidMonths = dueMonths.filter((month) => !paidMonths.includes(month));
    const unallocatedMonthsCount = payments.reduce(
      (count, payment) => count + (payment.months && payment.monthsPaid.length === 0 ? payment.months : 0),
      0,
    );
    const estimatedOutstandingMonths = Math.max(0, unpaidMonths.length - unallocatedMonthsCount);

    response.json({
      profile: {
        id: userId.toString(),
        firstName: user.firstName || "",
        lastName: user.lastName || "",
        email: user.email || "",
        telephone: user.telephone || user.phone || "",
        role: user.role === "members" ? "user" : user.role || "user",
        children: (user.children || []).map(publicChild),
        memberSince: user.createdAt || null,
        totalPaidCents: payments.reduce((total, payment) => total + payment.amountCents, 0),
        paidMonths,
        unpaidMonths,
        outstandingAmountCents: estimatedOutstandingMonths * monthlyDuesCents,
        unallocatedMonthsCount,
        payments,
      },
    });
  } catch (error) {
    console.error("Unable to load member profile:", error);
    response.status(503).json({ error: "Profile is temporarily unavailable." });
  }
});

router.patch("/", async (request, response) => {
  const firstName = cleanText(request.body?.firstName);
  const lastName = cleanText(request.body?.lastName);
  const email = cleanText(request.body?.email).toLowerCase();
  const telephone = cleanText(request.body?.telephone);
  const telephoneNormalized = normalizeTelephone(telephone);

  if (!firstName || !lastName || firstName.length > 100 || lastName.length > 100) {
    return response.status(400).json({ error: "Enter valid first and last names (up to 100 characters)." });
  }
  if (!/^\S+@\S+\.\S+$/.test(email) || email.length > 254) {
    return response.status(400).json({ error: "Enter a valid email address." });
  }
  if (telephone.length > 30 || (telephone && telephoneNormalized.length < 7)) {
    return response.status(400).json({ error: "Enter a valid telephone number." });
  }

  try {
    const database = await getDatabase();
    const users = database.collection("users");
    const userId = request.authenticatedUser._id;
    const duplicateQueries = [{ email }];
    if (telephoneNormalized) duplicateQueries.push({ telephoneNormalized });
    const duplicate = await users.findOne({ _id: { $ne: userId }, $or: duplicateQueries }, { projection: { _id: 1 } });
    if (duplicate) return response.status(409).json({ error: "Member already registered." });

    await users.createIndex({ email: 1 }, { unique: true });
    await users.createIndex({ telephoneNormalized: 1 }, { unique: true, sparse: true });
    const update = {
      $set: { firstName, lastName, email, telephone, telephoneNormalized, updatedAt: new Date() },
      $unset: { phone: "" },
    };
    if (!telephoneNormalized) {
      delete update.$set.telephoneNormalized;
      update.$unset.telephone = "";
      update.$unset.telephoneNormalized = "";
    }

    await users.updateOne({ _id: userId, isActive: true }, update);
    response.json({ profile: { id: userId.toString(), firstName, lastName, email, telephone } });
  } catch (error) {
    if (error?.code === 11000) return response.status(409).json({ error: "Member already registered." });
    console.error("Unable to update member profile:", error);
    response.status(503).json({ error: "Unable to update profile." });
  }
});

router.post("/children", async (request, response) => {
  const child = {
    id: randomUUID(),
    firstName: cleanText(request.body?.firstName),
    lastName: cleanText(request.body?.lastName),
    gender: cleanText(request.body?.gender),
    birthMonth: Number(request.body?.birthMonth),
    birthYear: Number(request.body?.birthYear),
  };
  const currentYear = new Date().getFullYear();
  if (
    !child.firstName || !child.lastName || child.firstName.length > 100 || child.lastName.length > 100
    || !allowedGenders.has(child.gender)
    || !Number.isInteger(child.birthMonth) || child.birthMonth < 1 || child.birthMonth > 12
    || !Number.isInteger(child.birthYear) || child.birthYear < currentYear - 25 || child.birthYear > currentYear
  ) {
    return response.status(400).json({ error: "Enter a valid child name, gender, birth month, and birth year." });
  }

  try {
    const database = await getDatabase();
    const result = await database.collection("users").updateOne(
      { _id: request.authenticatedUser._id, isActive: true },
      { $push: { children: child }, $set: { updatedAt: new Date() } },
    );
    if (!result.matchedCount) return response.status(404).json({ error: "Profile not found." });
    response.status(201).json({ child });
  } catch (error) {
    console.error("Unable to add child to profile:", error);
    response.status(503).json({ error: "Unable to add child." });
  }
});

router.patch("/children/:childId", async (request, response) => {
  const childId = request.params.childId;
  if (!childId || childId.length > 100) {
    return response.status(400).json({ error: "Invalid child ID." });
  }

  const child = {
    id: childId,
    firstName: cleanText(request.body?.firstName),
    lastName: cleanText(request.body?.lastName),
    gender: cleanText(request.body?.gender),
    birthMonth: Number(request.body?.birthMonth),
    birthYear: Number(request.body?.birthYear),
  };
  const currentYear = new Date().getFullYear();
  if (
    !child.firstName || !child.lastName || child.firstName.length > 100 || child.lastName.length > 100
    || !allowedGenders.has(child.gender)
    || !Number.isInteger(child.birthMonth) || child.birthMonth < 1 || child.birthMonth > 12
    || !Number.isInteger(child.birthYear) || child.birthYear < currentYear - 25 || child.birthYear > currentYear
  ) {
    return response.status(400).json({ error: "Enter a valid child name, gender, birth month, and birth year." });
  }

  try {
    const users = (await getDatabase()).collection("users");
    const userId = request.authenticatedUser._id;
    const user = await users.findOne({ _id: userId, isActive: true }, { projection: { children: 1 } });
    if (!user) return response.status(404).json({ error: "Profile not found." });

    const existingChildren = user.children || [];
    const childIndex = existingChildren.findIndex((item, index) => (
      item.id === childId || `legacy-${index}` === childId
    ));
    if (childIndex === -1) return response.status(404).json({ error: "Child not found." });

    const children = [...existingChildren];
    children[childIndex] = child;
    const result = await users.updateOne(
      { _id: userId, ...(Array.isArray(user.children) ? { children: existingChildren } : { children: { $exists: false } }) },
      { $set: { children, updatedAt: new Date() } },
    );
    if (!result.modifiedCount) return response.status(409).json({ error: "Profile changed. Refresh and try again." });
    response.json({ child });
  } catch (error) {
    console.error("Unable to update child in profile:", error);
    response.status(503).json({ error: "Unable to update child." });
  }
});

router.delete("/children/:childId", async (request, response) => {
  const userId = request.authenticatedUser._id;
  try {
    const users = (await getDatabase()).collection("users");
    const user = await users.findOne({ _id: userId, isActive: true }, { projection: { children: 1 } });
    if (!user) return response.status(404).json({ error: "Profile not found." });

    const childIndex = (user.children || []).findIndex((child, index) => (
      child.id === request.params.childId || `legacy-${index}` === request.params.childId
    ));
    if (childIndex === -1) return response.status(404).json({ error: "Child not found." });

    const currentChildren = user.children || [];
    const children = [...currentChildren];
    children.splice(childIndex, 1);
    const childrenFilter = Array.isArray(user.children)
      ? { children: currentChildren }
      : { children: { $exists: false } };
    const result = await users.updateOne(
      { _id: userId, ...childrenFilter },
      { $set: { children, updatedAt: new Date() } },
    );
    if (!result.modifiedCount) return response.status(409).json({ error: "Profile changed. Refresh and try again." });
    response.status(204).end();
  } catch (error) {
    console.error("Unable to remove child from profile:", error);
    response.status(503).json({ error: "Unable to remove child." });
  }
});

export default router;
