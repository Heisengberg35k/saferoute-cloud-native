const { app } = require("@azure/functions");
const { CosmosClient } = require("@azure/cosmos");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");

const client = new CosmosClient({
    connectionString: process.env.COSMOS_DB_CONNECTION_STRING
});

const database = client.database(process.env.COSMOS_DB_DATABASE_NAME);
const usersContainer = database.container(process.env.COSMOS_DB_USERS_CONTAINER_NAME);

const JWT_SECRET = process.env.JWT_SECRET;

app.http("auth", {
    methods: ["POST", "GET"],
    authLevel: "anonymous",
    route: "auth/{action?}",

    handler: async (request, context) => {
        try {
            const action = request.params.action;

            if (request.method === "POST" && action === "register") {
                const body = await request.json();

                const { name, email, password, role } = body;

                if (!name || !email || !password) {
                    return {
                        status: 400,
                        jsonBody: { message: "Name, email, and password are required" }
                    };
                }

                const allowedRoles = ["citizen", "reviewer"];
                const userRole = allowedRoles.includes(role) ? role : "citizen";

                const existingQuery = {
                    query: "SELECT * FROM c WHERE c.email = @email",
                    parameters: [
                        {
                            name: "@email",
                            value: email.toLowerCase()
                        }
                    ]
                };

                const { resources: existingUsers } = await usersContainer.items
                    .query(existingQuery)
                    .fetchAll();

                if (existingUsers.length > 0) {
                    return {
                        status: 409,
                        jsonBody: { message: "Email already registered" }
                    };
                }

                const passwordHash = await bcrypt.hash(password, 10);

                const newUser = {
                    id: crypto.randomUUID(),
                    name,
                    email: email.toLowerCase(),
                    passwordHash,
                    role: userRole,
                    createdAt: new Date().toISOString()
                };

                const { resource } = await usersContainer.items.create(newUser);

                return {
                    status: 201,
                    jsonBody: {
                        message: "User registered successfully",
                        user: {
                            id: resource.id,
                            name: resource.name,
                            email: resource.email,
                            role: resource.role
                        }
                    }
                };
            }

            if (request.method === "POST" && action === "login") {
                const body = await request.json();

                const { email, password } = body;

                if (!email || !password) {
                    return {
                        status: 400,
                        jsonBody: { message: "Email and password are required" }
                    };
                }

                const querySpec = {
                    query: "SELECT * FROM c WHERE c.email = @email",
                    parameters: [
                        {
                            name: "@email",
                            value: email.toLowerCase()
                        }
                    ]
                };

                const { resources: users } = await usersContainer.items
                    .query(querySpec)
                    .fetchAll();

                if (users.length === 0) {
                    return {
                        status: 401,
                        jsonBody: { message: "Invalid email or password" }
                    };
                }

                const user = users[0];

                const passwordMatch = await bcrypt.compare(password, user.passwordHash);

                if (!passwordMatch) {
                    return {
                        status: 401,
                        jsonBody: { message: "Invalid email or password" }
                    };
                }

                const token = jwt.sign(
                    {
                        id: user.id,
                        email: user.email,
                        role: user.role
                    },
                    JWT_SECRET,
                    { expiresIn: "2h" }
                );

                return {
                    status: 200,
                    jsonBody: {
                        message: "Login successful",
                        token,
                        user: {
                            id: user.id,
                            name: user.name,
                            email: user.email,
                            role: user.role
                        }
                    }
                };
            }

            if (request.method === "GET" && action === "profile") {
                const authHeader = request.headers.get("authorization");

                if (!authHeader || !authHeader.startsWith("Bearer ")) {
                    return {
                        status: 401,
                        jsonBody: { message: "Missing or invalid token" }
                    };
                }

                const token = authHeader.split(" ")[1];

                const decoded = jwt.verify(token, JWT_SECRET);

                return {
                    status: 200,
                    jsonBody: {
                        message: "Profile loaded",
                        user: decoded
                    }
                };
            }

            return {
                status: 404,
                jsonBody: { message: "Auth route not found" }
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