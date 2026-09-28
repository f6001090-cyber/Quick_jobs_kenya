const fs = require("fs");

const file = "server.js";
let s = fs.readFileSync(file, "utf8");

if (s.includes('app.post("/api/withdraw"')) {
    console.log("Withdrawal API already exists.");
    process.exit(0);
}

const marker = "// ================================\n// WALLET";

if (!s.includes(marker)) {
    console.error("WALLET marker not found.");
    process.exit(1);
}

const withdrawalAPI = `
// ================================
// WITHDRAWAL API
// ================================

app.post("/api/withdraw", authenticate, (req, res) => {

    try {

        if (req.user.role !== "worker") {
            return res.status(403).json({
                success: false,
                message: "Only workers can withdraw money."
            });
        }

        const amount = Number(req.body.amount);
        const phone = String(req.body.phone || "").trim();

        if (!Number.isFinite(amount) || amount <= 0) {
            return res.status(400).json({
                success: false,
                message: "Enter a valid withdrawal amount."
            });
        }

        if (!/^07\\\\d{8}$/.test(phone)) {
            return res.status(400).json({
                success: false,
                message: "Enter a valid Kenyan M-Pesa number."
            });
        }

        const minimumWithdrawal = 200;

        if (amount < minimumWithdrawal) {
            return res.status(400).json({
                success: false,
                message: "Minimum withdrawal is KSh 200."
            });
        }

        const userResult = db.exec(
            \`
            SELECT wallet_balance
            FROM users
            WHERE id = ?
            \`,
            [req.user.id]
        );

        if (
            userResult.length === 0 ||
            userResult[0].values.length === 0
        ) {
            return res.status(404).json({
                success: false,
                message: "User not found."
            });
        }

        const balance = Number(userResult[0].values[0][0] || 0);

        if (amount > balance) {
            return res.status(400).json({
                success: false,
                message: "Insufficient wallet balance."
            });
        }

        // Deduct the requested amount immediately so it cannot
        // be withdrawn twice while the request is pending.
        db.run(
            \`
            UPDATE users
            SET wallet_balance = wallet_balance - ?
            WHERE id = ?
            \`,
            [amount, req.user.id]
        );

        db.run(
            \`
            INSERT INTO withdrawals
            (user_id, amount, phone, status)
            VALUES (?, ?, ?, 'pending')
            \`,
            [req.user.id, amount, phone]
        );

        db.run(
            \`
            INSERT INTO transactions
            (user_id, type, amount, reference, description, status)
            VALUES (?, 'withdrawal', ?, ?, ?, 'pending')
            \`,
            [
                req.user.id,
                -amount,
                "WD-" + Date.now(),
                "Withdrawal request"
            ]
        );

        res.json({
            success: true,
            message: "Withdrawal request submitted successfully.",
            amount,
            phone,
            status: "pending"
        });

    } catch (error) {

        console.error("WITHDRAW ERROR:", error);

        res.status(500).json({
            success: false,
            message: "Unable to process withdrawal."
        });
    }
});


// GET MY WITHDRAWALS
app.get("/api/my-withdrawals", authenticate, (req, res) => {

    try {

        if (req.user.role !== "worker") {
            return res.status(403).json({
                success: false,
                message: "Only workers can view withdrawals."
            });
        }

        const result = db.exec(
            \`
            SELECT
                id,
                amount,
                phone,
                status,
                created_at,
                processed_at
            FROM withdrawals
            WHERE user_id = ?
            ORDER BY id DESC
            \`,
            [req.user.id]
        );

        const withdrawals =
            result.length > 0
                ? result[0].values.map(row => ({
                    id: row[0],
                    amount: row[1],
                    phone: row[2],
                    status: row[3],
                    created_at: row[4],
                    processed_at: row[5]
                }))
                : [];

        res.json({
            success: true,
            withdrawals
        });

    } catch (error) {

        console.error("MY WITHDRAWALS ERROR:", error);

        res.status(500).json({
            success: false,
            message: "Unable to load withdrawals."
        });
    }
});

// ================================
// END WITHDRAWAL API
// ================================

`;

s = s.replace(marker, withdrawalAPI + marker);

fs.writeFileSync(file, s);

console.log("Withdrawal API added successfully.");
