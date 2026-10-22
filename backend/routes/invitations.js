import { createHash, randomBytes } from "node:crypto";
import bcrypt from "bcrypt";
import { Router } from "express";
import { ObjectId } from "mongodb";
import { getDatabase } from "../database.js";
import { requireAdmin } from "./auth.js";

const router = Router();
const allowedRoles = new Set(["head_coach", "chairman", "finance", "user"]);
const invitationLifetimeMs = 7 * 24 * 60 * 60 * 1000;

function hashToken(token) {
  return createHash("sha256").update(token).digest("hex");
}

function normalizeTelephone(value) {
  return value.replace(/\D/g, "");
}

async function memberAlreadyRegistered(users, { email, telephoneNormalized }) {
  const queries = [];
  if (email) queries.push({ email });
  if (telephoneNormalized) queries.push({ telephoneNormalized });

  if (queries.length && await users.findOne({ $or: queries }, { projection: { _id: 1 } })) {
    return true;
  }
  const legacyContactsCursor = users.find(
    { $or: [{ email: { $type: "string" } }, { telephone: { $type: "string" } }, { phone: { $type: "string" } }] },
    { projection: { email: 1, telephone: 1, phone: 1 } },
  );
  for await (const user of legacyContactsCursor) {
    if (email && typeof user.email === "string" && user.email.trim().toLowerCase() === email) {
      return true;
    }
    if (telephoneNormalized && normalizeTelephone(user.telephone || user.phone || "") === telephoneNormalized) {
      return true;
    }
  }
  return false;
}

function cleanText(value) {
  return typeof value === "string" ? value.trim() : "";
}

function invitationStatus(invitation) {
  if (invitation.acceptedAt) return "accepted";
  if (invitation.revokedAt) return "revoked";
  if (invitation.expiresAt <= new Date()) return "expired";
  return "pending";
}

function publicInvitation(invitation) {
  return {
    id: invitation._id.toString(),
    contactMethod: invitation.contactMethod || "email",
    email: invitation.email || null,
    telephone: invitation.telephone || null,
    role: invitation.role,
    status: invitationStatus(invitation),
    createdAt: invitation.createdAt,
    expiresAt: invitation.expiresAt,
    acceptedAt: invitation.acceptedAt ?? null,
  };
}

async function findUsableInvitation(database, token) {
  if (!token || token.length < 32) return null;
  return database.collection("invites").findOne({
    tokenHash: hashToken(token),
    acceptedAt: { $exists: false },
    revokedAt: { $exists: false },
    expiresAt: { $gt: new Date() },
  });
}

router.get("/accept/:token", async (request, response) => {
  try {
    const database = await getDatabase();
    const invitation = await findUsableInvitation(database, request.params.token);
    if (!invitation) {
      return response.status(404).json({ error: "This invitation is invalid, expired, or already used." });
    }
    response.json({ invitation: publicInvitation(invitation) });
  } catch (error) {
    console.error("Unable to read invitation:", error);
    response.status(503).json({ error: "Invitation service is temporarily unavailable." });
  }
});

router.post("/accept/:token", async (request, response) => {
  const parent1FirstName = cleanText(request.body?.parent1FirstName);
  const parent1LastName = cleanText(request.body?.parent1LastName);
  const parent2FirstName = cleanText(request.body?.parent2FirstName);
  const parent2LastName = cleanText(request.body?.parent2LastName);
  const email = cleanText(request.body?.email).toLowerCase();
  const telephone = cleanText(request.body?.telephone);
  const telephoneNormalized = normalizeTelephone(telephone);
  const password = typeof request.body?.password === "string" ? request.body.password : "";
  const children = Array.isArray(request.body?.children) ? request.body.children : [];
  const allowedGenders = new Set(["female", "male"]);
  const currentYear = new Date().getFullYear();

  if (!parent1FirstName || !parent1LastName) {
    return response.status(400).json({ error: "Parent 1 first and last name are required." });
  }
  if (Boolean(parent2FirstName) !== Boolean(parent2LastName)) {
    return response.status(400).json({ error: "Enter both first and last name for Parent 2." });
  }
  if (!/^\S+@\S+\.\S+$/.test(email)) {
    return response.status(400).json({ error: "Enter a valid email address." });
  }
  if (telephoneNormalized.length < 7) {
    return response.status(400).json({ error: "Enter a valid telephone number." });
  }
  if (password.length < 12) {
    return response.status(400).json({ error: "Password must contain at least 12 characters." });
  }
  if (!children.length) {
    return response.status(400).json({ error: "Add at least one child." });
  }

  const cleanChildren = children.map((child) => ({
    firstName: cleanText(child?.firstName),
    lastName: cleanText(child?.lastName),
    gender: cleanText(child?.gender),
    birthMonth: Number(child?.birthMonth),
    birthYear: Number(child?.birthYear),
  }));
  const invalidChild = cleanChildren.some((child) => (
    !child.firstName || !child.lastName || !allowedGenders.has(child.gender)
    || !Number.isInteger(child.birthMonth) || child.birthMonth < 1 || child.birthMonth > 12
    || !Number.isInteger(child.birthYear) || child.birthYear < currentYear - 25 || child.birthYear > currentYear
  ));
  if (invalidChild) {
    return response.status(400).json({ error: "Complete all child fields with a valid birth month and year." });
  }

  try {
    const database = await getDatabase();
    const invitation = await findUsableInvitation(database, request.params.token);
    if (!invitation) {
      return response.status(404).json({ error: "This invitation is invalid, expired, or already used." });
    }
    if (invitation.contactMethod === "telephone" && invitation.telephoneNormalized !== telephoneNormalized) {
      return response.status(400).json({ error: "Telephone number must match the invitation." });
    }
    if ((invitation.contactMethod || "email") === "email" && invitation.email !== email) {
      return response.status(400).json({ error: "Email address must match the invitation." });
    }

    const users = database.collection("users");
    if (await memberAlreadyRegistered(users, { email, telephoneNormalized })) {
      return response.status(409).json({ error: "Member already registered." });
    }

    await users.createIndex({ email: 1 }, { unique: true });
    await users.createIndex({ telephoneNormalized: 1 }, { unique: true, sparse: true });
    const now = new Date();
    const parents = [
      { firstName: parent1FirstName, lastName: parent1LastName },
      ...(parent2FirstName ? [{ firstName: parent2FirstName, lastName: parent2LastName }] : []),
    ];
    const result = await users.insertOne({
      firstName: parent1FirstName,
      lastName: parent1LastName,
      parents,
      children: cleanChildren,
      email,
      telephone,
      telephoneNormalized,
      passwordHash: await bcrypt.hash(password, 12),
      role: invitation.role,
      isActive: true,
      createdAt: now,
      updatedAt: now,
    });

    const accepted = await database.collection("invites").updateOne(
      { _id: invitation._id, acceptedAt: { $exists: false } },
      { $set: { acceptedAt: now, acceptedBy: result.insertedId } },
    );
    if (!accepted.modifiedCount) {
      await users.deleteOne({ _id: result.insertedId });
      return response.status(409).json({ error: "This invitation has already been used." });
    }

    response.status(201).json({ message: "Account created successfully." });
  } catch (error) {
    if (error?.code === 11000) {
      return response.status(409).json({ error: "Member already registered." });
    }
    console.error("Unable to accept invitation:", error);
    response.status(503).json({ error: "Unable to create the account." });
  }
});

router.use(requireAdmin);

router.get("/", async (_request, response) => {
  try {
    const database = await getDatabase();
    const invitations = await database
      .collection("invites")
      .find({ tokenHash: { $type: "string" } })
      .sort({ createdAt: -1 })
      .limit(100)
      .toArray();

    response.json({ invitations: invitations.map(publicInvitation) });
  } catch (error) {
    console.error("Unable to list invitations:", error);
    response.status(503).json({ error: "Invitations are temporarily unavailable." });
  }
});

router.post("/", async (request, response) => {
  const contactMethod = request.body?.contactMethod === "telephone" ? "telephone" : "email";
  const email = typeof request.body?.email === "string" ? request.body.email.trim().toLowerCase() : "";
  const telephone = typeof request.body?.telephone === "string" ? request.body.telephone.trim() : "";
  const telephoneNormalized = normalizeTelephone(telephone);
  const role = typeof request.body?.role === "string" ? request.body.role.trim().toLowerCase() : "";

  if (contactMethod === "email" && !/^\S+@\S+\.\S+$/.test(email)) {
    return response.status(400).json({ error: "Enter a valid email address." });
  }
  if (contactMethod === "telephone" && telephoneNormalized.length < 7) {
    return response.status(400).json({ error: "Enter a valid telephone number." });
  }
  if (!allowedRoles.has(role)) {
    return response.status(400).json({ error: "Role must be Head Coach, Chairman, Finance, or User." });
  }

  try {
    const database = await getDatabase();
    const users = database.collection("users");
    const invites = database.collection("invites");

    if (await memberAlreadyRegistered(users, {
      email: contactMethod === "email" ? email : "",
      telephoneNormalized: contactMethod === "telephone" ? telephoneNormalized : "",
    })) {
      return response.status(409).json({ error: "Member already registered." });
    }

    const now = new Date();
    const inviteContactQuery = contactMethod === "email" ? { email } : { telephoneNormalized };
    const existingInvitation = await invites.findOne({
      ...inviteContactQuery,
      acceptedAt: { $exists: false },
      revokedAt: { $exists: false },
      expiresAt: { $gt: now },
    });
    if (existingInvitation) {
      return response.status(409).json({
        error: `A pending invitation already exists for this ${contactMethod === "email" ? "email" : "telephone number"}.`,
      });
    }

    const token = randomBytes(32).toString("base64url");
    const invitation = {
      contactMethod,
      ...(contactMethod === "email"
        ? { email }
        : { telephone, telephoneNormalized }),
      role,
      tokenHash: hashToken(token),
      invitedBy: request.authenticatedUser._id,
      createdAt: now,
      expiresAt: new Date(now.getTime() + invitationLifetimeMs),
    };

    await invites.createIndex({ tokenHash: 1 }, { unique: true, sparse: true });
    await invites.createIndex({ expiresAt: 1 });
    const result = await invites.insertOne(invitation);

    response.status(201).json({
      invitation: publicInvitation({ _id: result.insertedId, ...invitation }),
      invitePath: `/accept-invite/${token}`,
    });
  } catch (error) {
    console.error("Unable to create invitation:", error);
    response.status(503).json({ error: "Unable to create the invitation." });
  }
});

router.delete("/:id", async (request, response) => {
  if (!ObjectId.isValid(request.params.id)) {
    return response.status(400).json({ error: "Invalid invitation ID." });
  }

  try {
    const database = await getDatabase();
    const result = await database.collection("invites").deleteOne({
      _id: new ObjectId(request.params.id),
      acceptedAt: { $exists: false },
      revokedAt: { $exists: false },
      expiresAt: { $gt: new Date() },
    });
    if (!result.deletedCount) {
      return response.status(404).json({ error: "Only pending invitations can be deleted." });
    }
    response.status(204).end();
  } catch (error) {
    console.error("Unable to delete invitation:", error);
    response.status(503).json({ error: "Unable to delete the invitation." });
  }
});

export default router;
