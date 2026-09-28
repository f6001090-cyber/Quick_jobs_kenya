const fs = require("fs");

const file = "server.js";
let code = fs.readFileSync(file, "utf8");

if (code.includes("QJK APPLICATION API START")) {
    console.log("Application API is already installed.");
    process.exit(0);
}

const marker = `// ================================
// START SERVER
// ================================`;

if (!code.includes(marker)) {
    console.error("Could not find the server insertion point.");
    process.exit(1);
}

const routes = `

// ================================
// QJK APPLICATION API START
// ================================

app.post("/api/applications", authenticate, (req, res) => {

    try {

        if (req.user.role !== "worker") {
            return res.status(403).json({
                success: false,
                message: "Only worker accounts can apply for jobs."
            });
        }

        const jobId = Number(req.body.job_id);
        const message = (req.body.message || "").trim();

        if (!Number.isInteger(jobId)) {
            return res.status(400).json({
                success: false,
                message: "Invalid job ID."
            });
        }

        const jobResult = db.exec(
            \`
            SELECT id, client_id, title, budget, status
            FROM jobs
            WHERE id = ?
            \`,
            [jobId]
        );

        if (
            jobResult.length === 0 ||
            jobResult[0].values.length === 0
        ) {
            return res.status(404).json({
                success: false,
                message: "Job not found."
            });
        }

        const job = jobResult[0].values[0];

        if (job[4] !== "open") {
            return res.status(400).json({
                success: false,
                message: "This job is no longer accepting applications."
            });
        }

        const existing = db.exec(
            \`
            SELECT id
            FROM applications
            WHERE job_id = ?
            AND worker_id = ?
            \`,
            [jobId, req.user.id]
        );

        if (
            existing.length > 0 &&
            existing[0].values.length > 0
        ) {
            return res.status(409).json({
                success: false,
                message: "You have already applied for this job."
            });
        }

        db.run(
            \`
            INSERT INTO applications
            (
                job_id,
                worker_id,
                message,
                status
            )
            VALUES (?, ?, ?, 'pending')
            \`,
            [
                jobId,
                req.user.id,
                message
            ]
        );

        saveDatabase();

        res.status(201).json({
            success: true,
            message: "Application submitted successfully."
        });

    } catch (error) {

        console.error("APPLICATION ERROR:", error);

        res.status(500).json({
            success: false,
            message: "Could not submit application."
        });

    }

});


// WORKER APPLICATIONS

app.get("/api/my-applications", authenticate, (req, res) => {

    try {

        if (req.user.role !== "worker") {
            return res.status(403).json({
                success: false,
                message: "Only workers can view applications."
            });
        }

        const result = db.exec(
            \`
            SELECT
                applications.id,
                applications.job_id,
                applications.message,
                applications.status,
                applications.created_at,
                jobs.title,
                jobs.budget
            FROM applications
            JOIN jobs
                ON jobs.id = applications.job_id
            WHERE applications.worker_id = ?
            ORDER BY applications.id DESC
            \`,
            [req.user.id]
        );

        let applications = [];

        if (result.length > 0) {

            applications = result[0].values.map(row => ({
                id: row[0],
                job_id: row[1],
                message: row[2],
                status: row[3],
                created_at: row[4],
                job_title: row[5],
                budget: row[6]
            }));

        }

        res.json({
            success: true,
            applications
        });

    } catch (error) {

        console.error("MY APPLICATIONS ERROR:", error);

        res.status(500).json({
            success: false,
            message: "Could not load applications."
        });

    }

});


// CLIENT VIEW APPLICATIONS

app.get("/api/job-applications/:jobId", authenticate, (req, res) => {

    try {

        if (req.user.role !== "client") {
            return res.status(403).json({
                success: false,
                message: "Only clients can view applicants."
            });
        }

        const jobId = Number(req.params.jobId);

        const jobResult = db.exec(
            \`
            SELECT client_id
            FROM jobs
            WHERE id = ?
            \`,
            [jobId]
        );

        if (
            jobResult.length === 0 ||
            jobResult[0].values.length === 0
        ) {
            return res.status(404).json({
                success: false,
                message: "Job not found."
            });
        }

        if (jobResult[0].values[0][0] !== req.user.id) {
            return res.status(403).json({
                success: false,
                message: "You do not own this job."
            });
        }

        const result = db.exec(
            \`
            SELECT
                applications.id,
                applications.worker_id,
                applications.message,
                applications.status,
                applications.created_at,
                users.full_name,
                users.phone
            FROM applications
            JOIN users
                ON users.id = applications.worker_id
            WHERE applications.job_id = ?
            ORDER BY applications.id DESC
            \`,
            [jobId]
        );

        let applications = [];

        if (result.length > 0) {

            applications = result[0].values.map(row => ({
                id: row[0],
                worker_id: row[1],
                message: row[2],
                status: row[3],
                created_at: row[4],
                worker_name: row[5],
                worker_phone: row[6]
            }));

        }

        res.json({
            success: true,
            applications
        });

    } catch (error) {

        console.error("JOB APPLICATIONS ERROR:", error);

        res.status(500).json({
            success: false,
            message: "Could not load applicants."
        });

    }

});


// ================================
// QJK APPLICATION API END
// ================================

`;

code = code.replace(marker, routes + marker);

fs.writeFileSync(file, code);

console.log("Application API installed successfully.");
