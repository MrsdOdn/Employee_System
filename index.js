import express from "express";
import bodyParser from "body-parser";
import passport from "passport";
import session from "express-session";
import authMiddleware from "./middleware/authMiddleware.js";
import authRoutes from "./auth.js";
import dotenv from "dotenv";
import expressLayouts from "express-ejs-layouts";
import db from "./config/db.js";

dotenv.config();
const app = express();
const port = 3000;

app.use(session({
    secret: process.env.SESSION_SECRET,
    resave: false,
    saveUninitialized: false
}));


app.use(passport.initialize());
app.use(passport.session());


app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static("public"));


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

app.get("/home", (req, res) => {
    res.render("user/home");
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

app.get("/duyurular", (req, res) => {
    res.render("user/duyurular.ejs");
});
app.get("/profil", (req, res) => {
    res.render("user/profil.ejs");
});
app.get("/sifre", (req, res) => {
    res.render("user/sifre.ejs");
});
app.get("/admin", (req, res) => {
    res.render("admin/admin.ejs");
});
app.get("/admin/duyurular", (req, res) => {
    res.render("admin/aduyurular.ejs");
});
/* app.get("/admin/calisanlar", (req, res) => {
    res.render("admin/calisanlar.ejs");
}); */

app.get('/admin/calisanlar', async (req, res) => {
    try {
        const result = await db.query('SELECT * FROM employees');
        res.render('admin/calisanlar.ejs', { employees: result.rows });
    } catch (err) {
        console.error(err);
        res.status(500).send('Bir hata oluştu.');
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

app.use("/", authRoutes);

app.listen(port, () => {
    console.log(`Server running on port ${port}.`);
});
