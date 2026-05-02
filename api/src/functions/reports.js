const { app } = require('@azure/functions');

let reports = [];

app.http('reports', {
    methods: ['GET', 'POST'],
    authLevel: 'anonymous',

    handler: async (request, context) => {
        context.log("Reports API triggered");

        if (request.method === 'POST') {
            const body = await request.json();

            const report = {
                id: Date.now(),
                title: body.title,
                description: body.description,
                latitude: body.latitude,
                longitude: body.longitude
            };

            reports.push(report);

            return {
                status: 200,
                jsonBody: {
                    message: "Report created",
                    report
                }
            };
        }

        if (request.method === 'GET') {
            return {
                status: 200,
                jsonBody: {
                    message: "Reports fetched",
                    reports
                }
            };
        }

        return {
            status: 400,
            body: "Invalid request"
        };
    }
});