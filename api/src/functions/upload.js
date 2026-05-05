const { app } = require("@azure/functions");
const { BlobServiceClient } = require("@azure/storage-blob");

const blobServiceClient = BlobServiceClient.fromConnectionString(
    process.env.AZURE_STORAGE_CONNECTION_STRING
);

const containerName = process.env.BLOB_CONTAINER_NAME;

app.http("upload", {
    methods: ["POST"],
    authLevel: "anonymous",
    route: "upload",

    handler: async (request, context) => {
        try {
            const body = await request.json();

            const { fileName, contentType, base64Data } = body;

            if (!fileName || !contentType || !base64Data) {
                return {
                    status: 400,
                    jsonBody: {
                        message: "fileName, contentType and base64Data are required"
                    }
                };
            }

            const cleanBase64 = base64Data.includes(",")
                ? base64Data.split(",")[1]
                : base64Data;

            const buffer = Buffer.from(cleanBase64, "base64");

            const containerClient = blobServiceClient.getContainerClient(containerName);
            await containerClient.createIfNotExists({
                access: "blob"
            });

            const safeFileName = `${Date.now()}-${fileName.replace(/\s+/g, "-")}`;
            const blockBlobClient = containerClient.getBlockBlobClient(safeFileName);

            await blockBlobClient.uploadData(buffer, {
                blobHTTPHeaders: {
                    blobContentType: contentType
                }
            });

            return {
                status: 201,
                jsonBody: {
                    message: "File uploaded successfully",
                    fileName: safeFileName,
                    imageUrl: blockBlobClient.url
                }
            };

        } catch (error) {
            context.error(error);

            return {
                status: 500,
                jsonBody: {
                    message: "Upload failed",
                    error: error.message
                }
            };
        }
    }
});