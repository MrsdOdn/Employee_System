import pg from "pg";
import dotenv from "dotenv";

dotenv.config();

const db = new pg.Client({
    user: process.env.PG_USER,
    host: process.env.PG_HOST,
    database: process.env.PG_DATABASE,
    password: process.env.PG_PASSWORD,
    port: process.env.PG_PORT,
});

// Bağlantıyı aç
db.connect(err => {
    if (err) {
        console.error('Bağlantı hatası', err.stack);
    } else {
        console.log('Veritabanına başarıyla bağlandı');
    }
});

// Veritabanı bağlantısını kapatma fonksiyonu
const closeConnection = async () => {
    try {
        await db.end();
        console.log('Veritabanı bağlantısı kapatıldı');
    } catch (err) {
        console.error('Bağlantı kapatılırken hata oluştu', err.stack);
    }
};

// Uygulama kapatıldığında bağlantıyı kapatmak için kullanılır.
process.on('SIGINT', async () => {
    await closeConnection();
    process.exit(0);
});


export default db;
