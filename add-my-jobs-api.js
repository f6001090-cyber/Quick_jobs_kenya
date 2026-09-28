const fs = require("fs");

const file = "server.js";
let code = fs.readFileSync(file, "utf8");

const marker = "// START SERVER";

if (code.includes("// QJK MY JOBS API START")) {
    console.log("My Jobs API is already installed.");
    process.exit(0);
}

const insert = `
// QJK MY JOBS API START

app.get("/api/my-jobs", authenticate, (req, res) => {
    try {
        const workerId = req.user.id;

        const result = db.exec(\`
            SELECT
                id,
                client_id,
                title,
                description,
                category,
                budget,
                status,
                hired_worker_id,
                created_at
            FROM jobs
            WHERE hired_worker_id = ?
            ORDER BY id DESC
        \`, [workerId]);

        const jobs = result.length > 0
            ? result[0].values.map(row => ({
                id: row[0],
                client_id: row[1],
                title: row[2],
                description: row[3],
                category: row[4],
                budget: row[5],
                status: row[6],
                hired_worker_id: row[7],
                created_at: row[8]
            }))
            : [];

        res.json({
            success: true,
            jobs
        });

    } catch (error) {
        console.error("MY JOBS ERROR:", error);

        res.status(500).json({
            success: false,
            message: "Failed to load your jobs."
        });
    }
});

// QJK MY JOBS API END

`;

if (!code.includes(marker)) {
    console.log("START SERVER marker not found.");
    process.exit(1);
}

code = code.replace(marker, insert + marker);

fs.writeFileSync(file, code);

console.log("My Jobs API installed successfully.");
