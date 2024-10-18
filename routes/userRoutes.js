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
            Groups g ON eg.group_id = g.id`;

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
const personal_info_sql = `SELECT * FROM Employee_Personal_Information`;
const contact_info_sql = `SELECT * FROM Employee_Contacts`;
const education_info_sql = `SELECT * FROM Employee_Educations`;
const body_info_sql = `SELECT * FROM Employee_Body_Measurements`;

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
    res.render("../views/user/duyurular.ejs");
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

//user bilgisini görüntüleme ve alma işlemi
router.get("/api/user/:id", async (req, res) => {
    const id = req.params.id;
    const e_id = ` WHERE employees.employee_id = $1`;
    const userById_sql = user_info_sql + e_id;

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
router.patch("/api/user/:id", upload.single("profileImage"), async (req, res) => {
    const { id } = req.params;
    const { first_name, last_name, email, phone, password = {} } = req.body;
    console.log(req);
    const updates = [];
    const values = [];

    // Yüklenen dosyanın yolu
    const profileImage = req.file ? req.file.path : null;

    if (first_name) {
        updates.push("first_name = $" + (updates.length + 1));
        values.push(first_name);
    }

    if (last_name) {
        updates.push("last_name = $" + (updates.length + 1));
        values.push(last_name);
    }

    if (email) {
        updates.push("email = $" + (updates.length + 1));
        values.push(email);
    }

    if (phone) {
        updates.push("phone_number = $" + (updates.length + 1));
        values.push(phone);
    }

    if (profileImage) {
        updates.push("profile_image = $" + (updates.length + 1));
        values.push(profileImage);
    }

    if (updates.length === 0) {
        return res.status(400).json({ error: "Güncellenecek bir alan bulunamadı" });
    }

    values.push(id);

    const updateQuery = `
        UPDATE employees 
        SET ${updates.join(", ")} 
        WHERE employee_id = $${values.length}
        RETURNING *;
    `;

    try {
        const result = await db.query(updateQuery, values);

        if (result.rows.length === 0) {
            return res.status(404).json({ error: "Çalışan bulunamadı" });
        }

        res.json(result.rows[0]);
    } catch (error) {
        console.error("Güncelleme hatası:", error);
        res.status(500).json({ error: "Veritabanı güncelleme sırasında bir hata oluştu" });
    }
});
router.use((err, req, res, next) => {
    if (err instanceof multer.MulterError) {
        // Multer hatası
        return res.status(500).json({ error: "Multer hatası: " + err.message });
    } else if (err) {
        // Diğer hatalar
        return res.status(500).json({ error: "Hata: " + err.message });
    }
    next();
});

router.get("/api/job/:id", async (req, res) => {
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
router.patch("/api/job/:id", async (req, res) => {
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
        fields.push("job_description = $" + (values.length + 1));
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

router.get("/api/personal/:id", async (req, res) => {
    const id = req.params.id;
    const personalById_sql = personal_info_sql + ' WHERE employee_id = $1';

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
router.patch("/api/personal/:id", async (req, res) => {
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

router.get("/api/contact/:id", async (req, res) => {
    const id = req.params.id;
    const contactById_sql = contact_info_sql + ' WHERE employee_id = $1';

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
router.patch("/api/contact/:id", async (req, res) => {
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

        const query = `UPDATE Employee_Contacts SET ${fields.join(", ")} WHERE employee_id = $${fields.length + 1} RETURNING *`;
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

router.get("/api/education/:id", async (req, res) => {
    const id = req.params.id;
    const educationById_sql = education_info_sql + ' WHERE employee_id = $1';

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
router.patch("/api/education/:id", async (req, res) => {
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

router.get("/api/body/:id", async (req, res) => {
    const id = req.params.id;
    const bodyById_sql = body_info_sql + ' WHERE employee_id = $1';

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
router.patch("/api/body/:id", async (req, res) => {
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

router.get('/api/team/:department_id', async (req, res) => {
    const departmentId = req.params.department_id;

    try {
        const result = await db.query(
            `SELECT e.first_name, e.last_name, e.profile_image, d.department_name
             FROM Employees e
             JOIN Employee_Positions ep ON e.employee_id = ep.employee_id
             JOIN Departments d ON ep.department = d.id
             WHERE ep.department = $1`,
            [departmentId]
        );

        console.log("Sorgu sonucu:", result.rows); // Gelen sonuçları konsola yazdır

        if (result.rows.length > 0) {
            res.json(result.rows);
        } else {
            res.status(404).json({ message: 'Bu departmanda çalışan hiç kimse yok.' });
        }
    } catch (err) {
        console.error("Hata:", err);
        res.status(500).json({ message: 'Bir hata oluştu: ' + err.message });
    }
});

router.get('/api/user/department/:id', async (req, res) => {
    const userId = req.params.id;
    console.log("departman için id: " + userId);

    try {
        const result = await db.query(`
            SELECT ep.department 
            FROM Employee_Positions ep 
            WHERE ep.employee_id = $1
        `, [userId]);

        if (result.rows.length > 0) {
            res.json({ department_id: result.rows[0].department });
            console.log("Departman ID:", result.rows[0].department);
        } else {
            res.status(404).json({ error: 'Departman bulunamadı' });
        }
    } catch (error) {
        console.error('Hata:', error);
        res.status(500).json({ error: 'İç sunucu hatası: ' + error.message });
    }
});
export default router;