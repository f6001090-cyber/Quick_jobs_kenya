const fs = require("fs");

const file = "server.js";
let s = fs.readFileSync(file, "utf8");

if (s.includes("/api/admin/users")) {
    console.log("ADMIN USERS API ALREADY EXISTS");
    process.exit(0);
}

const marker = "// ================================\n// END ADMIN WITHDRAWAL MANAGEMENT";

const code = `

// ================================
// ADMIN USER MANAGEMENT
// ================================

// VIEW ALL USERS
app.get("/api/admin/users", authenticate, (req, res) => {

    try {

        if (req.user.role !== "admin") {
            return res.status(403).json({
                success: false,
                message: "Admin access required."
            });
        }

        const result = db.exec(\`
            SELECT
                id,
                full_name,
                phone,
                email,
                role,
                wallet_balance,
                status,
                created_at
            FROM users
            ORDER BY id DESC
        \`);

        const users =
            result.length > 0
                ? result[0].values.map(row => ({
                    id: row[0],
                    full_name: row[1],
                    phone: row[2],
                    email: row[3],
                    role: row[4],
                    wallet_balance: row[5],
                    status: row[6],
                    created_at: row[7]
                }))
                : [];

        res.json({
            success: true,
            users
        });

    } catch (error) {

        console.error("ADMIN USERS ERROR:", error);

        res.status(500).json({
            success: false,
            message: "Unable to load users."
        });
    }
});


// SUSPEND USER
app.post("/api/admin/users/:id/suspend", authenticate, (req, res) => {

    try {

        if (req.user.role !== "admin") {
            return res.status(403).json({
                success: false,
                message: "Admin access required."
            });
        }

        const userId = Number(req.params.id);

        if (!Number.isInteger(userId)) {
            return res.status(400).json({
                success: false,
                message: "Invalid user ID."
            });
        }

        if (userId === Number(req.user.id)) {
            return res.status(400).json({
                success: false,
                message: "You cannot suspend your own account."
            });
        }

        const result = db.exec(
            \`
            SELECT id, role
            FROM users
            WHERE id = ?
            \`,
            [userId]
        );

        if (
            result.length === 0 ||
            result[0].values.length === 0
        ) {
            return res.status(404).json({
                success: false,
                message: "User not found."
            });
        }

        db.run(
            \`
            UPDATE users
            SET status = 'suspended'
            WHERE id = ?
            \`,
            [userId]
        );

        saveDatabase();

        res.json({
            success: true,
            message: "User suspended successfully."
        });

    } catch (error) {

        console.error("SUSPEND USER ERROR:", error);

        res.status(500).json({
            success: false,
            message: "Unable to suspend user."
        });
    }
});


// ACTIVATE USER
app.post("/api/admin/users/:id/activate", authenticate, (req, res) => {

    try {

        if (req.user.role !== "admin") {
            return res.status(403).json({
                success: false,
                message: "Admin access required."
            });
        }

        const userId = Number(req.params.id);

        if (!Number.isInteger(userId)) {
            return res.status(400).json({
                success: false,
                message: "Invalid user ID."
            });
        }

        db.run(
            \`
            UPDATE users
            SET status = 'active'
            WHERE id = ?
            \`,
            [userId]
        );

        saveDatabase();

        res.json({
            success: true,
            message: "User activated successfully."
        });

    } catch (error) {

        console.error("ACTIVATE USER ERROR:", error);

        res.status(500).json({
            success: false,
            message: "Unable to activate user."
        });
    }
});


// DELETE USER
app.delete("/api/admin/users/:id", authenticate, (req, res) => {

    try {

        if (req.user.role !== "admin") {
            return res.status(403).json({
                success: false,
                message: "Admin access required."
            });
        }

        const userId = Number(req.params.id);

        if (!Number.isInteger(userId)) {
            return res.status(400).json({
                success: false,
                message: "Invalid user ID."
            });
        }

        if (userId === Number(req.user.id)) {
            return res.status(400).json({
                success: false,
                message: "You cannot delete your own account."
            });
        }

        const result = db.exec(
            \`
            SELECT id
            FROM users
            WHERE id = ?
            \`,
            [userId]
        );

        if (
            result.length === 0 ||
            result[0].values.length === 0
        ) {
            return res.status(404).json({
                success: false,
                message: "User not found."
            });
        }

        db.run(
            "DELETE FROM applications WHERE worker_id = ?",
            [userId]
        );

        db.run(
            "DELETE FROM transactions WHERE user_id = ?",
            [userId]
        );

        db.run(
            "DELETE FROM withdrawals WHERE user_id = ?",
            [userId]
        );

        db.run(
            "DELETE FROM jobs WHERE client_id = ?",
            [userId]
        );

        db.run(
            "DELETE FROM users WHERE id = ?",
            [userId]
        );

        saveDatabase();

        res.json({
            success: true,
            message: "User deleted successfully."
        });

    } catch (error) {

        console.error("DELETE USER ERROR:", error);

        res.status(500).json({
            success: false,
            message: "Unable to delete user."
        });
    }
});

// ================================
// END ADMIN USER MANAGEMENT
// ================================
`;

if (!s.includes(marker)) {
    console.log("MARKER NOT FOUND");
    process.exit(1);
}

s = s.replace(marker, marker + code);

fs.writeFileSync(file, s);

console.log("ADMIN USERS API ADDED");
