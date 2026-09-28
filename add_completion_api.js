const fs = require("fs");

const file = "server.js";
let code = fs.readFileSync(file, "utf8");

if (code.includes("QJK COMPLETION API START")) {
    console.log("Completion API is already installed.");
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
// QJK COMPLETION API START
// ================================

// WORKER MARKS ASSIGNED JOB AS COMPLETED
app.post("/api/jobs/:jobId/complete", authenticate, (req, res) => {

    try {

        if (req.user.role !== "worker") {
            return res.status(403).json({
                success: false,
                message: "Only workers can complete jobs."
            });
        }

        const jobId = Number(req.params.jobId);

        if (!Number.isInteger(jobId)) {
            return res.status(400).json({
                success: false,
                message: "Invalid job ID."
            });
        }

        const result = db.exec(
            \`
            SELECT
                id,
                client_id,
                title,
                budget,
                status,
                hired_worker_id
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

        const job = result[0].values[0];

        const clientId = job[1];
        const title = job[2];
        const budget = Number(job[3]);
        const status = job[4];
        const hiredWorkerId = job[5];

        if (hiredWorkerId !== req.user.id) {
            return res.status(403).json({
                success: false,
                message: "You are not the worker assigned to this job."
            });
        }

        if (status !== "assigned") {
            return res.status(400).json({
                success: false,
                message: "This job cannot be completed in its current state."
            });
        }

        db.run(
            \`
            UPDATE jobs
            SET status = 'completed'
            WHERE id = ?
            AND hired_worker_id = ?
            AND status = 'assigned'
            \`,
            [jobId, req.user.id]
        );

        saveDatabase();

        res.json({
            success: true,
            message: "Job marked as completed. Waiting for client confirmation.",
            job_id: jobId
        });

    } catch (error) {

        console.error("COMPLETE JOB ERROR:", error);

        res.status(500).json({
            success: false,
            message: "Could not complete job."
        });

    }

});


// CLIENT CONFIRMS JOB AND PAYS WORKER
app.post("/api/jobs/:jobId/confirm", authenticate, (req, res) => {

    try {

        if (req.user.role !== "client") {
            return res.status(403).json({
                success: false,
                message: "Only the client can confirm the job."
            });
        }

        const jobId = Number(req.params.jobId);

        if (!Number.isInteger(jobId)) {
            return res.status(400).json({
                success: false,
                message: "Invalid job ID."
            });
        }

        const result = db.exec(
            \`
            SELECT
                id,
                client_id,
                title,
                budget,
                status,
                hired_worker_id
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

        const job = result[0].values[0];

        const clientId = job[1];
        const title = job[2];
        const budget = Number(job[3]);
        const status = job[4];
        const workerId = job[5];

        if (clientId !== req.user.id) {
            return res.status(403).json({
                success: false,
                message: "You do not own this job."
            });
        }

        if (status !== "completed") {
            return res.status(400).json({
                success: false,
                message: "The worker has not marked this job as completed."
            });
        }

        if (!workerId) {
            return res.status(400).json({
                success: false,
                message: "No worker is assigned to this job."
            });
        }

        if (!Number.isFinite(budget) || budget <= 0) {
            return res.status(400).json({
                success: false,
                message: "Invalid job budget."
            });
        }

        // 10% platform fee
        const workerFee =
            Math.round(budget * 0.10 * 100) / 100;

        const workerNet =
            Math.round((budget - workerFee) * 100) / 100;

        // Make sure this job has not already paid
        const existingPayment = db.exec(
            \`
            SELECT id
            FROM transactions
            WHERE reference = ?
            \`,
            ["JOB-" + jobId]
        );

        if (
            existingPayment.length > 0 &&
            existingPayment[0].values.length > 0
        ) {
            return res.status(409).json({
                success: false,
                message: "This job has already been paid."
            });
        }

        // Add worker earnings
        db.run(
            \`
            UPDATE users
            SET wallet_balance =
                wallet_balance + ?
            WHERE id = ?
            \`,
            [workerNet, workerId]
        );

        // Record worker transaction
        db.run(
            \`
            INSERT INTO transactions
            (
                user_id,
                type,
                amount,
                reference,
                description,
                status
            )
            VALUES (?, 'job_earning', ?, ?, ?, 'completed')
            \`,
            [
                workerId,
                workerNet,
                "JOB-" + jobId,
                "Earnings for completed job: " + title
            ]
        );

        // Mark job paid
        db.run(
            \`
            UPDATE jobs
            SET status = 'paid'
            WHERE id = ?
            AND status = 'completed'
            \`,
            [jobId]
        );

        saveDatabase();

        res.json({
            success: true,
            message: "Job confirmed and worker paid.",
            job_id: jobId,
            gross_amount: budget,
            platform_fee: workerFee,
            worker_earnings: workerNet
        });

    } catch (error) {

        console.error("CONFIRM JOB ERROR:", error);

        res.status(500).json({
            success: false,
            message: "Could not confirm payment."
        });

    }

});


// ================================
// QJK COMPLETION API END
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
console.log("Completion & payment API installed.");
console.log("Worker fee: 10%");
console.log("Double-payment protection: ON");
console.log("=================================");
console.log("");
