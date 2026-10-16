import { Router } from "express";
import { ObjectId } from "mongodb";
import { getDatabase } from "../database.js";

const router = Router();
const assignableRoles = new Set(["head_coach", "chairman", "finance", "user"]);

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

router.get("/", async (request, response) => {
  try {
    const database = await getDatabase();
    const users = await database
      .collection("users")
      .find(
        { isActive: true },
        { projection: { firstName: 1, lastName: 1, telephone: 1, phone: 1, email: 1, role: 1 } },
      )
      .sort({ lastName: 1, firstName: 1 })
      .limit(500)
      .toArray();

    const members = users.map((user) => ({
      ...publicMember(user),
      ...(request.authenticatedUser.role === "admin" ? { role: normalizedRole(user.role) } : {}),
    }));
    response.json({ members });
  } catch (error) {
    console.error("Unable to list members:", error);
    response.status(503).json({ error: "Member directory is temporarily unavailable." });
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
