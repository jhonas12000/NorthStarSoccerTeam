import "dotenv/config";
import bcrypt from "bcrypt";
import { createInterface, emitKeypressEvents } from "node:readline";
import { stdin, stdout } from "node:process";
import { closeDatabase, getDatabase } from "../database.js";

function ask(question) {
  const readline = createInterface({ input: stdin, output: stdout });
  return new Promise((resolve) => {
    readline.question(question, (answer) => {
      readline.close();
      resolve(answer.trim());
    });
  });
}

function askForPassword(prompt) {
  if (!stdin.isTTY) {
    throw new Error("Admin creation must be run in an interactive terminal.");
  }

  stdout.write(prompt);
  emitKeypressEvents(stdin);
  stdin.setRawMode(true);
  stdin.resume();

  return new Promise((resolve, reject) => {
    let password = "";

    function finish() {
      stdin.setRawMode(false);
      stdin.pause();
      stdin.off("keypress", onKeypress);
      stdout.write("\n");
      resolve(password);
    }

    function onKeypress(character, key) {
      if (key?.ctrl && key.name === "c") {
        stdin.setRawMode(false);
        stdin.pause();
        stdout.write("\n");
        reject(new Error("Admin creation cancelled."));
        return;
      }

      if (key?.name === "return" || key?.name === "enter") {
        finish();
      } else if (key?.name === "backspace") {
        if (password.length) {
          password = password.slice(0, -1);
          stdout.write("\b \b");
        }
      } else if (character && !key?.ctrl && !key?.meta) {
        password += character;
        stdout.write("*");
      }
    }

    stdin.on("keypress", onKeypress);
  });
}

async function createAdmin() {
  const database = await getDatabase();
  const users = database.collection("users");

  const existingAdmin = await users.findOne({ role: "admin" });
  if (existingAdmin) {
    throw new Error("An administrator already exists. No account was created.");
  }

  const firstName = await ask("First name: ");
  const lastName = await ask("Last name: ");
  const email = (await ask("Email address: ")).toLowerCase();

  if (!firstName || !lastName) throw new Error("First and last name are required.");
  if (!/^\S+@\S+\.\S+$/.test(email)) throw new Error("Enter a valid email address.");

  const existingUser = await users.findOne({ email });
  if (existingUser) throw new Error("A user with that email address already exists.");

  const password = await askForPassword("Password (12 characters minimum): ");
  const confirmation = await askForPassword("Confirm password: ");

  if (password.length < 12) throw new Error("Password must contain at least 12 characters.");
  if (password !== confirmation) throw new Error("The passwords do not match.");

  const now = new Date();
  await users.createIndex({ email: 1 }, { unique: true });
  const result = await users.insertOne({
    firstName,
    lastName,
    email,
    passwordHash: await bcrypt.hash(password, 12),
    role: "admin",
    isActive: true,
    createdAt: now,
    updatedAt: now,
  });

  console.log(`Administrator created successfully (${result.insertedId}).`);
}

try {
  await createAdmin();
} catch (error) {
  console.error(error instanceof Error ? error.message : "Unable to create administrator.");
  process.exitCode = 1;
} finally {
  await closeDatabase();
}
