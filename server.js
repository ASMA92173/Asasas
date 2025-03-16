const express = require('express');
const bodyParser = require('body-parser');
const path = require('path');
const bcrypt = require('bcryptjs');
const session = require('express-session');
const db = require('./database');

const app = express();

app.use(bodyParser.urlencoded({ extended: true }));

app.use(session({
    secret: 'your-super-secret-key-here',
    resave: false,
    saveUninitialized: false,
    cookie: {
        secure: false, // set to true if using HTTPS
        httpOnly: true,
        maxAge: 24 * 60 * 60 * 1000 // 24 hours
    }
}));

app.get('/', (req, res) => {
    if (req.session.loggedin) {
        res.send('Welcome back, ' + req.session.username + '!');
    } else {
        res.sendFile(path.join(__dirname, 'login.html'));
    }
});

app.get('/register', (req, res) => {
    res.sendFile(path.join(__dirname, 'register.html'));
});

// تحديث معالجة أخطاء التسجيل
app.post('/register', async (req, res, next) => {
    try {
        const { username, password, email } = req.body;
        
        // التحقق من البيانات
        if (!username || !password || !email) {
            return res.status(400).send('جميع الحقول مطلوبة');
        }
        
        const hashedPassword = await bcrypt.hash(password, 10);
        const sql = "INSERT INTO users (username, password, email) VALUES (?, ?, ?)";
        
        try {
            await db.execute(sql, [username, hashedPassword, email]);
            res.send('تم التسجيل بنجاح! <a href="/">اضغط هنا لتسجيل الدخول</a>');
        } catch (dbError) {
            if (dbError.code === 'ER_DUP_ENTRY') {
                res.status(400).send('اسم المستخدم أو البريد الإلكتروني مستخدم بالفعل');
            } else {
                throw dbError;
            }
        }
    } catch (error) {
        next(error);
    }
});

// تحسين رسائل خطأ تسجيل الدخول
app.post('/login', async (req, res, next) => {
    try {
        const { username, password } = req.body;
        
        if (!username || !password) {
            return res.status(400).send('يرجى إدخال اسم المستخدم وكلمة المرور');
        }

        const sql = "SELECT * FROM users WHERE username = ?";
        const [rows] = await db.execute(sql, [username]);
        
        if (rows.length > 0) {
            const comparison = await bcrypt.compare(password, rows[0].password);
            if (comparison) {
                req.session.loggedin = true;
                req.session.username = username;
                res.send('Welcome back, ' + username + '!');
            } else {
                res.status(401).send('Incorrect Username and/or Password!');
            }
        } else {
            res.status(401).send('Incorrect Username and/or Password!');
        }
    } catch (error) {
        next(error);
    }
});

app.get('/logout', (req, res) => {
    req.session.destroy((err) => {
        res.redirect('/');
    });
});

// تحديث middleware معالجة الأخطاء
app.use((err, req, res, next) => {
    console.error(err.stack);
    
    // معالجة أخطاء محددة
    if (err.code === 'ECONNREFUSED') {
        return res.status(503).send('خطأ في الاتصال بقاعدة البيانات. الرجاء المحاولة لاحقاً');
    }
    
    if (err instanceof SyntaxError) {
        return res.status(400).send('خطأ في تنسيق البيانات المرسلة');
    }
    
    // رسالة خطأ عامة
    res.status(500).send('حدث خطأ في النظام. الرجاء المحاولة مرة أخرى');
});

// تحسين معالجة الأخطاء غير المتوقعة
process.on('unhandledRejection', (error) => {
    console.error('خطأ غير معالج:', error);
});

const PORT = 3000;
app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
