import express from "express";
import bodyParser from "body-parser";
import passport from "passport";
import session from "express-session";
import authMiddleware from "./middleware/authMiddleware.js";
import authRoutes from "./auth.js";
import dotenv from "dotenv";

dotenv.config();
const app = express();
const port = 3000;

// Oturum yönetimi
app.use(session({
    secret: process.env.SESSION_SECRET,
    resave: false,
    // Oturuma herhangi bir veri kaydedilmediğinde, oturumu kaydetme.
    saveUninitialized: false
}));

app.use(passport.initialize());
app.use(passport.session());

app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static("public"));


app.get("/", (req, res) => {
    res.render("home.ejs");
});


app.get("/login", (req, res) => {
    res.render("login.ejs");
});


app.get("/register", (req, res) => {
    res.render("register.ejs");
});


app.get("/dashboard", authMiddleware.isAuthenticated, (req, res) => {
    res.render("dashboard.ejs", { user: req.user });
});

app.use("/", authRoutes);


app.listen(port, () => {
    console.log(`Server running on port ${port}.`);
});
