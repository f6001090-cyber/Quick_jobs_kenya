const fs = require("fs");

const file = "server.js";
let code = fs.readFileSync(file, "utf8");

if (code.includes("QJK COMPLETION API START")) {
    console.log("Completion API is already installed.");
    process.exit(0);
}

const marker = "// START SERVER";

const position = code.indexOf(marker);

if (position === -1) {
    console.error("START SERVER marker was not found.");
    process.exit(1);
}

const routes = `

// ================================
// QJK COMPLETION API START
// ================================

// WORKER MARKS JOB COMPLETED
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

        const title = job[1];
        const status = job[3];
        const hiredWorkerId = job[4];

        if (hiredWorkerId !== req.user.id) {
            return res.status(403).json({
                success: false,
                message: "You are not assigned to this job."
            });
        }

        if (status !== "assigned") {
            return res.status(400).json({
                success: false,
                message: "This job is not currently assigned."
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
            job_id: jobId,
            title
        });

    } catch (error) {

        console.error("COMPLETE JOB ERROR:", error);

        res.status(500).json({
            success: false,
            message: "Could not complete job."
        });

    }

});


// CLIENT CONFIRMS AND PAYS WORKER
app.post("/api/jobs/:jobId/confirm", authenticate, (req, res) => {

    try {

        if (req.user.role !== "client") {
            return res.status(403).json({
                success: false,
                message: "Only clients can confirm jobs."
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
                message: "Worker has not completed this job."
            });
        }

        if (!workerId) {
            return res.status(400).json({
                success: false,
                message: "No worker is assigned."
            });
        }

        if (!Number.isFinite(budget) || budget <= 0) {
            return res.status(400).json({
                success: false,
                message: "Invalid job budget."
            });
        }

        const reference =
            "JOB-" + jobId;

        // Prevent double payment
        const existing = db.exec(
            \`
            SELECT id
            FROM transactions
            WHERE reference = ?
            \`,
            [reference]
        );

        if (
            existing.length > 0 &&
            existing[0].values.length > 0
        ) {
            return res.status(409).json({
                success: false,
                message: "This job has already been paid."
            });
        }

        // 10% platform fee
        const platformFee =
            Math.round(budget * 0.10 * 100) / 100;

        const workerEarnings =
            Math.round(
                (budget - platformFee) * 100
            ) / 100;

        // Add money to worker wallet
        db.run(
            \`
            UPDATE users
            SET wallet_balance =
                wallet_balance + ?
            WHERE id = ?
            \`,
            [workerEarnings, workerId]
        );

        // Record transaction
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
                workerEarnings,
                reference,
                "Earnings for completed job: " + title
            ]
        );

        // Mark job as paid
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
            message: "Worker paid successfully.",
            gross_amount: budget,
            platform_fee: platformFee,
            worker_earnings: workerEarnings
        });

    } catch (error) {

        console.error("CONFIRM PAYMENT ERROR:", error);

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
    code.slice(0, position) +
    routes +
    "\n" +
    code.slice(position);

fs.writeFileSync(file, code);

console.log("");
console.log("=================================");
console.log("      QUICK JOBS KENYA");
console.log("=================================");
console.log("Completion API installed.");
console.log("Worker fee: 10%");
console.log("Double-payment protection: ON");
console.log("=================================");
console.log("");
