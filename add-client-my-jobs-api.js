const fs = require("fs");

const file = "server.js";
let s = fs.readFileSync(file, "utf8");

if (s.includes("/api/client/my-jobs")) {
    console.log("CLIENT MY-JOBS API ALREADY EXISTS");
    process.exit(0);
}

const marker = "// START SERVER";

const code = `

// ================================
// CLIENT MY JOBS API
// ================================

app.get("/api/client/my-jobs", authenticate, (req, res) => {

    try {

        if (req.user.role !== "client") {
            return res.status(403).json({
                success: false,
                message: "Only clients can view their jobs."
            });
        }

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

        const jobs =
            result.length > 0
                ? result[0].values.map(row => ({
                    id: row[0],
                    title: row[1],
                    description: row[2],
                    category: row[3],
                    budget: row[4],
                    status: row[5],
                    hired_worker_id: row[6],
                    created_at: row[7]
                }))
                : [];

        res.json({
            success: true,
            jobs
        });

    } catch (error) {

        console.error(
            "CLIENT MY JOBS ERROR:",
            error
        );

        res.status(500).json({
            success: false,
            message: "Unable to load your jobs."
        });
    }
});

// ================================
// END CLIENT MY JOBS API
// ================================
`;

if (!s.includes(marker)) {
    console.log("START SERVER MARKER NOT FOUND");
    process.exit(1);
}

s = s.replace(
    marker,
    code + "\n" + marker,
    1
);

fs.writeFileSync(file, s);

console.log("CLIENT MY-JOBS API ADDED");
