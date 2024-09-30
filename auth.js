import express from "express";
import bcrypt from "bcrypt";
import passport from "passport";
import { Strategy as LocalStrategy } from "passport-local";
import db from "./config/db.js";

const router = express.Router();
const saltRounds = 10;

// Passport yapılandırması
passport.use(
    new LocalStrategy(async (username, password, done) => {
        try {
            const result = await db.query("SELECT * FROM employees WHERE email = $1", [username]);
            if (result.rows.length > 0) {
                const user = result.rows[0];
                const isValidPassword = await bcrypt.compare(password, user.password_hash);
                if (isValidPassword) {
                    return done(null, user);
                } else {
                    return done(null, false, { message: "Incorrect password" });
                }
            } else {
                return done(null, false, { message: "User not found" });
            }
        } catch (err) {
            return done(err);
        }
    })
);

passport.serializeUser((user, done) => {
    done(null, user.id);
});

passport.deserializeUser(async (id, done) => {
    try {
        const result = await db.query("SELECT * FROM employees WHERE id = $1", [id]);
        if (result.rows.length > 0) {
            done(null, result.rows[0]);
        } else {
            done(new Error("User not found"));
        }
    } catch (err) {
        done(err);
    }
});

// Kayıt rotası
router.post("/register", async (req, res) => {
    const { tc_no, first_name, last_name, email, phone_number, password } = req.body;
    try {
        const checkResult = await db.query("SELECT * FROM employees WHERE email = $1", [email]);
        if (checkResult.rows.length > 0) {
            return res.redirect("/login");
        }

        const hash = await bcrypt.hash(password, saltRounds);
        const result = await db.query(
            "INSERT INTO employees (tc_no,first_name,last_name,email,phone_number,password_hash) VALUES ($1,$2,$3,$4,$5,$6) RETURNING *",
            [tc_no, first_name, last_name, email, phone_number, hash]
        );

        req.login(result.rows[0], (err) => {
            if (err) {
                console.error(err);
                return res.redirect("/register");
            }
            return res.redirect("/");
        });
    } catch (err) {
        console.error(err);
        res.status(500).send("Internal Server Error");
    }
});

// Giriş rotası
router.post("/login", passport.authenticate("local", {
    successRedirect: "/", //ilerleyen zamanda değişecek.
    failureRedirect: "/login"
}));

export default router;
