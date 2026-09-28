const fs = require("fs");

const file = "server.js";
let s = fs.readFileSync(file, "utf8");

if (s.includes("QJK CLIENT JOBS API START")) {
    console.log("Client jobs API already installed.");
    process.exit(0);
}

const marker = "// QJK MY JOBS API START";

const api = `
// ================================
// QJK CLIENT JOBS API START
// ================================

app.get("/api/client-jobs", authenticate, (req, res) => {
    try {
        if (req.user.role !== "client") {
            return res.status(403).json({
                success: false,
                message: "Client access required."
            });
        }

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
            WHERE client_id = ?
            ORDER BY id DESC
        \`, [req.user.id]);

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
        console.error("CLIENT JOBS ERROR:", error);

        res.status(500).json({
            success: false,
            message: "Unable to load client jobs."
        });
    }
});

// ================================
// QJK CLIENT JOBS API END
// ================================

`;

if (!s.includes(marker)) {
    console.error("Could not find insertion point.");
    process.exit(1);
}

s = s.replace(marker, api + "\\n" + marker);

fs.writeFileSync(file, s);

console.log("Client jobs API installed successfully.");
