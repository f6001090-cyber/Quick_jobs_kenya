const fs = require("fs");

const file = "server.js";
let code = fs.readFileSync(file, "utf8");

if (code.includes("QJK HIRING API START")) {
    console.log("Hiring API is already installed.");
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
// QJK HIRING API START
// ================================

// CLIENT HIRES A WORKER
app.post("/api/hire", authenticate, (req, res) => {

    try {

        if (req.user.role !== "client") {
            return res.status(403).json({
                success: false,
                message: "Only clients can hire workers."
            });
        }

        const applicationId =
            Number(req.body.application_id);

        if (!Number.isInteger(applicationId)) {
            return res.status(400).json({
                success: false,
                message: "Invalid application ID."
            });
        }

        const applicationResult = db.exec(
            \`
            SELECT
                applications.id,
                applications.job_id,
                applications.worker_id,
                applications.status,
                jobs.client_id,
                jobs.status,
                jobs.hired_worker_id
            FROM applications
            JOIN jobs
                ON jobs.id = applications.job_id
            WHERE applications.id = ?
            \`,
            [applicationId]
        );

        if (
            applicationResult.length === 0 ||
            applicationResult[0].values.length === 0
        ) {
            return res.status(404).json({
                success: false,
                message: "Application not found."
            });
        }

        const row =
            applicationResult[0].values[0];

        const jobId = row[1];
        const workerId = row[2];
        const applicationStatus = row[3];
        const clientId = row[4];
        const jobStatus = row[5];
        const hiredWorkerId = row[6];

        if (clientId !== req.user.id) {
            return res.status(403).json({
                success: false,
                message: "You do not own this job."
            });
        }

        if (jobStatus !== "open") {
            return res.status(400).json({
                success: false,
                message: "This job has already been assigned."
            });
        }

        if (hiredWorkerId !== null) {
            return res.status(400).json({
                success: false,
                message: "A worker has already been hired."
            });
        }

        if (applicationStatus !== "pending") {
            return res.status(400).json({
                success: false,
                message: "This application is no longer pending."
            });
        }

        // Assign worker to the job
        db.run(
            \`
            UPDATE jobs
            SET
                status = 'assigned',
                hired_worker_id = ?
            WHERE id = ?
            \`,
            [workerId, jobId]
        );

        // Mark selected application as hired
        db.run(
            \`
            UPDATE applications
            SET status = 'hired'
            WHERE id = ?
            \`,
            [applicationId]
        );

        // Reject all other pending applications
        db.run(
            \`
            UPDATE applications
            SET status = 'rejected'
            WHERE job_id = ?
            AND id != ?
            AND status = 'pending'
            \`,
            [jobId, applicationId]
        );

        saveDatabase();

        res.json({
            success: true,
            message: "Worker hired successfully.",
            job_id: jobId,
            worker_id: workerId
        });

    } catch (error) {

        console.error("HIRING ERROR:", error);

        res.status(500).json({
            success: false,
            message: "Could not hire worker."
        });

    }

});


// ================================
// QJK HIRING API END
// ================================

`;

code =
    code.replace(
        marker,
        routes + marker
    );

fs.writeFileSync(file, code);

console.log("");
console.log("=================================");
console.log("      QUICK JOBS KENYA");
console.log("=================================");
console.log("Hiring API installed successfully.");
console.log("=================================");
console.log("");
