import express from "express";
import bodyParser from "body-parser";
import passport from "passport";
import flash from "connect-flash";
import session from "express-session";
import authMiddleware from "./middleware/authMiddleware.js";
import authRoutes from "./auth.js";
import dotenv from "dotenv";
import expressLayouts from "express-ejs-layouts";
import db from "./config/db.js";
import adminRoutes from "./routes/adminRoutes.js";
import userRoutes from "./routes/userRoutes.js";
import moment from "moment";
import cors from "cors";
import path from "path";
import { dirname } from "path";
import { fileURLToPath } from "url";
const __dirname = dirname(fileURLToPath(import.meta.url));

dotenv.config();
const app = express();
const port = 3000;

app.use(cors());
app.use(session({
    secret: process.env.SESSION_SECRET,
    resave: false,
    saveUninitialized: false
}));


app.use(flash());
app.use(passport.initialize());
app.use(passport.session());

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static("public"));
app.use("/uploads", express.static(path.join(__dirname, "uploads")));

app.use((req, res, next) => {
    res.locals.messages = req.flash();// Hata mesajları
    res.locals.moment = moment;
    next();
});

app.use(expressLayouts);
app.set("view engine", "ejs");
app.set("layout", "partials/layout");

//kimlik sorgulama açılacak sonra
/* app.use((req, res, next) => {
    const openRoutes = ['/', '/login', '/register'];
    if (!openRoutes.includes(req.path) && !req.isAuthenticated()) {
        return res.redirect("/login");
    }
    next();
}); */

// Admin rotaları kontrol
//app.use('/admin', authMiddleware.isAuthenticated, authMiddleware.isAdmin);

app.use((req, res, next) => {
    if (req.isAuthenticated()) {
        res.locals.name = req.user.first_name;
        res.locals.surname = req.user.last_name;
        res.locals.profileImage = req.user.profile_image;
    } else {
        res.locals.name = "İsim";
        res.locals.surname = "Soyisim";
        res.locals.profileImage = "../../images/profil.png";
    }
    next();
});

app.get('/api/user', (req, res) => {
    if (req.isAuthenticated()) {
        res.json(req.user);
    } else {
        res.status(401).json({ message: 'Not authenticated' });
    }
});
app.get('/', (req, res) => {
    res.render('index', { layout: false });
});

app.get("/login", (req, res) => {
    res.render("login", { layout: false });
});

app.get("/register", (req, res) => {
    res.render("register", { layout: false });
});
app.patch('/change-password/:id', async (req, res) => {
    console.log("Request body:", req.body);
    const id = req.params.id;
    const { currentPassword, newPassword } = req.body;

    try {
        const result = await db.query("SELECT * FROM employees WHERE employee_id = $1", [id]);
        if (result.rows.length === 0) {
            return res.status(404).json({ message: "User not found" });
        }
        const user = result.rows[0];

        // Mevcut şifreyi kontrol ediyoruz
        const isMatch = await bcrypt.compare(currentPassword, user.password_hash);
        if (!isMatch) {
            return res.status(401).json({ message: "Current password is incorrect" });
        }

        // Yeni şifreyi hash'leyip güncelliyoruz
        const hashedNewPassword = await bcrypt.hash(newPassword, 10);
        await db.query("UPDATE employees SET password_hash = $1 WHERE employee_id = $2", [hashedNewPassword, id]);

        return res.status(200).json({ message: "Password changed successfully" });
    } catch (error) {
        console.error(error);
        return res.status(500).json({ message: "An error occurred while changing the password" });
    }
});


app.get("/logout", (req, res) => {
    req.logout(function (err) {
        if (err) {
            return next(err);
        }
        res.redirect("/");
    });
});

app.use("/user", userRoutes);
app.use('/admin', adminRoutes);
app.use("/", authRoutes);
app.use((req, res, next) => {
    res.status(404).render('error404', { layout: false });
});

app.listen(port, () => {
    console.log(`Server running on port ${port}.`);
});
