const fs = require("fs");

const file = "server.js";
let s = fs.readFileSync(file, "utf8");

if (s.includes("/api/admin/reports")) {
    console.log("ADMIN REPORTS API ALREADY EXISTS");
    process.exit(0);
}

const marker = "// ================================\n// END ADMIN STATISTICS & REPORTS";

const code = `

// ================================
// ADMIN FINANCIAL REPORTS
// ================================

app.get("/api/admin/reports", authenticate, (req, res) => {

    try {

        if (req.user.role !== "admin") {
            return res.status(403).json({
                success: false,
                message: "Admin access required."
            });
        }

        const result = db.exec(\`
            SELECT
                transactions.id,
                transactions.user_id,
                users.full_name,
                users.phone,
                transactions.type,
                transactions.amount,
                transactions.reference,
                transactions.description,
                transactions.status,
                transactions.created_at
            FROM transactions
            LEFT JOIN users
                ON users.id = transactions.user_id
            ORDER BY transactions.id DESC
        \`);

        const transactions =
            result.length > 0
                ? result[0].values.map(row => ({
                    id: row[0],
                    user_id: row[1],
                    full_name: row[2],
                    phone: row[3],
                    type: row[4],
                    amount: row[5],
                    reference: row[6],
                    description: row[7],
                    status: row[8],
                    created_at: row[9]
                }))
                : [];

        let totalCredits = 0;
        let totalWithdrawals = 0;
        let completedWithdrawals = 0;
        let pendingWithdrawals = 0;

        transactions.forEach(transaction => {

            const amount =
                Number(transaction.amount || 0);

            if (amount > 0) {
                totalCredits += amount;
            }

            if (
                transaction.type === "withdrawal"
            ) {

                totalWithdrawals +=
                    Math.abs(amount);

                if (
                    transaction.status ===
                    "completed"
                ) {
                    completedWithdrawals +=
                        Math.abs(amount);
                }

                if (
                    transaction.status ===
                    "pending"
                ) {
                    pendingWithdrawals +=
                        Math.abs(amount);
                }
            }
        });

        res.json({
            success: true,

            summary: {
                transaction_count:
                    transactions.length,

                total_credits:
                    totalCredits,

                total_withdrawals:
                    totalWithdrawals,

                completed_withdrawals:
                    completedWithdrawals,

                pending_withdrawals:
                    pendingWithdrawals
            },

            transactions
        });

    } catch (error) {

        console.error("ADMIN REPORTS ERROR:", error);

        res.status(500).json({
            success: false,
            message: "Unable to load financial reports."
        });
    }
});

// ================================
// END ADMIN FINANCIAL REPORTS
// ================================
`;

if (!s.includes(marker)) {
    console.log("MARKER NOT FOUND");
    process.exit(1);
}

s = s.replace(marker, marker + code);

fs.writeFileSync(file, s);

console.log("ADMIN REPORTS API ADDED");
