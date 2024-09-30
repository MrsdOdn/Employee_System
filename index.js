import express from "express";
import bodyParser from "body-parser";
import passport from "passport";
import session from "express-session";
import authMiddleware from "./middleware/authMiddleware.js";
import authRoutes from "./auth.js"; 

const app = express();
const port = 3000;

// Oturum yönetimi
app.use(session({
    secret: "your-secret-key", // Bu anahtarı gizli tut!
    resave: false,
    saveUninitialized: false
}));

app.use(passport.initialize());
app.use(passport.session());

app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static("public"));

// Ana sayfa (herkes erişebilir)
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
