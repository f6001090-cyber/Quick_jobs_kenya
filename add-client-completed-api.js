const fs = require("fs");

const file = "server.js";
let code = fs.readFileSync(file, "utf8");

const marker = "// START SERVER";

if (code.includes("// QJK CLIENT COMPLETED JOBS API START")) {
    console.log("Client Completed Jobs API is already installed.");
    process.exit(0);
}

const insert = `
// QJK CLIENT COMPLETED JOBS API START

app.get("/api/client-completed-jobs", authenticate, (req, res) => {

    try {

        if (req.user.role !== "client") {
            return res.status(403).json({
                success: false,
                message: "Only clients can view completed jobs."
            });
        }

        const clientId = Number(req.user.id);

        const result = db.exec(
            \`
            SELECT
                id,
                title,
                description,
                category,
                budget,
                status,
                hired_worker_id,
                created_at
            FROM jobs
            WHERE client_id = ?
            AND status IN ('completed', 'paid')
            ORDER BY id DESC
            \`,
            [clientId]
        );

        const jobs = result.length > 0
            ? result[0].values.map(row => ({
                id: row[0],
                title: row[1],
                description: row[2],
                category: row[3],
                budget: row[4],
                status: row[5],
                hired_worker_id: row[6],
                created_at: row[7]
            }))
            : [];

        res.json({
            success: true,
            jobs
        });

    } catch (error) {

        console.error(
            "CLIENT COMPLETED JOBS ERROR:",
            error
        );

        res.status(500).json({
            success: false,
            message: "Failed to load completed jobs."
        });

    }

});

// QJK CLIENT COMPLETED JOBS API END

`;

if (!code.includes(marker)) {
    console.log("START SERVER marker not found.");
    process.exit(1);
}

code = code.replace(marker, insert + marker);

fs.writeFileSync(file, code);

console.log(
    "Client Completed Jobs API installed successfully."
);
