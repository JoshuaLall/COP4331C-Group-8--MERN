const express = require('express');
const { Int32 } = require('mongodb');
const router = express.Router();
const nodemailer = require("nodemailer");

const transporter = nodemailer.createTransport({
    service: "gmail",
    auth: {
        user: "avatheboss56@gmail.com",
        pass: "htdezyjhefxwwxrv"
    }
});

module.exports = function (db) {
    const getNextUserId = async () => {
        const lastUser = await db
            .collection('Users')
            .find({ UserID: { $exists: true } })
            .sort({ UserID: -1 })
            .limit(1)
            .toArray();
        return lastUser.length > 0 ? Number(lastUser[0].UserID) + 1 : 1;
    };

    // POST /api/auth/register
    router.post('/register', async (req, res) => {
        console.log("REGISTER ROUTE HIT");
        try {
            const { FirstName, LastName, Login, Username, Password, Email } = req.body;
            const normalizedLogin = Login || Username;

            if (!FirstName || !normalizedLogin || !Password || !Email) {
                return res.status(400).json({ error: 'Missing required fields' });
            }

            const existing = await db.collection('Users').findOne({
                $or: [{ Login: normalizedLogin }, { Email: Email.toLowerCase() }]
            });
            if (existing) return res.status(400).json({ error: 'Login or Email already in use' });

            const nextUserId = await getNextUserId();
            const verifyToken = Math.random().toString(36).substring(2);

            const newUser = {
                UserID: new Int32(nextUserId),
                FirstName,
                LastName: LastName || '',
                Login: normalizedLogin,
                Password,
                Email: Email.toLowerCase(),
                Verified: false,
                VerifyToken: verifyToken,
                ResetToken: '',
                ResetExpires: null,
                HouseholdId: null,
                CreatedAt: new Date().toISOString(),
                UpdatedAt: new Date().toISOString()
            };

            const result = await db.collection('Users').insertOne(newUser);

            const verifyLink = `http://localhost:5173/verify-email?token=${verifyToken}`;
            await transporter.sendMail({
                from: "avatheboss56@gmail.com",  // ← was "YOUR_GMAIL@gmail.com"
                to: Email,
                subject: "Verify your OurPlace account",
                html: `
                    <h2>Verify your account</h2>
                    <p>Click the link below to verify your email:</p>
                    <a href="${verifyLink}">${verifyLink}</a>
                `
            });

            res.status(200).json({ UserID: new Int32(nextUserId), MongoID: result.insertedId, error: '' });
        } catch (e) {
            console.error("REGISTER ERROR:", JSON.stringify(e, null, 2));
            res.status(500).json({ error: e.toString() });
        }
    });

    // POST /api/auth/login
    router.post('/login', async (req, res) => {
        try {
            const { Login, Password } = req.body;
            const user = await db.collection('Users').findOne({ Login, Password });
            if (!user) return res.status(400).json({ error: 'Invalid username/password' });

            res.status(200).json({
                UserID: user.UserID,
                FirstName: user.FirstName,
                LastName: user.LastName,
                HouseholdID: user.HouseholdID,
                error: ''
            });
        } catch (e) {
            res.status(500).json({ error: e.toString() });
        }
    });

    // POST /api/auth/verify-email
    router.post('/verify-email', async (req, res) => {
        try {
            const { VerifyToken } = req.body;
            const user = await db.collection('Users').findOne({ VerifyToken });
            if (!user) return res.status(400).json({ error: 'Invalid token' });

            await db.collection('Users').updateOne(
                { VerifyToken },
                { $set: { Verified: true, VerifyToken: '' } }
            );
            res.status(200).json({ error: '' });
        } catch (e) {
            res.status(500).json({ error: e.toString() });
        }
    });

    // POST /api/auth/forgot-password
    router.post('/forgot-password', async (req, res) => {
        try {
            const { Email } = req.body;
            const user = await db.collection('Users').findOne({ Email });
            if (!user) return res.status(400).json({ error: 'Email not found' });

            const ResetToken = Math.random().toString(36).substring(2);
            const ResetExpires = new Date(Date.now() + 3600000);

            await db.collection('Users').updateOne(
                { Email },
                { $set: { ResetToken, ResetExpires } },
            );

            // ← was missing entirely — now actually sends the email
            const resetLink = `http://localhost:5173/reset-password?token=${ResetToken}`;
            await transporter.sendMail({
                from: "avatheboss56@gmail.com",
                to: Email,
                subject: "Reset your OurPlace password",
                html: `
                    <h2>Reset your password</h2>
                    <p>Click the link below to reset your password. This link expires in 1 hour.</p>
                    <a href="${resetLink}">${resetLink}</a>
                    <p>If you didn't request this, you can ignore this email.</p>
                `
            });

            res.status(200).json({ error: '' });
        } catch (e) {
            res.status(500).json({ error: e.toString() });
        }
    });

    // POST /api/auth/reset-password
    router.post('/reset-password', async (req, res) => {
        try {
            const { ResetToken, Password } = req.body;
            const user = await db.collection('Users').findOne({ ResetToken });
            if (!user) return res.status(400).json({ error: 'Invalid token' });
            if (new Date() > new Date(user.ResetExpires)) return res.status(400).json({ error: 'Reset token has expired' });

            await db.collection('Users').updateOne(
                { ResetToken },
                { $set: { Password, ResetToken: '', ResetExpires: null, UpdatedAt: new Date().toISOString() } }
            );
            res.status(200).json({ error: '' });
        } catch (e) {
            res.status(500).json({ error: e.toString() });
        }
    });

    // GET /api/auth/me
    router.get('/me', async (req, res) => {
        try {
            const { UserID } = req.query;
            const user = await db.collection('Users').findOne({ UserID: Number(UserID) });
            if (!user) return res.status(400).json({ error: 'User not found' });

            res.status(200).json({
                UserID: user.UserID,
                FirstName: user.FirstName,
                LastName: user.LastName,
                Email: user.Email,
                HouseholdID: user.HouseholdID,
                error: ''
            });
        } catch (e) {
            res.status(500).json({ error: e.toString() });
        }
    });

    return router;
};