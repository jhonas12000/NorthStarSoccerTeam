import { MongoClient, ServerApiVersion } from "mongodb";

let client;
let databasePromise;

function requiredMongoUri() {
  const uri = process.env.MONGODB_URI;

  if (!uri) {
    throw new Error("MONGODB_URI is not set. Add it to your .env file.");
  }

  return uri;
}

export async function getDatabase() {
  if (!databasePromise) {
    client = new MongoClient(requiredMongoUri(), {
      serverApi: {
        version: ServerApiVersion.v1,
        strict: true,
        deprecationErrors: true,
      },
    });

    databasePromise = client
      .connect()
      .then(async (connectedClient) => {
        const database = connectedClient.db(
          process.env.MONGODB_DATABASE || "northstar_soccer_team",
        );

        await database.command({ ping: 1 });
        return database;
      })
      .catch((error) => {
        databasePromise = undefined;
        client = undefined;
        throw error;
      });
  }

  return databasePromise;
}

export async function getDatabaseStatus() {
  try {
    const database = await getDatabase();
    await database.command({ ping: 1 });
    return { connected: true, name: database.databaseName };
  } catch (error) {
    return {
      connected: false,
      error: error instanceof Error ? error.message : "Database connection failed",
    };
  }
}

export async function closeDatabase() {
  if (client) {
    await client.close();
  }

  client = undefined;
  databasePromise = undefined;
}
