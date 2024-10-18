import express from 'express';
import db from '../config/db.js';
import multer from "multer";
import path from 'path';

const router = express.Router();
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, "uploads/profile_images");
    },
    filename: (req, file, cb) => {
        const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1E9);
        cb(null, uniqueSuffix + path.extname(file.originalname));
    },
});
const upload = multer({
    storage: storage,
    limits: { fileSize: 1 * 1024 * 1024 } // 1 MB sınırı
});
const user_info_sql = 'SELECT * FROM employees';
const user_info_modal_sql = `
SELECT 
    e.employee_id,
    e.first_name,
    e.last_name,
    e.email,
    e.phone_number,
    r.role_name,
    r.role_id,
    e.profile_image
FROM 
    employees e
LEFT JOIN 
    employee_roles er ON e.employee_id = er.employee_id
LEFT JOIN 
    roles r ON er.role_id = r.role_id
WHERE 
    e.employee_id = $1
`;
const job_info_sql = `SELECT 
    e.employee_id,
    e.first_name,
    e.last_name,
    jt.id AS job_title_id,
    jt.title_name AS title,
    jta.id AS job_task_id,
    jta.task_name AS task,
    d.id AS division_id, 
    d.division_name AS division,
    dept.id AS department_id,
    dept.department_name AS department,
    jd.id AS job_description_id,
    jd.description AS job_description,
    et.id AS employee_type_id,
    et.type_name AS employee_type,
    g.id AS group_id,
    g.group_name AS group_name,
    ep.job_description_text,
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
    Groups g ON eg.group_id = g.id
`;
const personal_info_sql = `SELECT 
    epi.*, 
    e.first_name, 
    e.last_name
FROM 
    Employee_Personal_Information epi
LEFT JOIN 
    employees e 
ON 
    epi.employee_id = e.employee_id
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
router.get("/api/duyurular", async (req, res) => {
    try {
        const result = await db.query(announcement_sql);
        res.json(result.rows);
    } catch (error) {
        console.log(error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});
router.get("/api/duyurular/:id", async (req, res) => {
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
router.post('/api/duyurular', async (req, res) => {
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
router.patch("/api/duyurular/:id", async (req, res) => {
    console.log('Sunucuya Gelen Veriler:', req.body);
    const { title, content, publish_date, expiry_date, status, category_id } = req.body;
    const { id } = req.params;

    try {
        const result = await db.query(
            `UPDATE announcements
             SET title=$1, content=$2, publish_date=$3, expiry_date=$4, status=$5 
             WHERE id = $6`,
            [title, content, publish_date, expiry_date, status, id]
        );

        if (category_id) {
            await db.query(
                `UPDATE announcement_category_relations
                 SET category_id = $1 WHERE announcement_id = $2`,
                [category_id, id]
            );
        }

        res.status(200).json({ id });
    } catch (error) {
        console.error('Veri değiştirme hatası:', error);
        res.status(500).json({ error: 'Veri değiştirilirken bir hata oluştu' });
    }
});
router.delete('/api/duyurular/:id', async (req, res) => {
    const id = req.params.id;
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

router.get("/api/category/duyurular", async (req, res) => {
    try {
        const result = await db.query(announcement_category_sql);
        res.json(result.rows);
    } catch (error) {
        console.log(error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});

router.get('/calisanlar', async (req, res) => {
    res.render('admin/calisanlar.ejs');
});

router.get("/api/calisanlar/user", async (req, res) => {
    try {
        const result = await db.query(user_info_sql);
        res.json(result.rows);
    } catch (error) {
        console.log(error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});
router.get("/api/calisanlar/user/:id", async (req, res) => {
    const id = req.params.id;
    const userById_sql = user_info_sql + " WHERE employee_id = $1";

    try {
        const result = await db.query(userById_sql, [id]);
        if (result.rows.length > 0) {
            res.json(result.rows[0]);
        } else {
            res.status(404).json({ error: 'Kullanıcı bulunamadı.' });
        }
    } catch (error) {
        console.log(error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});
router.get("/api/calisanlar/user_modal/:id", async (req, res) => {
    const id = req.params.id;

    try {
        const result = await db.query(user_info_modal_sql, [id]);
        if (result.rows.length > 0) {
            res.json(result.rows[0]);
        } else {
            res.status(404).json({ error: 'Kullanıcı bulunamadı.' });
        }
    } catch (error) {
        console.log(error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});
router.patch("/api/calisanlar/user/:id", async (req, res) => {
    const employeeId = req.params.id;
    const { first_name, last_name, email, phone, user_role } = req.body;

    try {
        const updateEmployeeQuery = `
            UPDATE Employees
            SET first_name = $1, last_name = $2, email = $3, phone_number = $4
            WHERE employee_id = $5
            RETURNING *;
        `;
        const employeeValues = [first_name, last_name, email, phone, employeeId];
        const employeeResult = await db.query(updateEmployeeQuery, employeeValues);

        if (user_role) {
            const currentRoleQuery = `
                SELECT role_id FROM employee_roles
                WHERE employee_id = $1;
            `;
            const currentRoleResult = await db.query(currentRoleQuery, [employeeId]);
            if (currentRoleResult.rows.length > 0) {
                const currentRoleId = currentRoleResult.rows[0].role_id;

                if (currentRoleId !== user_role) {
                    const deleteRoleQuery = `
                        DELETE FROM employee_roles
                        WHERE employee_id = $1;
                    `;
                    await db.query(deleteRoleQuery, [employeeId]);

                    const updateRoleQuery = `
                        INSERT INTO employee_roles (employee_id, role_id)
                        VALUES ($1, $2);
                    `;
                    await db.query(updateRoleQuery, [employeeId, user_role]);
                }
            } else {
                const insertRoleQuery = `
                    INSERT INTO employee_roles (employee_id, role_id)
                    VALUES ($1, $2);
                `;
                await db.query(insertRoleQuery, [employeeId, user_role]);
            }
        }

        res.json(employeeResult.rows[0]);
    } catch (error) {
        console.error("Güncelleme hatası:", error);
        res.status(500).json({ error: "Bilgiler güncellenirken bir hata oluştu." });
    }
});



router.use((err, req, res, next) => {
    if (err instanceof multer.MulterError) {
        return res.status(500).json({ error: "Multer hatası: " + err.message });
    } else if (err) {
        return res.status(500).json({ error: "Hata: " + err.message });
    }
    next();
});
router.delete('/api/calisanlar/user/:id', async (req, res) => {
    const id = req.params.id;
    if (isNaN(id) || id <= 0) {
        return res.status(400).json({ message: 'Geçersiz ID.' });
    }
    try {
        const result = await db.query(`DELETE FROM employees WHERE employee_id = $1`, [id]);

        if (result.rowCount > 0) {
            return res.status(200).json({ message: 'Kişi başarıyla silindi.' });
        } else {
            return res.status(404).json({ message: 'Kişi bulunamadı.' });
        }
    } catch (error) {
        console.error(error);
        return res.status(500).json({ error: 'İç Sunucu Hatası', details: error.message });
    }
});

router.get("/api/roller", async (req, res) => {
    try {
        const result = await db.query('SELECT * FROM roles');
        res.json(result.rows);
    } catch (error) {
        console.log(error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});


router.get("/api/calisanlar/job", async (req, res) => {
    try {
        const result = await db.query(job_info_sql);
        res.json(result.rows);
    } catch (error) {
        console.log(error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});
router.get("/api/calisanlar/job/:id", async (req, res) => {
    const id = req.params.id;
    const e_id = ` WHERE e.employee_id = $1`;
    const jobById_sql = job_info_sql + e_id;

    try {
        const result = await db.query(jobById_sql, [id]);
        if (result.rows.length > 0) {
            res.json(result.rows[0]);
        } else {
            res.status(404).json({ error: 'Kullanıcı iş bilgisi bulunamadı.' });
        }
    } catch (error) {
        console.log(error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});
router.delete('/api/calisanlar/job/:id', async (req, res) => {
    const id = req.params.id;
    if (isNaN(id) || id <= 0) {
        return res.status(400).json({ message: 'Geçersiz ID.' });
    }
    try {
        const result = await db.query(`DELETE FROM Employee_Positions WHERE employee_id = $1`, [id]);

        if (result.rowCount > 0) {
            return res.status(200).json({ message: 'Kişi iş bilgisi başarıyla silindi.' });
        } else {
            return res.status(404).json({ message: 'Kişi iş bilgisi bulunamadı.' });
        }
    } catch (error) {
        console.error(error);
        return res.status(500).json({ error: 'İç Sunucu Hatası', details: error.message });
    }
});
router.patch("/api/calisanlar/job/:id", async (req, res) => {
    const id = req.params.id;
    const {
        title,
        task,
        department,
        division,
        job_description,
        employee_type,
        employment_start_date,
        termination_date,
        group_id
    } = req.body;

    const fields = [];
    const values = [];
    if (title) {
        fields.push("title = $1");
        values.push(title);
    }
    if (task) {
        fields.push("task = $" + (values.length + 1));
        values.push(task);
    }
    if (department) {
        fields.push("department = $" + (values.length + 1));
        values.push(department);
    }
    if (division) {
        fields.push("division = $" + (values.length + 1));
        values.push(division);
    }
    if (job_description) {
        fields.push("job_description_text = $" + (values.length + 1));
        values.push(job_description);
    }
    if (employee_type) {
        fields.push("employee_type = $" + (values.length + 1));
        values.push(employee_type);
    }
    if (employment_start_date) {
        fields.push("employment_start_date = $" + (values.length + 1));
        values.push(employment_start_date);
    }
    if (termination_date) {
        fields.push("termination_date = $" + (values.length + 1));
        values.push(termination_date);
    }
    if (group_id) {
        fields.push("group_id = $" + (values.length + 1));
        values.push(group_id);
    }
    if (fields.length === 0) {
        return res.status(400).json({ error: "Güncellenecek bir alan bulunamadı." });
    }
    const query = `
        UPDATE Employee_Positions 
        SET ${fields.join(", ")}
        WHERE employee_id = $${values.length + 1}
        RETURNING *;
    `;

    values.push(id);

    try {
        const result = await db.query(query, values);
        if (result.rows.length === 0) {
            return res.status(404).json({ error: "Çalışan bulunamadı." });
        }

        res.json(result.rows[0]);
    } catch (error) {
        console.error("Güncelleme hatası:", error);
        res.status(500).json({ error: "Veri güncellenirken bir hata oluştu." });
    }
});


router.post("/api/calisanlar/job", async (req, res) => {
    const {
        employee_id,
        title,
        task,
        department,
        division,
        job_description,
        employee_type,
        employment_start_date,
        termination_date,
        group_id
    } = req.body;

    if (!employee_id || !title || !task || !department) {
        return res.status(400).json({ error: "Çalışan ID'si, title, task ve department alanları zorunludur." });
    }

    try {
        const result = await db.query(
            `INSERT INTO Employee_Positions (
                employee_id, title, task, department, division, job_description, employee_type, 
                employment_start_date, termination_date, group_id
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10) RETURNING *`,
            [
                employee_id, title, task, department, division, job_description, employee_type,
                employment_start_date, termination_date, group_id
            ]
        );
        res.status(201).json(result.rows[0]);
    } catch (error) {
        console.error("Veri ekleme hatası:", error);
        res.status(500).json({ error: "Veri eklenirken bir hata oluştu." });
    }
});

router.get("/api/is_unvanlari", async (req, res) => {
    try {
        const result = await db.query('SELECT * FROM Job_Titles');
        res.json(result.rows);
    } catch (error) {
        console.log(error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});
router.get("/api/gorevler", async (req, res) => {
    try {
        const result = await db.query('SELECT * FROM Job_Tasks');
        res.json(result.rows);
    } catch (error) {
        console.log(error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});
router.get("/api/bolumler", async (req, res) => {
    try {
        const result = await db.query('SELECT * FROM Departments');
        res.json(result.rows);
    } catch (error) {
        console.log(error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});

router.get("/api/birlikler", async (req, res) => {
    try {
        const result = await db.query('SELECT * FROM Divisions');
        res.json(result.rows);
    } catch (error) {
        console.log(error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});
router.get("/api/calisan_turleri", async (req, res) => {
    try {
        const result = await db.query('SELECT * FROM Employee_Types');
        res.json(result.rows);
    } catch (error) {
        console.log(error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});
router.get("/api/gruplar", async (req, res) => {
    try {
        const result = await db.query('SELECT * FROM Groups');
        res.json(result.rows);
    } catch (error) {
        console.log(error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});


router.get("/api/calisanlar/personal", async (req, res) => {
    try {
        const result = await db.query(personal_info_sql);
        res.json(result.rows);
    } catch (error) {
        console.log(error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});
router.get("/api/calisanlar/personal/:id", async (req, res) => {
    const id = req.params.id;
    const personalById_sql = personal_info_sql + ' WHERE e.employee_id = $1';

    try {
        const result = await db.query(personalById_sql, [id]);
        if (result.rows.length > 0) {
            res.json(result.rows[0]);
        } else {
            res.status(404).json({ error: 'Kullanıcı kişisel bilgisi bulunamadı.' });
        }
    } catch (error) {
        console.log(error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});
router.delete('/api/calisanlar/personal/:id', async (req, res) => {
    const id = req.params.id;
    if (isNaN(id) || id <= 0) {
        return res.status(400).json({ message: 'Geçersiz ID.' });
    }
    try {
        const result = await db.query(`DELETE FROM Employee_Personal_Information WHERE employee_id = $1`, [id]);

        if (result.rowCount > 0) {
            return res.status(200).json({ message: 'Kişi bilgisi başarıyla silindi.' });
        } else {
            return res.status(404).json({ message: 'Kişi bilgisi bulunamadı.' });
        }
    } catch (error) {
        console.error(error);
        return res.status(500).json({ error: 'İç Sunucu Hatası', details: error.message });
    }
});
router.patch("/api/calisanlar/personal/:id", async (req, res) => {
    const id = req.params.id;
    const {
        birth_date,
        gender,
        nationality,
        marital_status,
        blood_type,
        mother_name,
        father_name,
        military_status,
        education_level,
        birth_place,
        registration_number
    } = req.body;

    const fields = [];
    const values = [];

    if (birth_date) {
        fields.push("birth_date = $1");
        values.push(birth_date);
    }
    if (gender) {
        fields.push("gender = $" + (values.length + 1));
        values.push(gender);
    }
    if (nationality) {
        fields.push("nationality = $" + (values.length + 1));
        values.push(nationality);
    }
    if (marital_status) {
        fields.push("marital_status = $" + (values.length + 1));
        values.push(marital_status);
    }
    if (blood_type) {
        fields.push("blood_type = $" + (values.length + 1));
        values.push(blood_type);
    }
    if (mother_name) {
        fields.push("mother_name = $" + (values.length + 1));
        values.push(mother_name);
    }
    if (father_name) {
        fields.push("father_name = $" + (values.length + 1));
        values.push(father_name);
    }
    if (military_status) {
        fields.push("military_status = $" + (values.length + 1));
        values.push(military_status);
    }
    if (education_level) {
        fields.push("education_level = $" + (values.length + 1));
        values.push(education_level);
    }
    if (birth_place) {
        fields.push("birth_place = $" + (values.length + 1));
        values.push(birth_place);
    }
    if (registration_number) {
        fields.push("registration_number = $" + (values.length + 1));
        values.push(registration_number);
    }

    if (fields.length === 0) {
        return res.status(400).json({ error: "Güncellenecek bir alan bulunamadı." });
    }

    const query = `
        UPDATE Employee_Personal_Information 
        SET ${fields.join(", ")}
        WHERE employee_id = $${values.length + 1}
        RETURNING *;
    `;
    values.push(id);

    console.log(query);
    console.log(values);

    try {
        const result = await db.query(query, values);

        if (result.rows.length === 0) {
            return res.status(404).json({ error: "Çalışan bulunamadı." });
        }

        res.json(result.rows[0]);
    } catch (error) {
        console.error("Güncelleme hatası:", error);
        res.status(500).json({ error: "Veri güncellenirken bir hata oluştu." });
    }
});
router.post("/api/calisanlar/personal", async (req, res) => {
    const {
        employee_id,
        birth_date,
        gender,
        nationality,
        marital_status,
        blood_type,
        mother_name,
        father_name,
        military_status,
        education_level,
        birth_place,
        registration_number
    } = req.body;

    if (!employee_id) {
        return res.status(400).json({ error: "Çalışan ID'si gerekli." });
    }

    try {
        const result = await db.query(
            `INSERT INTO Employee_Personal_Information (
                employee_id, birth_date, gender, nationality, marital_status, blood_type, 
                mother_name, father_name, military_status, education_level, birth_place, registration_number
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12) RETURNING *`,
            [
                employee_id, birth_date, gender, nationality, marital_status, blood_type,
                mother_name, father_name, military_status, education_level, birth_place, registration_number
            ]
        );
        res.status(201).json(result.rows[0]);
    } catch (error) {
        console.error("Veri ekleme hatası:", error);
        res.status(500).json({ error: "Veri eklenirken bir hata oluştu." });
    }
});



router.get("/api/calisanlar/contact", async (req, res) => {
    try {
        const result = await db.query(contact_info_sql);
        res.json(result.rows);
    } catch (error) {
        console.log(error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});
router.get("/api/calisanlar/contact/:id", async (req, res) => {
    const id = req.params.id;
    const contactById_sql = contact_info_sql + ' WHERE e.employee_id = $1';

    try {
        const result = await db.query(contactById_sql, [id]);
        if (result.rows.length > 0) {
            res.json(result.rows[0]);
        } else {
            res.status(404).json({ error: 'Kullanıcı iletişim bilgisi bulunamadı.' });
        }
    } catch (error) {
        console.log(error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});
router.delete('/api/calisanlar/contact/:id', async (req, res) => {
    const id = req.params.id;
    if (isNaN(id) || id <= 0) {
        return res.status(400).json({ message: 'Geçersiz ID.' });
    }
    try {
        const result = await db.query(`DELETE FROM Employee_Contacts WHERE employee_id = $1`, [id]);

        if (result.rowCount > 0) {
            return res.status(200).json({ message: 'Kişi iletişim bilgisi başarıyla silindi.' });
        } else {
            return res.status(404).json({ message: 'Kişi iletişim bilgisi bulunamadı.' });
        }
    } catch (error) {
        console.error(error);
        return res.status(500).json({ error: 'İç Sunucu Hatası', details: error.message });
    }
});
router.post("/api/calisanlar/contact", async (req, res) => {
    const {
        employee_id,
        address_type,
        city,
        state,
        full_address,
        emergency_contact
    } = req.body;

    if (!employee_id || !address_type || !full_address) {
        return res.status(400).json({ error: "employee_id, address_type ve full_address alanları zorunludur." });
    }
    try {
        const result = await db.query(
            `INSERT INTO Employee_Contacts (
                employee_id, address_type, city, state, full_address, emergency_contact
            ) VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
            [employee_id, address_type, city, state, full_address, emergency_contact]
        );
        res.status(201).json(result.rows[0]);
    } catch (error) {
        console.error("Veri ekleme hatası:", error);
        res.status(500).json({ error: "Veri eklenirken bir hata oluştu." });
    }
});
router.patch("/api/calisanlar/contact/:id", async (req, res) => {
    const contactId = req.params.id;
    const {
        address_type,
        city,
        state,
        full_address,
        emergency_contact
    } = req.body;

    try {
        const fields = [];
        const values = [];

        if (address_type) {
            fields.push(`address_type = $${fields.length + 1}`);
            values.push(address_type);
        }
        if (city) {
            fields.push(`city = $${fields.length + 1}`);
            values.push(city);
        }
        if (state) {
            fields.push(`state = $${fields.length + 1}`);
            values.push(state);
        }
        if (full_address) {
            fields.push(`full_address = $${fields.length + 1}`);
            values.push(full_address);
        }
        if (emergency_contact) {
            fields.push(`emergency_contact = $${fields.length + 1}`);
            values.push(emergency_contact);
        }

        if (fields.length === 0) {
            return res.status(400).json({ error: "Hiçbir alan güncellenmedi." });
        }

        const query = `UPDATE Employee_Contacts SET ${fields.join(", ")} WHERE address_id = $${fields.length + 1} RETURNING *`;
        values.push(contactId);

        const result = await db.query(query, values);

        if (result.rows.length > 0) {
            res.json(result.rows[0]);
        } else {
            res.status(404).json({ error: "İletişim kaydı bulunamadı." });
        }
    } catch (error) {
        console.error("Veri güncelleme hatası:", error);
        res.status(500).json({ error: "Veri güncellenirken bir hata oluştu." });
    }
});


router.get("/api/calisanlar/education", async (req, res) => {
    try {
        const result = await db.query(education_info_sql);
        res.json(result.rows);
    } catch (error) {
        console.log(error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});
router.get("/api/calisanlar/education/:id", async (req, res) => {
    const id = req.params.id;
    const educationById_sql = education_info_sql + ' WHERE e.employee_id = $1';

    try {
        const result = await db.query(educationById_sql, [id]);
        if (result.rows.length > 0) {
            res.json(result.rows[0]);
        } else {
            res.status(404).json({ error: 'Kullanıcı eğitim bilgisi bulunamadı.' });
        }
    } catch (error) {
        console.log(error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});
router.delete('/api/calisanlar/education/:id', async (req, res) => {
    const id = req.params.id;
    if (isNaN(id) || id <= 0) {
        return res.status(400).json({ message: 'Geçersiz ID.' });
    }
    try {
        const result = await db.query(`DELETE FROM Employee_Educations WHERE employee_id = $1`, [id]);

        if (result.rowCount > 0) {
            return res.status(200).json({ message: 'Kişi eğitim  bilgisi başarıyla silindi.' });
        } else {
            return res.status(404).json({ message: 'Kişi eğitim bilgisi bulunamadı.' });
        }
    } catch (error) {
        console.error(error);
        return res.status(500).json({ error: 'İç Sunucu Hatası', details: error.message });
    }
});
router.post("/api/calisanlar/education", async (req, res) => {
    const {
        employee_id,
        institution_type,
        institution_name,
        department,
        start_year,
        end_year,
        degree
    } = req.body;

    if (!employee_id || !institution_type || !institution_name || !start_year || !degree) {
        return res.status(400).json({ error: "Zorunlu alanlar eksik: employee_id, institution_type, institution_name, start_year, degree." });
    }

    try {
        const result = await db.query(
            `INSERT INTO Employee_Educations (
                employee_id, institution_type, institution_name, department, start_year, end_year, degree
            ) VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *`,
            [employee_id, institution_type, institution_name, department, start_year, end_year, degree]
        );

        res.status(201).json(result.rows[0]);
    } catch (error) {
        console.error("Veri ekleme hatası:", error);
        res.status(500).json({ error: "Eğitim bilgileri eklenirken bir hata oluştu." });
    }
});
router.patch("/api/calisanlar/education/:id", async (req, res) => {
    const educationId = req.params.id;
    const {
        institution_type,
        institution_name,
        department,
        start_year,
        end_year,
        degree
    } = req.body;

    try {
        const fields = [];
        const values = [];
        if (institution_type) {
            fields.push(`institution_type = $${fields.length + 1}`);
            values.push(institution_type);
        }
        if (institution_name) {
            fields.push(`institution_name = $${fields.length + 1}`);
            values.push(institution_name);
        }
        if (department) {
            fields.push(`department = $${fields.length + 1}`);
            values.push(department);
        }
        if (start_year) {
            fields.push(`start_year = $${fields.length + 1}`);
            values.push(start_year);
        }
        if (end_year) {
            fields.push(`end_year = $${fields.length + 1}`);
            values.push(end_year);
        }
        if (degree) {
            fields.push(`degree = $${fields.length + 1}`);
            values.push(degree);
        }

        if (fields.length === 0) {
            return res.status(400).json({ error: "Güncellenmesi gereken alan belirtilmedi." });
        }

        const query = `UPDATE Employee_Educations SET ${fields.join(", ")} WHERE employee_id = $${fields.length + 1} RETURNING *`;
        values.push(educationId);

        const result = await db.query(query, values);

        if (result.rows.length > 0) {
            res.json(result.rows[0]);
        } else {
            res.status(404).json({ error: "Eğitim kaydı bulunamadı." });
        }
    } catch (error) {
        console.error("Veri güncelleme hatası:", error);
        res.status(500).json({ error: "Eğitim bilgileri güncellenirken bir hata oluştu." });
    }
});



router.get("/api/calisanlar/body", async (req, res) => {
    try {
        const result = await db.query(body_info_sql);
        res.json(result.rows);
    } catch (error) {
        console.log(error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});
router.get("/api/calisanlar/body/:id", async (req, res) => {
    const id = req.params.id;
    const bodyById_sql = body_info_sql + ' WHERE e.employee_id = $1';

    try {
        const result = await db.query(bodyById_sql, [id]);
        if (result.rows.length > 0) {
            res.json(result.rows[0]);
        } else {
            res.status(404).json({ error: 'Kullanıcı beden bilgisi bulunamadı.' });
        }
    } catch (error) {
        console.log(error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});
router.delete('/api/calisanlar/body/:id', async (req, res) => {
    const id = req.params.id;
    if (isNaN(id) || id <= 0) {
        return res.status(400).json({ message: 'Geçersiz ID.' });
    }
    try {
        const result = await db.query(`DELETE FROM Employee_Body_Measurements WHERE employee_id = $1`, [id]);

        if (result.rowCount > 0) {
            return res.status(200).json({ message: 'Kişi beden bilgisi başarıyla silindi.' });
        } else {
            return res.status(404).json({ message: 'Kişi beden bilgisi bulunamadı.' });
        }
    } catch (error) {
        console.error(error);
        return res.status(500).json({ error: 'İç Sunucu Hatası', details: error.message });
    }
});
router.post("/api/calisanlar/body", async (req, res) => {
    const {
        employee_id,
        shoe_size,
        clothing_size,
        pant_size,
        coat_size,
        glove_size,
        helmet_size
    } = req.body;

    if (!employee_id) {
        return res.status(400).json({ error: "employee_id alanı gereklidir." });
    }

    try {
        const result = await db.query(
            `INSERT INTO Employee_Body_Measurements (
                employee_id, shoe_size, clothing_size, pant_size, coat_size, glove_size, helmet_size
            ) VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *`,
            [employee_id, shoe_size, clothing_size, pant_size, coat_size, glove_size, helmet_size]
        );

        res.status(201).json(result.rows[0]);
    } catch (error) {
        console.error("Veri ekleme hatası:", error);
        res.status(500).json({ error: "Beden ölçüleri eklenirken bir hata oluştu." });
    }
});
router.patch("/api/calisanlar/body/:id", async (req, res) => {
    const measurementId = req.params.id;
    const {
        shoe_size,
        clothing_size,
        pant_size,
        coat_size,
        glove_size,
        helmet_size
    } = req.body;

    try {
        const fields = [];
        const values = [];

        if (shoe_size) {
            fields.push(`shoe_size = $${fields.length + 1}`);
            values.push(shoe_size);
        }
        if (clothing_size) {
            fields.push(`clothing_size = $${fields.length + 1}`);
            values.push(clothing_size);
        }
        if (pant_size) {
            fields.push(`pant_size = $${fields.length + 1}`);
            values.push(pant_size);
        }
        if (coat_size) {
            fields.push(`coat_size = $${fields.length + 1}`);
            values.push(coat_size);
        }
        if (glove_size) {
            fields.push(`glove_size = $${fields.length + 1}`);
            values.push(glove_size);
        }
        if (helmet_size) {
            fields.push(`helmet_size = $${fields.length + 1}`);
            values.push(helmet_size);
        }

        if (fields.length === 0) {
            return res.status(400).json({ error: "Güncellenmesi gereken alan belirtilmedi." });
        }

        const query = `UPDATE Employee_Body_Measurements SET ${fields.join(", ")} WHERE employee_id = $${fields.length + 1} RETURNING *`;
        values.push(measurementId);

        const result = await db.query(query, values);

        if (result.rows.length > 0) {
            res.json(result.rows[0]);
        } else {
            res.status(404).json({ error: "Beden ölçüsü kaydı bulunamadı." });
        }
    } catch (error) {
        console.error("Veri güncelleme hatası:", error);
        res.status(500).json({ error: "Beden ölçüleri güncellenirken bir hata oluştu." });
    }
});

router.get("/api/attendance/daily", async (req, res) => {
    const attendanceDate = req.query.date || new Date().toISOString().slice(0, 10); // Tarih parametresi, yoksa bugünün tarihi
    try {
        const query = `
            SELECT a.employee_id, 
                   e.first_name, 
                   e.last_name, 
                   a.attendance_date,
                   a.check_in_time,
                   a.check_out_time,
                   a.status
            FROM Attendance a
            JOIN Employees e ON a.employee_id = e.employee_id
            WHERE a.attendance_date = $1;
        `;
        const result = await db.query(query, [attendanceDate]);
        res.json(result.rows);
    } catch (error) {
        console.error("Günlük katılım verileri alınırken bir hata oluştu:", error);
        res.status(500).json({ error: "Günlük katılım verileri alınırken bir hata oluştu." });
    }
});
router.get("/api/attendance", async (req, res) => {
    try {
        const query = `
            SELECT status, COUNT(*) as count 
            FROM Attendance 
            WHERE attendance_date = $1 
            GROUP BY status;
        `;
        const attendanceDate = req.query.date || new Date().toISOString().slice(0, 10); // Tarih parametresi
        const result = await db.query(query, [attendanceDate]);
        console.log(result);
        res.json(result.rows);
    } catch (error) {
        console.error("Çalışan durumları alınırken bir hata oluştu:", error);
        res.status(500).json({ error: "Çalışan durumları alınırken bir hata oluştu." });
    }
});
router.delete("/api/attendance/:id", async (req, res) => {
    try {
        const employeeId = req.params.id; // URL parametresinden Çalışan ID'sini al
        if (!employeeId) {
            return res.status(400).json({ error: "Geçersiz Çalışan ID." });
        }

        const attendanceDate = new Date().toISOString().slice(0, 10); // Bugünün tarihi

        const query = `
            DELETE FROM Attendance 
            WHERE employee_id = $1 AND attendance_date = $2 
            RETURNING *; -- Silinen kaydı geri döndür
        `;

        const result = await db.query(query, [employeeId, attendanceDate]);

        if (result.rowCount === 0) {
            return res.status(404).json({ error: "Silinecek kayıt bulunamadı." });
        }

        res.status(200).json({ message: "Kayıt başarıyla silindi.", deletedRecord: result.rows[0] });
    } catch (error) {
        console.error("Devamsızlık kaydı silinirken bir hata oluştu:", error);
        res.status(500).json({ error: "Devamsızlık kaydı silinirken bir hata oluştu." });
    }
});

router.get("/api/department-status", async (req, res) => {
    try {
        const query = `
            SELECT d.department_name AS department, COUNT(ep.employee_id) AS count
            FROM Employee_Positions ep
            JOIN Departments d ON ep.department = d.id
            GROUP BY d.department_name;
        `;
        const result = await db.query(query);
        res.json(result.rows);
    } catch (error) {
        console.error("Departman verileri alınırken bir hata oluştu:", error);
        res.status(500).json({ error: "Departman verileri alınırken bir hata oluştu." });
    }
});


export default router;
