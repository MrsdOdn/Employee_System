import db from "../config/db.js";

export default {
    isAuthenticated: (req, res, next) => {
        if (req.isAuthenticated()) {
            return next();
        } else {
            res.redirect("/login");
        }
    },
    isAdmin: async (req, res, next) => {
        if (!req.isAuthenticated()) {
            return res.redirect("/login");
        }

        const userId = req.user.employee_id;

        try {
            const result = await db.query(`
                SELECT 1
                FROM employee_roles
                INNER JOIN roles ON employee_roles.role_id = roles.role_id
                WHERE employee_roles.employee_id = $1 AND roles.role_name = 'admin'
            `, [userId]);
            if (result.rowCount > 0) {
                return next();
            } else {
                return res.redirect("/home");
            }
        } catch (error) {
            console.error("Error checking admin role:", error);
            return res.redirect("/");
        }
    }
};