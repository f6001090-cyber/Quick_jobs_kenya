const fs = require("fs");

const file = "server.js";

let code = fs.readFileSync(file, "utf8");

if (code.includes("QJK JOB API START")) {
    console.log("Job API is already installed.");
    process.exit(0);
}

const marker = "// ================================\n// START SERVER\n// ================================";

const jobRoutes = `

// ================================
// QJK JOB API START
// ================================

// CREATE JOB
app.post("/api/jobs", authenticate, (req, res) => {

    try {

        if (req.user.role !== "client") {
            return res.status(403).json({
                success: false,
                message: "Only client accounts can post jobs."
            });
        }

        const {
            title,
            description,
            category,
            budget
        } = req.body;

        if (!title || !description || !budget) {
            return res.status(400).json({
                success: false,
                message: "Title, description and budget are required."
            });
        }

        const amount = Number(budget);

        if (!Number.isFinite(amount) || amount <= 0) {
            return res.status(400).json({
                success: false,
                message: "Enter a valid job budget."
            });
        }

        db.run(
            \`
            INSERT INTO jobs
            (
                client_id,
                title,
                description,
                category,
                budget
            )
            VALUES (?, ?, ?, ?, ?)
            \`,
            [
                req.user.id,
                title.trim(),
                description.trim(),
                category ? category.trim() : null,
                amount
            ]
        );

        saveDatabase();

        const result = db.exec(
            \`
            SELECT
                id,
                client_id,
                title,
                description,
                category,
                budget,
                status,
                created_at
            FROM jobs
            WHERE client_id = ?
            ORDER BY id DESC
            LIMIT 1
            \`,
            [req.user.id]
        );

        const row = result[0].values[0];

        res.status(201).json({
            success: true,
            message: "Job posted successfully.",
            job: {
                id: row[0],
                client_id: row[1],
                title: row[2],
                description: row[3],
                category: row[4],
                budget: row[5],
                status: row[6],
                created_at: row[7]
            }
        });

    } catch (error) {

        console.error("CREATE JOB ERROR:", error);

        res.status(500).json({
            success: false,
            message: "Could not create job."
        });
    }
});


// GET OPEN JOBS
app.get("/api/jobs", authenticate, (req, res) => {

    try {

        const result = db.exec(
            \`
            SELECT
                jobs.id,
                jobs.title,
                jobs.description,
                jobs.category,
                jobs.budget,
                jobs.status,
                jobs.created_at,
                users.full_name AS client_name
            FROM jobs
            JOIN users
                ON users.id = jobs.client_id
            WHERE jobs.status = 'open'
            ORDER BY jobs.id DESC
            \`
        );

        let jobs = [];

        if (result.length > 0) {

            jobs = result[0].values.map(row => ({
                id: row[0],
                title: row[1],
                description: row[2],
                category: row[3],
                budget: row[4],
                status: row[5],
                created_at: row[6],
                client_name: row[7]
            }));

        }

        res.json({
            success: true,
            jobs
        });

    } catch (error) {

        console.error("GET JOBS ERROR:", error);

        res.status(500).json({
            success: false,
            message: "Could not load jobs."
        });
    }
});


// GET ONE JOB
app.get("/api/jobs/:id", authenticate, (req, res) => {

    try {

        const jobId = Number(req.params.id);

        if (!Number.isInteger(jobId)) {
            return res.status(400).json({
                success: false,
                message: "Invalid job ID."
            });
        }

        const result = db.exec(
            \`
            SELECT
                jobs.id,
                jobs.client_id,
                jobs.title,
                jobs.description,
                jobs.category,
                jobs.budget,
                jobs.status,
                jobs.hired_worker_id,
                jobs.created_at,
                users.full_name AS client_name
            FROM jobs
            JOIN users
                ON users.id = jobs.client_id
            WHERE jobs.id = ?
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

        const row = result[0].values[0];

        res.json({
            success: true,
            job: {
                id: row[0],
                client_id: row[1],
                title: row[2],
                description: row[3],
                category: row[4],
                budget: row[5],
                status: row[6],
                hired_worker_id: row[7],
                created_at: row[8],
                client_name: row[9]
            }
        });

    } catch (error) {

        console.error("GET JOB ERROR:", error);

        res.status(500).json({
            success: false,
            message: "Could not load job."
        });
    }
});


// CLIENT'S JOBS
app.get("/api/my-jobs", authenticate, (req, res) => {

    try {

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
            ORDER BY id DESC
            \`,
            [req.user.id]
        );

        let jobs = [];

        if (result.length > 0) {

            jobs = result[0].values.map(row => ({
                id: row[0],
                title: row[1],
                description: row[2],
                category: row[3],
                budget: row[4],
                status: row[5],
                hired_worker_id: row[6],
                created_at: row[7]
            }));

        }

        res.json({
            success: true,
            jobs
        });

    } catch (error) {

        console.error("MY JOBS ERROR:", error);

        res.status(500).json({
            success: false,
            message: "Could not load your jobs."
        });
    }
});


// ================================
// QJK JOB API END
// ================================

`;

if (!code.includes(marker)) {
    console.error("Could not find the server insertion point.");
    process.exit(1);
}

code = code.replace(marker, jobRoutes + marker);

fs.writeFileSync(file, code);

console.log("");
console.log("=================================");
console.log("      QUICK JOBS KENYA");
console.log("=================================");
console.log("Job API installed successfully.");
console.log("Added:");
console.log("- Create jobs");
console.log("- View open jobs");
console.log("- View individual jobs");
console.log("- View client's jobs");
console.log("=================================");
console.log("");
