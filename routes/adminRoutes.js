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

router.get("/", (req, res) => {
    res.render("admin/admin.ejs");
});
// Duyurular route
router.get("/duyurular", (req, res) => {
    res.render("admin/aduyurular.ejs");
});

// Çalışanlar route
router.get('/calisanlar', async (req, res) => {
    try {
        const user_info_result = await db.query(user_info_sql);
        const job_info_result = await db.query(job_info_sql);
        const personal_info_result = await db.query(personal_info_sql);
        const contact_info_result = await db.query(contact_info_sql);
        const education_info_result = await db.query(education_info_sql);
        const body_info_result = await db.query(body_info_sql);

        res.render('admin/calisanlar.ejs', {
            employees: user_info_result.rows, job_info: job_info_result.rows,
            personal_info: personal_info_result.rows, contact_info: contact_info_result.rows,
            education_info: education_info_result.rows, body_info: body_info_result.rows,
        });

    } catch (err) {
        console.error(err);
        res.status(500).send('Bir hata oluştu.');
    }
});

export default router;
