import express from 'express';
import db from '../config/db.js';

const router = express.Router();
const announcement_sql = `SELECT 
    a.id AS announcement_id,
    a.title,
    a.content,
    a.publish_date,
    a.expiry_date,
    a.status,
    a.created_at,
    ac.name AS category_name
FROM 
    announcements a
LEFT JOIN 
    announcement_category_relations acr ON a.id = acr.announcement_id
LEFT JOIN 
    announcement_categories ac ON acr.category_id = ac.id
WHERE 
    a.status = 'active' 
AND 
    a.publish_date <= CURRENT_TIMESTAMP 
AND 
    (expiry_date IS NULL OR expiry_date > CURRENT_TIMESTAMP)
`;



router.get("/home", (req, res) => {
    res.render("../views/user/home");
});
router.get("/profil", (req, res) => {
    res.render("../views/user/profil.ejs");
});
router.get("/sifre", (req, res) => {
    res.render("../views/user/sifre.ejs");
});

router.get("/duyurular", async (req, res) => {
    try {
        const result = await db.query(announcement_sql);
        res.render("../views/user/duyurular.ejs", { announcement: result.rows, });

    } catch (error) {
        console.log(error);
        res.status(500).send('Bir hata oluştu.');
    }
});
router.get("/duyurular/data", async (req, res) => {
    try {
        const result = await db.query(announcement_sql);
        res.json(result.rows);
    } catch (error) {
        console.log(error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});

export default router;