import { Router } from "express";
import { ObjectId } from "mongodb";
import { getDatabase } from "../database.js";

const router = Router();
const assignableRoles = new Set(["head_coach", "chairman", "finance", "user"]);
const teamAgeLimits = new Map([["U-6", 6], ["U-8", 8], ["U-10", 10], ["U-12", 12], ["U-14", 14]]);

function normalizedRole(role) {
  return role === "members" ? "user" : (role || "user");
}

function adminOnly(request, response, next) {
  if (request.authenticatedUser?.role !== "admin") {
    return response.status(403).json({ error: "Administrator access required." });
  }
  next();
}

function cleanText(value) {
  return typeof value === "string" ? value.trim() : "";
}

function normalizeTelephone(value) {
  return value.replace(/\D/g, "");
}

function publicMember(user) {
  return {
    id: user._id.toString(),
    firstName: user.firstName || "",
    lastName: user.lastName || "",
    telephone: user.telephone || user.phone || "",
    email: user.email || "",
  };
}

function membershipMonthStatus(user, transactions, now = new Date()) {
  const paidMonths = new Set(transactions.flatMap((transaction) => transaction.monthsPaid || []));
  const unallocatedMonths = transactions.reduce(
    (count, transaction) => count + (transaction.months && !transaction.monthsPaid?.length ? transaction.months : 0),
    0,
  );
  if (unallocatedMonths) {
    return { label: "Needs review", kind: "review", months: unallocatedMonths };
  }

  const startDate = user.createdAt instanceof Date ? user.createdAt : now;
  const startMonth = startDate.toISOString().slice(0, 7);
  const currentMonth = now.toISOString().slice(0, 7);
  const currentYear = currentMonth.slice(0, 4);
  const dueMonths = [];
  const [startYearNumber, startMonthNumber] = startMonth.split("-").map(Number);
  const [currentYearNumber, currentMonthNumber] = currentMonth.split("-").map(Number);
  for (let cursor = startYearNumber * 12 + startMonthNumber - 1; cursor <= currentYearNumber * 12 + currentMonthNumber - 1; cursor += 1) {
    const year = Math.floor(cursor / 12);
    const month = (cursor % 12) + 1;
    dueMonths.push(`${year}-${String(month).padStart(2, "0")}`);
  }

  const monthsBehind = dueMonths.filter((month) => !paidMonths.has(month)).length;
  if (monthsBehind) {
    return { label: `${monthsBehind} month${monthsBehind === 1 ? "" : "s"} behind`, kind: "behind", months: monthsBehind };
  }

  const monthsPaidThisYear = [...paidMonths].filter((month) => month.startsWith(`${currentYear}-`)).length;
  if (monthsPaidThisYear === 12) return { label: "Fully paid", kind: "paid", months: 12 };

  const monthsAhead = [...paidMonths].filter((month) => month > currentMonth).length;
  if (monthsAhead) {
    return { label: `${monthsAhead} month${monthsAhead === 1 ? "" : "s"} ahead`, kind: "ahead", months: monthsAhead };
  }
  return { label: "Up to date", kind: "current", months: 0 };
}

router.get("/", async (request, response) => {
  try {
    const database = await getDatabase();
    const role = request.authenticatedUser.role;
    const includePaymentStatus = role === "finance" || role === "admin";
    const users = await database
      .collection("users")
      .find(
        { isActive: true },
        { projection: { firstName: 1, lastName: 1, parents: 1, telephone: 1, phone: 1, email: 1, role: 1, createdAt: 1 } },
      )
      .sort({ lastName: 1, firstName: 1 })
      .limit(500)
      .toArray();

    const paymentTransactions = includePaymentStatus && users.length
      ? await database.collection("finance_transactions")
        .find({ memberId: { $in: users.map((user) => user._id) }, type: "income" }, {
          projection: { memberId: 1, monthsPaid: 1, months: 1 },
        })
        .toArray()
      : [];
    const paymentsByMember = new Map();
    for (const transaction of paymentTransactions) {
      const key = transaction.memberId.toString();
      paymentsByMember.set(key, [...(paymentsByMember.get(key) || []), transaction]);
    }

    const members = users.map((user) => ({
      ...publicMember(user),
      parentFirstNames: user.parents?.length
        ? user.parents.map((parent) => parent.firstName || "").filter(Boolean)
        : [user.firstName || ""].filter(Boolean),
      ...(role === "admin" ? { role: normalizedRole(user.role) } : {}),
      ...(includePaymentStatus ? {
        paymentStatus: membershipMonthStatus(user, paymentsByMember.get(user._id.toString()) || []),
      } : {}),
    }));
    response.json({ members });
  } catch (error) {
    console.error("Unable to list members:", error);
    response.status(503).json({ error: "Member directory is temporarily unavailable." });
  }
});

router.get("/teams/:division/roster", async (request, response) => {
  if (!new Set(["admin", "head_coach", "chairman"]).has(request.authenticatedUser?.role)) {
    return response.status(403).json({ error: "Team roster access required." });
  }

  const division = request.params.division.toUpperCase();
  const maximumAge = teamAgeLimits.get(division);
  if (!maximumAge) return response.status(404).json({ error: "Team not found." });

  try {
    const database = await getDatabase();
    const users = await database.collection("users")
      .find({ isActive: true, children: { $type: "array", $ne: [] } }, {
        projection: { firstName: 1, lastName: 1, parents: 1, children: 1 },
      })
      .sort({ lastName: 1, firstName: 1 })
      .toArray();
    const now = new Date();
    const players = users.flatMap((user) => (user.children || []).flatMap((child) => {
      const birthMonth = Number(child.birthMonth);
      const birthYear = Number(child.birthYear);
      if (!Number.isInteger(birthMonth) || birthMonth < 1 || birthMonth > 12 || !Number.isInteger(birthYear)) return [];

      let age = now.getFullYear() - birthYear;
      if (now.getMonth() + 1 < birthMonth) age -= 1;
      if (age < maximumAge - 1 || age > maximumAge) return [];

      return [{
        id: typeof child.id === "string" ? child.id : `${user._id}:${child.firstName}:${child.lastName}:${birthYear}`,
        firstName: child.firstName || "",
        lastName: child.lastName || "",
        age,
        parents: (user.parents || [{ firstName: user.firstName || "", lastName: user.lastName || "" }])
          .map((parent) => `${parent.firstName || ""} ${parent.lastName || ""}`.trim())
          .filter(Boolean),
      }];
    }));

    response.json({ division, players });
  } catch (error) {
    console.error("Unable to load team roster:", error);
    response.status(503).json({ error: "Team roster is temporarily unavailable." });
  }
});

router.get("/:id", async (request, response) => {
  if (!ObjectId.isValid(request.params.id)) {
    return response.status(400).json({ error: "Invalid member ID." });
  }

  try {
    const database = await getDatabase();
    const user = await database.collection("users").findOne(
      { _id: new ObjectId(request.params.id), isActive: true },
      {
        projection: {
          firstName: 1, lastName: 1, parents: 1, children: 1, email: 1,
          telephone: 1, phone: 1, role: 1, createdAt: 1, isActive: 1,
        },
      },
    );
    if (!user) return response.status(404).json({ error: "Member not found." });

    const viewerRole = request.authenticatedUser.role;
    const member = publicMember(user);
    const parents = user.parents?.length
      ? user.parents
      : [{ firstName: user.firstName || "", lastName: user.lastName || "" }];

    if (viewerRole === "head_coach" || viewerRole === "chairman" || viewerRole === "admin") {
      member.parents = parents;
      member.children = user.children || [];
    }
    if (viewerRole === "chairman" || viewerRole === "admin") {
      member.role = normalizedRole(user.role);
    }
    if (viewerRole === "admin") {
      member.isActive = user.isActive;
      member.createdAt = user.createdAt;
    }

    response.json({ member, viewerRole });
  } catch (error) {
    console.error("Unable to get member details:", error);
    response.status(503).json({ error: "Member details are temporarily unavailable." });
  }
});

router.patch("/:id", adminOnly, async (request, response) => {
  if (!ObjectId.isValid(request.params.id)) {
    return response.status(400).json({ error: "Invalid member ID." });
  }

  const firstName = cleanText(request.body?.firstName);
  const lastName = cleanText(request.body?.lastName);
  const telephone = cleanText(request.body?.telephone);
  const telephoneNormalized = normalizeTelephone(telephone);
  const email = cleanText(request.body?.email).toLowerCase();
  const requestedRole = cleanText(request.body?.role).toLowerCase();

  if (!firstName || !lastName) {
    return response.status(400).json({ error: "First and last name are required." });
  }
  if (!/^\S+@\S+\.\S+$/.test(email)) {
    return response.status(400).json({ error: "Enter a valid email address." });
  }
  if (firstName.length > 100 || lastName.length > 100 || telephone.length > 30) {
    return response.status(400).json({ error: "One or more fields are too long." });
  }
  if (telephone && telephoneNormalized.length < 7) {
    return response.status(400).json({ error: "Enter a valid telephone number." });
  }
  if (requestedRole && requestedRole !== "admin" && !assignableRoles.has(requestedRole)) {
    return response.status(400).json({ error: "Select a valid member role." });
  }

  try {
    const database = await getDatabase();
    const users = database.collection("users");
    const memberId = new ObjectId(request.params.id);
    const existingMember = await users.findOne({ _id: memberId, isActive: true });
    if (!existingMember) return response.status(404).json({ error: "Member not found." });
    if (existingMember.role === "admin" && requestedRole && requestedRole !== "admin") {
      return response.status(400).json({ error: "The primary administrator role cannot be changed." });
    }
    if (existingMember.role !== "admin" && requestedRole === "admin") {
      return response.status(400).json({ error: "Administrator access cannot be assigned here." });
    }

    const duplicateChecks = [{ email }];
    if (telephoneNormalized) duplicateChecks.push({ telephoneNormalized });
    const duplicate = await users.findOne({
      _id: { $ne: memberId },
      $or: duplicateChecks,
    });
    if (duplicate) {
      const field = duplicate.email === email ? "email address" : "telephone number";
      return response.status(409).json({ error: `Another user already has that ${field}.` });
    }

    await users.createIndex({ email: 1 }, { unique: true });
    await users.createIndex({ telephoneNormalized: 1 }, { unique: true, sparse: true });

    const changes = {
      $set: { firstName, lastName, email, updatedAt: new Date() },
      $unset: { phone: "" },
    };
    if (requestedRole) changes.$set.role = requestedRole;
    if (telephoneNormalized) {
      changes.$set.telephone = telephone;
      changes.$set.telephoneNormalized = telephoneNormalized;
    } else {
      changes.$unset.telephone = "";
      changes.$unset.telephoneNormalized = "";
    }

    const result = await users.findOneAndUpdate(
      { _id: memberId, isActive: true },
      changes,
      { returnDocument: "after", projection: { firstName: 1, lastName: 1, telephone: 1, email: 1, role: 1 } },
    );

    if (!result) return response.status(404).json({ error: "Member not found." });
    response.json({ member: { ...publicMember(result), role: normalizedRole(result.role) } });
  } catch (error) {
    if (error?.code === 11000) {
      return response.status(409).json({ error: "That email address or telephone number is already in use." });
    }
    console.error("Unable to update member:", error);
    response.status(503).json({ error: "Unable to update the member." });
  }
});

router.delete("/:id", adminOnly, async (request, response) => {
  if (!ObjectId.isValid(request.params.id)) {
    return response.status(400).json({ error: "Invalid member ID." });
  }

  const memberId = new ObjectId(request.params.id);
  if (request.authenticatedUser._id.equals(memberId)) {
    return response.status(400).json({ error: "You cannot deactivate your own administrator account." });
  }

  try {
    const database = await getDatabase();
    const result = await database.collection("users").updateOne(
      { _id: memberId, isActive: true },
      { $set: { isActive: false, deactivatedAt: new Date(), updatedAt: new Date() } },
    );

    if (!result.matchedCount) return response.status(404).json({ error: "Member not found." });
    await database.collection("sessions").deleteMany({ userId: memberId });
    response.status(204).end();
  } catch (error) {
    console.error("Unable to deactivate member:", error);
    response.status(503).json({ error: "Unable to deactivate the member." });
  }
});

export default router;
