const fs = require("fs");

const file = "server.js";
let s = fs.readFileSync(file, "utf8");

if (s.includes("/api/admin/withdrawals")) {
    console.log("ADMIN WITHDRAWAL API ALREADY EXISTS");
    process.exit(0);
}

const marker = "// ================================\n// END WITHDRAWAL API";

const code = `

// ================================
// ADMIN WITHDRAWAL MANAGEMENT
// ================================

// VIEW ALL WITHDRAWALS
app.get("/api/admin/withdrawals", authenticate, (req, res) => {

    try {

        if (req.user.role !== "admin") {
            return res.status(403).json({
                success: false,
                message: "Admin access required."
            });
        }

        const result = db.exec(\`
            SELECT
                withdrawals.id,
                withdrawals.user_id,
                users.full_name,
                users.phone AS user_phone,
                withdrawals.amount,
                withdrawals.phone AS mpesa_phone,
                withdrawals.status,
                withdrawals.created_at,
                withdrawals.processed_at
            FROM withdrawals
            LEFT JOIN users
                ON users.id = withdrawals.user_id
            ORDER BY withdrawals.id DESC
        \`);

        const withdrawals =
            result.length > 0
                ? result[0].values.map(row => ({
                    id: row[0],
                    user_id: row[1],
                    full_name: row[2],
                    user_phone: row[3],
                    amount: row[4],
                    mpesa_phone: row[5],
                    status: row[6],
                    created_at: row[7],
                    processed_at: row[8]
                }))
                : [];

        res.json({
            success: true,
            withdrawals
        });

    } catch (error) {

        console.error("ADMIN WITHDRAWALS ERROR:", error);

        res.status(500).json({
            success: false,
            message: "Unable to load withdrawals."
        });
    }
});


// APPROVE WITHDRAWAL
app.post("/api/admin/withdrawals/:id/approve", authenticate, (req, res) => {

    try {

        if (req.user.role !== "admin") {
            return res.status(403).json({
                success: false,
                message: "Admin access required."
            });
        }

        const withdrawalId = Number(req.params.id);

        if (!Number.isInteger(withdrawalId)) {
            return res.status(400).json({
                success: false,
                message: "Invalid withdrawal ID."
            });
        }

        const result = db.exec(
            \`
            SELECT
                id,
                user_id,
                amount,
                phone,
                status
            FROM withdrawals
            WHERE id = ?
            \`,
            [withdrawalId]
        );

        if (
            result.length === 0 ||
            result[0].values.length === 0
        ) {
            return res.status(404).json({
                success: false,
                message: "Withdrawal not found."
            });
        }

        const row = result[0].values[0];

        const userId = row[1];
        const amount = Number(row[2]);
        const status = row[4];

        if (status !== "pending") {
            return res.status(400).json({
                success: false,
                message: "This withdrawal has already been processed."
            });
        }

        db.run(
            \`
            UPDATE withdrawals
            SET status = 'completed',
                processed_at = CURRENT_TIMESTAMP
            WHERE id = ?
            \`,
            [withdrawalId]
        );

        db.run(
            \`
            UPDATE transactions
            SET status = 'completed'
            WHERE user_id = ?
              AND type = 'withdrawal'
              AND amount = ?
              AND status = 'pending'
              AND description = 'Withdrawal request'
            \`,
            [userId, -amount]
        );

        saveDatabase();

        res.json({
            success: true,
            message: "Withdrawal approved successfully."
        });

    } catch (error) {

        console.error("APPROVE WITHDRAWAL ERROR:", error);

        res.status(500).json({
            success: false,
            message: "Unable to approve withdrawal."
        });
    }
});


// REJECT WITHDRAWAL
app.post("/api/admin/withdrawals/:id/reject", authenticate, (req, res) => {

    try {

        if (req.user.role !== "admin") {
            return res.status(403).json({
                success: false,
                message: "Admin access required."
            });
        }

        const withdrawalId = Number(req.params.id);

        if (!Number.isInteger(withdrawalId)) {
            return res.status(400).json({
                success: false,
                message: "Invalid withdrawal ID."
            });
        }

        const result = db.exec(
            \`
            SELECT
                id,
                user_id,
                amount,
                status
            FROM withdrawals
            WHERE id = ?
            \`,
            [withdrawalId]
        );

        if (
            result.length === 0 ||
            result[0].values.length === 0
        ) {
            return res.status(404).json({
                success: false,
                message: "Withdrawal not found."
            });
        }

        const row = result[0].values[0];

        const userId = row[1];
        const amount = Number(row[2]);
        const status = row[3];

        if (status !== "pending") {
            return res.status(400).json({
                success: false,
                message: "This withdrawal has already been processed."
            });
        }

        // Return the money to the worker
        db.run(
            \`
            UPDATE users
            SET wallet_balance = wallet_balance + ?
            WHERE id = ?
            \`,
            [amount, userId]
        );

        db.run(
            \`
            UPDATE withdrawals
            SET status = 'rejected',
                processed_at = CURRENT_TIMESTAMP
            WHERE id = ?
            \`,
            [withdrawalId]
        );

        db.run(
            \`
            UPDATE transactions
            SET status = 'rejected'
            WHERE user_id = ?
              AND type = 'withdrawal'
              AND amount = ?
              AND status = 'pending'
              AND description = 'Withdrawal request'
            \`,
            [userId, -amount]
        );

        db.run(
            \`
            INSERT INTO transactions
            (user_id, type, amount, reference, description, status)
            VALUES (?, 'refund', ?, ?, ?, 'completed')
            \`,
            [
                userId,
                amount,
                "REFUND-WD-" + withdrawalId,
                "Rejected withdrawal refund"
            ]
        );

        saveDatabase();

        res.json({
            success: true,
            message: "Withdrawal rejected and money refunded."
        });

    } catch (error) {

        console.error("REJECT WITHDRAWAL ERROR:", error);

        res.status(500).json({
            success: false,
            message: "Unable to reject withdrawal."
        });
    }
});

// ================================
// END ADMIN WITHDRAWAL MANAGEMENT
// ================================
`;

if (!s.includes(marker)) {
    console.log("MARKER NOT FOUND");
    process.exit(1);
}

s = s.replace(marker, marker + code);

fs.writeFileSync(file, s);

console.log("ADMIN WITHDRAWAL API ADDED");
