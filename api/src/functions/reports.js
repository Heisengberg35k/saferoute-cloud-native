const { app } = require("@azure/functions");
const { CosmosClient } = require("@azure/cosmos");

const client = new CosmosClient({
  connectionString: process.env.COSMOS_DB_CONNECTION_STRING
});

const database = client.database(process.env.COSMOS_DB_DATABASE_NAME);
const container = database.container(process.env.COSMOS_DB_CONTAINER_NAME);

app.http("reports", {
  methods: ["GET", "POST", "PUT", "DELETE"],
  authLevel: "anonymous",
  route: "reports/{id?}",

  handler: async (request, context) => {
    try {
      const id = request.params.id;

      // GET all reports or one report
      if (request.method === "GET") {
        if (id) {
          const { resource } = await container.item(id, id).read();

          if (!resource) {
            return {
              status: 404,
              jsonBody: { message: "Report not found" }
            };
          }

          return {
            status: 200,
            jsonBody: resource
          };
        }

        const querySpec = {
          query: "SELECT * FROM c ORDER BY c.createdAt DESC"
        };

        const { resources } = await container.items.query(querySpec).fetchAll();

        return {
          status: 200,
          jsonBody: resources
        };
      }

      // POST create report
      if (request.method === "POST") {
        const body = await request.json();

        const newReport = {
          id: crypto.randomUUID(),
          title: body.title,
          description: body.description,
          category: body.category,
          location: body.location,
          latitude: body.latitude,
          longitude: body.longitude,
          imageUrl: body.imageUrl || "",
          status: body.status || "Pending",
          createdAt: new Date().toISOString()
        };

        const { resource } = await container.items.create(newReport);

        return {
          status: 201,
          jsonBody: resource
        };
      }

      // PUT update report
      if (request.method === "PUT") {
        if (!id) {
          return {
            status: 400,
            jsonBody: { message: "Report ID is required for update" }
          };
        }

        const body = await request.json();

        const { resource: existingReport } = await container.item(id, id).read();

        if (!existingReport) {
          return {
            status: 404,
            jsonBody: { message: "Report not found" }
          };
        }

        const updatedReport = {
          ...existingReport,
          title: body.title ?? existingReport.title,
          description: body.description ?? existingReport.description,
          category: body.category ?? existingReport.category,
          location: body.location ?? existingReport.location,
          latitude: body.latitude ?? existingReport.latitude,
          longitude: body.longitude ?? existingReport.longitude,
          imageUrl: body.imageUrl ?? existingReport.imageUrl,
          status: body.status ?? existingReport.status,
          updatedAt: new Date().toISOString()
        };

        const { resource } = await container.item(id, id).replace(updatedReport);

        return {
          status: 200,
          jsonBody: resource
        };
      }

      // DELETE report
      if (request.method === "DELETE") {
        if (!id) {
          return {
            status: 400,
            jsonBody: { message: "Report ID is required for delete" }
          };
        }

        await container.item(id, id).delete();

        return {
          status: 200,
          jsonBody: { message: "Report deleted successfully", id }
        };
      }

      return {
        status: 405,
        jsonBody: { message: "Method not allowed" }
      };

    } catch (error) {
      context.error(error);

      return {
        status: 500,
        jsonBody: {
          message: "Server error",
          error: error.message
        }
      };
    }
  }
});