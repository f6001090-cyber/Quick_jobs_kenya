const fs = require("fs");

const file = "server.js";
let s = fs.readFileSync(file, "utf8");

if (s.includes("/api/admin/stats")) {
    console.log("ADMIN STATS API ALREADY EXISTS");
    process.exit(0);
}

const marker = "// ================================\n// END ADMIN JOB MANAGEMENT";

const code = `

// ================================
// ADMIN STATISTICS & REPORTS
// ================================

app.get("/api/admin/stats", authenticate, (req, res) => {

    try {

        if (req.user.role !== "admin") {
            return res.status(403).json({
                success: false,
                message: "Admin access required."
            });
        }

        const usersResult = db.exec(\`
            SELECT
                COUNT(*) AS total,
                SUM(CASE WHEN role = 'worker' THEN 1 ELSE 0 END),
                SUM(CASE WHEN role = 'client' THEN 1 ELSE 0 END),
                SUM(CASE WHEN role = 'admin' THEN 1 ELSE 0 END),
                SUM(CASE WHEN status = 'active' THEN 1 ELSE 0 END),
                SUM(CASE WHEN status = 'suspended' THEN 1 ELSE 0 END)
            FROM users
        \`);

        const jobsResult = db.exec(\`
            SELECT
                COUNT(*) AS total,
                SUM(CASE WHEN status = 'open' THEN 1 ELSE 0 END),
                SUM(CASE WHEN status = 'assigned' THEN 1 ELSE 0 END),
                SUM(CASE WHEN status = 'hired' THEN 1 ELSE 0 END),
                SUM(CASE WHEN status = 'completed' THEN 1 ELSE 0 END)
            FROM jobs
        \`);

        const walletResult = db.exec(\`
            SELECT
                COALESCE(SUM(wallet_balance), 0)
            FROM users
        \`);

        const withdrawalResult = db.exec(\`
            SELECT
                COUNT(*),
                COALESCE(
                    SUM(
                        CASE
                            WHEN status = 'pending'
                            THEN amount
                            ELSE 0
                        END
                    ),
                    0
                ),
                COALESCE(
                    SUM(
                        CASE
                            WHEN status = 'completed'
                            THEN amount
                            ELSE 0
                        END
                    ),
                    0
                ),
                SUM(
                    CASE
                        WHEN status = 'pending'
                        THEN 1
                        ELSE 0
                    END
                ),
                SUM(
                    CASE
                        WHEN status = 'completed'
                        THEN 1
                        ELSE 0
                    END
                ),
                SUM(
                    CASE
                        WHEN status = 'rejected'
                        THEN 1
                        ELSE 0
                    END
                )
            FROM withdrawals
        \`);

        const users =
            usersResult.length > 0
                ? usersResult[0].values[0]
                : [0, 0, 0, 0, 0, 0];

        const jobs =
            jobsResult.length > 0
                ? jobsResult[0].values[0]
                : [0, 0, 0, 0, 0];

        const wallet =
            walletResult.length > 0
                ? walletResult[0].values[0][0]
                : 0;

        const withdrawals =
            withdrawalResult.length > 0
                ? withdrawalResult[0].values[0]
                : [0, 0, 0, 0, 0, 0];

        res.json({
            success: true,

            users: {
                total: Number(users[0] || 0),
                workers: Number(users[1] || 0),
                clients: Number(users[2] || 0),
                admins: Number(users[3] || 0),
                active: Number(users[4] || 0),
                suspended: Number(users[5] || 0)
            },

            jobs: {
                total: Number(jobs[0] || 0),
                open: Number(jobs[1] || 0),
                assigned: Number(jobs[2] || 0),
                hired: Number(jobs[3] || 0),
                completed: Number(jobs[4] || 0)
            },

            wallet: {
                total_balance: Number(wallet || 0)
            },

            withdrawals: {
                total: Number(withdrawals[0] || 0),
                pending_amount: Number(withdrawals[1] || 0),
                completed_amount: Number(withdrawals[2] || 0),
                pending_count: Number(withdrawals[3] || 0),
                completed_count: Number(withdrawals[4] || 0),
                rejected_count: Number(withdrawals[5] || 0)
            }
        });

    } catch (error) {

        console.error("ADMIN STATS ERROR:", error);

        res.status(500).json({
            success: false,
            message: "Unable to load statistics."
        });
    }
});

// ================================
// END ADMIN STATISTICS & REPORTS
// ================================
`;

if (!s.includes(marker)) {
    console.log("MARKER NOT FOUND");
    process.exit(1);
}

s = s.replace(marker, marker + code);

fs.writeFileSync(file, s);

console.log("ADMIN STATS API ADDED");
