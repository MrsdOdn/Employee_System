import express from 'express';
import db from '../config/db.js';

const router = express.Router();
const user_info_sql = 'SELECT * FROM employees';
const job_info_sql = `SELECT 
            e.employee_id,
            e.first_name,
            e.last_name,
            jt.title_name AS title,
            jta.task_name AS task,
            d.division_name AS division,
            dept.department_name AS department,
            jd.description AS job_description,
            et.type_name AS employee_type,
            g.group_name AS group_name,
            ep.employment_start_date,
            ep.termination_date
        FROM 
            Employee_Positions ep
        JOIN 
            Employees e ON ep.employee_id = e.employee_id
        JOIN 
            Job_Titles jt ON ep.title = jt.id
        JOIN 
            Job_Tasks jta ON ep.task = jta.id
        JOIN 
            Divisions d ON ep.division = d.id
        JOIN 
            Departments dept ON ep.department = dept.id
        JOIN 
            Job_Descriptions jd ON ep.job_description = jd.id
        JOIN 
            Employee_Types et ON ep.employee_type = et.id
        LEFT JOIN 
            Employee_Groups eg ON e.employee_id = eg.employee_id
        LEFT JOIN 
            Groups g ON eg.group_id = g.id`;
const personal_info_sql = `SELECT 
    epi.*, 
    e.first_name, 
    e.last_name
FROM 
    Employee_Personal_Information epi
LEFT JOIN 
    employees e 
ON 
    epi.employee_id = e.employee_id;
`;
const contact_info_sql = `SELECT
    ec.*,
    e.first_name, 
    e.last_name
FROM
    Employee_Contacts ec
LEFT JOIN 
    employees e
ON
    ec.employee_id = e.employee_id`;
const education_info_sql = `SELECT
    ee.*,
    e.first_name, 
    e.last_name
FROM
    Employee_Educations ee
LEFT JOIN 
    employees e
ON
    ee.employee_id = e.employee_id`;

const body_info_sql = `SELECT
    ebm.*,
    e.first_name, 
    e.last_name
FROM
    Employee_Body_Measurements ebm
LEFT JOIN 
    employees e
ON
    ebm.employee_id = e.employee_id`;

const announcement_sql = `SELECT 
    a.*,
    e.first_name,
    e.last_name, 
    ac.name
FROM 
    announcements a
LEFT JOIN 
    announcement_category_relations acr ON a.id = acr.announcement_id
LEFT JOIN 
    announcement_categories ac ON acr.category_id = ac.id
LEFT JOIN 
    employees e ON a.published_by = e.employee_id
`;
const announcement_category_sql = `SELECT * FROM announcement_categories`;

router.get("/", (req, res) => {
    res.render("admin/admin.ejs");
});

router.get("/duyurular", (req, res) => {
    res.render("admin/aduyurular.ejs");
});

// Dinamik veriyi JSON formatında döndüren route
router.get("/duyurular/data", async (req, res) => {
    try {
        const result = await db.query(announcement_sql);
        res.json(result.rows);
    } catch (error) {
        console.log(error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});
router.get("/duyurular/data/:id", async (req, res) => {
    const id = req.params.id; // URL'den alınan id
    const a_id = `WHERE a.id = $1`;
    // Duyuruya özel SQL sorgusu
    const announcementById_sql = announcement_sql + a_id;

    try {
        const result = await db.query(announcementById_sql, [id]); // id'yi parametre olarak geç
        if (result.rows.length > 0) {
            res.json(result.rows[0]); // Duyuru bulunduysa, ilk sonucu döndür
        } else {
            res.status(404).json({ error: 'Duyuru bulunamadı.' }); // Eğer duyuru yoksa 404 döndür
        }
    } catch (error) {
        console.log(error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});



router.get("/duyurular/category/data", async (req, res) => {
    try {
        const result = await db.query(announcement_category_sql);
        res.json(result.rows);
    } catch (error) {
        console.log(error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});

router.get("/calisanlar/user/data", async (req, res) => {
    try {
        const result = await db.query(user_info_sql);
        res.json(result.rows);
    } catch (error) {
        console.log(error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});
router.get("/calisanlar/job/data", async (req, res) => {
    try {
        const result = await db.query(job_info_sql);
        res.json(result.rows);
    } catch (error) {
        console.log(error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
}); router.get("/calisanlar/personal/data", async (req, res) => {
    try {
        const result = await db.query(personal_info_sql);
        res.json(result.rows);
    } catch (error) {
        console.log(error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});
router.get("/calisanlar/contact/data", async (req, res) => {
    try {
        const result = await db.query(contact_info_sql);
        res.json(result.rows);
    } catch (error) {
        console.log(error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});
router.get("/calisanlar/education/data", async (req, res) => {
    try {
        const result = await db.query(education_info_sql);
        res.json(result.rows);
    } catch (error) {
        console.log(error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});
router.get("/calisanlar/body/data", async (req, res) => {
    try {
        const result = await db.query(body_info_sql);
        res.json(result.rows);
    } catch (error) {
        console.log(error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});
router.get('/calisanlar', async (req, res) => {
    res.render('admin/calisanlar.ejs');
});


router.post('/duyurular/data', async (req, res) => {
    console.log('Sunucuya Gelen Veriler:', req.body);
    const { title, content, published_by, publish_date, expiry_date, status, created_at, category_id } = req.body;
    if (!published_by) {
        console.error('published_by alanı tanımsız!');
        return res.status(400).json({ error: 'published_by alanı gerekli' });
    }
    try {
        const result = await db.query(
            `INSERT INTO announcements (title, content, published_by, publish_date, expiry_date, status, created_at)
             VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING id`,
            [title, content, published_by, publish_date, expiry_date, status, created_at]
        );

        const announcementId = result.rows[0].id;

        if (category_id) {
            await db.query(
                `INSERT INTO announcement_category_relations (announcement_id, category_id)
                 VALUES ($1, $2)`,
                [announcementId, category_id]
            );
        }

        res.status(201).json({ id: announcementId });
    } catch (error) {
        console.error('Veri ekleme hatası:', error);
        res.status(500).json({ error: 'Veri eklenirken bir hata oluştu' });
    }
});


router.delete('/duyurular/data/:id', async (req, res) => {
    const id = req.params.id;

    // ID'nin geçerli bir sayı olup olmadığını kontrol et
    if (isNaN(id) || id <= 0) {
        return res.status(400).json({ message: 'Geçersiz ID.' });
    }

    try {
        //taplolar arasında foreign key ilişkisi olduğu için diğer taployu da silmem gerekti. 
        await db.query(`DELETE FROM announcement_category_relations WHERE announcement_id = $1`, [id]);
        const result = await db.query(`DELETE FROM announcements WHERE id = $1`, [id]);

        if (result.rowCount > 0) {
            return res.status(200).json({ message: 'Duyuru başarıyla silindi.' });
        } else {
            return res.status(404).json({ message: 'Duyuru bulunamadı.' });
        }
    } catch (error) {
        console.error(error);
        return res.status(500).json({ error: 'İç Sunucu Hatası', details: error.message });
    }
});


export default router;
