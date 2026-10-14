import { Router } from "express";
import { ObjectId } from "mongodb";
import { getDatabase } from "../database.js";

const router = Router();
const allowedRoles = new Set(["player", "coach", "staff", "supporter"]);

function cleanText(value) {
  return typeof value === "string" ? value.trim() : "";
}

function memberFromRequest(body) {
  const firstName = cleanText(body.firstName);
  const lastName = cleanText(body.lastName);
  const email = cleanText(body.email).toLowerCase();
  const role = cleanText(body.role).toLowerCase();
  const errors = [];

  if (!firstName) errors.push("firstName is required");
  if (!lastName) errors.push("lastName is required");
  if (!/^\S+@\S+\.\S+$/.test(email)) errors.push("email must be valid");
  if (!allowedRoles.has(role)) {
    errors.push(`role must be one of: ${[...allowedRoles].join(", ")}`);
  }

  return {
    errors,
    member: { firstName, lastName, email, role },
  };
}

router.get("/", async (_request, response) => {
  try {
    const database = await getDatabase();
    const members = await database
      .collection("members")
      .find({})
      .sort({ createdAt: -1 })
      .limit(100)
      .toArray();

    response.json({ members });
  } catch (error) {
    console.error("Unable to list members:", error);
    response.status(503).json({ error: "Database is unavailable" });
  }
});

router.get("/:id", async (request, response) => {
  if (!ObjectId.isValid(request.params.id)) {
    return response.status(400).json({ error: "Invalid member ID" });
  }

  try {
    const database = await getDatabase();
    const member = await database
      .collection("members")
      .findOne({ _id: new ObjectId(request.params.id) });

    if (!member) return response.status(404).json({ error: "Member not found" });
    response.json({ member });
  } catch (error) {
    console.error("Unable to get member:", error);
    response.status(503).json({ error: "Database is unavailable" });
  }
});

router.post("/", async (request, response) => {
  const { errors, member } = memberFromRequest(request.body ?? {});
  if (errors.length) return response.status(400).json({ errors });

  try {
    const database = await getDatabase();
    const members = database.collection("members");
    await members.createIndex({ email: 1 }, { unique: true });

    const document = {
      ...member,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    const result = await members.insertOne(document);

    response.status(201).json({ member: { _id: result.insertedId, ...document } });
  } catch (error) {
    if (error?.code === 11000) {
      return response.status(409).json({ error: "A member with this email already exists" });
    }

    console.error("Unable to create member:", error);
    response.status(503).json({ error: "Database is unavailable" });
  }
});

export default router;
