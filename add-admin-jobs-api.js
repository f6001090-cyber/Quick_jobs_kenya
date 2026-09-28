const fs = require("fs");

const file = "server.js";
let s = fs.readFileSync(file, "utf8");

if (s.includes("/api/admin/jobs")) {
    console.log("ADMIN JOBS API ALREADY EXISTS");
    process.exit(0);
}

const marker = "// ================================\n// END ADMIN USER MANAGEMENT";

const code = `

// ================================
// ADMIN JOB MANAGEMENT
// ================================

// VIEW ALL JOBS
app.get("/api/admin/jobs", authenticate, (req, res) => {

    try {

        if (req.user.role !== "admin") {
            return res.status(403).json({
                success: false,
                message: "Admin access required."
            });
        }

        const result = db.exec(\`
            SELECT
                jobs.id,
                jobs.title,
                jobs.description,
                jobs.category,
                jobs.budget,
                jobs.status,
                jobs.client_id,
                client.full_name,
                jobs.hired_worker_id,
                worker.full_name,
                jobs.created_at
            FROM jobs
            LEFT JOIN users AS client
                ON client.id = jobs.client_id
            LEFT JOIN users AS worker
                ON worker.id = jobs.hired_worker_id
            ORDER BY jobs.id DESC
        \`);

        const jobs =
            result.length > 0
                ? result[0].values.map(row => ({
                    id: row[0],
                    title: row[1],
                    description: row[2],
                    category: row[3],
                    budget: row[4],
                    status: row[5],
                    client_id: row[6],
                    client_name: row[7],
                    hired_worker_id: row[8],
                    worker_name: row[9],
                    created_at: row[10]
                }))
                : [];

        res.json({
            success: true,
            jobs
        });

    } catch (error) {

        console.error("ADMIN JOBS ERROR:", error);

        res.status(500).json({
            success: false,
            message: "Unable to load jobs."
        });
    }
});


// DELETE JOB
app.delete("/api/admin/jobs/:id", authenticate, (req, res) => {

    try {

        if (req.user.role !== "admin") {
            return res.status(403).json({
                success: false,
                message: "Admin access required."
            });
        }

        const jobId = Number(req.params.id);

        if (!Number.isInteger(jobId)) {
            return res.status(400).json({
                success: false,
                message: "Invalid job ID."
            });
        }

        const result = db.exec(
            \`
            SELECT id
            FROM jobs
            WHERE id = ?
            \`,
            [jobId]
        );

        if (
            result.length === 0 ||
            result[0].values.length === 0
        ) {
            return res.status(404).json({
                success: false,
                message: "Job not found."
            });
        }

        db.run(
            "DELETE FROM applications WHERE job_id = ?",
            [jobId]
        );

        db.run(
            "DELETE FROM jobs WHERE id = ?",
            [jobId]
        );

        saveDatabase();

        res.json({
            success: true,
            message: "Job deleted successfully."
        });

    } catch (error) {

        console.error("DELETE JOB ERROR:", error);

        res.status(500).json({
            success: false,
            message: "Unable to delete job."
        });
    }
});

// ================================
// END ADMIN JOB MANAGEMENT
// ================================
`;

if (!s.includes(marker)) {
    console.log("MARKER NOT FOUND");
    process.exit(1);
}

s = s.replace(marker, marker + code);

fs.writeFileSync(file, s);

console.log("ADMIN JOBS API ADDED");
