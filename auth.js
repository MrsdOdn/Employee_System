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
    console.log('User serialized:', user);
    done(null, user.employee_id);
});

passport.deserializeUser(async (id, done) => {
    try {
        const result = await db.query("SELECT * FROM employees WHERE employee_id = $1", [id]);
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
    const { tcNo, firstName, lastName, email, phone, password, confirmPassword } = req.body;

    const tcRegex = /^\d{11}$/;
    const phoneRegex = /^\d{10,15}$/;

    if (!tcRegex.test(tcNo)) {
        return res.status(400).send("TC Kimlik No 11 haneli olmalı");
    }
    if (!phoneRegex.test(phone)) {
        return res.status(400).send("Geçerli bir telefon numarası girin");
    }
    if (password !== confirmPassword) {
        return res.status(400).send("Parola ve Parola Doğrulama uyuşmuyor");
    }

    try {
        const checkResult = await db.query("SELECT * FROM employees WHERE email = $1", [email]);
        if (checkResult.rows.length > 0) {
            return res.redirect("/login");
        }

        const hash = await bcrypt.hash(password, saltRounds);
        const result = await db.query(
            "INSERT INTO employees (tc_no, first_name, last_name, email, phone_number, password_hash) VALUES ($1, $2, $3, $4, $5, $6) RETURNING *",
            [tcNo, firstName, lastName, email, phone, hash]
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
