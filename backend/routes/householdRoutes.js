const express = require('express');
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

    const getNextHouseholdId = async () => {
        const lastHousehold = await db
            .collection('Households')
            .find({ HouseholdID: { $exists: true } })
            .sort({ HouseholdID: -1 })
            .limit(1)
            .toArray();
        return lastHousehold.length > 0 ? Number(lastHousehold[0].HouseholdID) + 1 : 1;
    };

    // POST /api/households
    router.post('/', async (req, res) => {
        try {
            const { HouseholdName, UserID, CreatedByUserID } = req.body || {};
            const creatorUserId = Number(UserID || CreatedByUserID);

            if (!HouseholdName || !creatorUserId) {
                return res.status(400).json({ error: 'HouseholdName and UserID are required' });
            }

            const creator = await db.collection('Users').findOne({ UserID: creatorUserId });
            if (!creator) {
                return res.status(404).json({ error: 'Creator user not found' });
            }

            const newHouseholdId = await getNextHouseholdId();

            const household = {
                HouseholdID: newHouseholdId,
                HouseholdName,
                MemberIDs: [creatorUserId],
                InviteCode: String(newHouseholdId),
                CreatedAt: new Date().toISOString()
            };

            await db.collection('Households').insertOne(household);
            await db.collection('Users').updateOne(
                { UserID: creatorUserId },
                { $set: { HouseholdID: newHouseholdId, UpdatedAt: new Date().toISOString() } }
            );

            res.status(200).json({
                error: '',
                HouseholdID: newHouseholdId,
                InviteCode: household.InviteCode
            });
        } catch (e) {
            console.error("HOUSEHOLD CREATE ERROR:", JSON.stringify(e, null, 2));
            res.status(500).json({ error: e.toString() });
        }
    });

    // GET /api/households/:id
    router.get('/:id', async (req, res) => {
        try {
            const householdId = Number(req.params.id);
            if (!householdId) return res.status(400).json({ error: 'HouseholdID is required' });

            const household = await db.collection('Households').findOne({ HouseholdID: householdId });
            if (!household) return res.status(404).json({ error: 'Household not found' });

            res.status(200).json({
                error: '',
                result: {
                    HouseholdID: household.HouseholdID,
                    HouseholdName: household.HouseholdName,
                    MemberIDs: household.MemberIDs || [],
                    InviteCode: household.InviteCode || String(household.HouseholdID)
                }
            });
        } catch (e) {
            res.status(500).json({ error: e.toString() });
        }
    });

    // POST /api/households/:id/invite
    // incoming: Email (optional — if omitted, just returns the code)
    // outgoing: InviteCode, error
    router.post('/:id/invite', async (req, res) => {
        try {
            const householdId = Number(req.params.id);
            const { Email } = req.body || {};

            const household = await db.collection('Households').findOne({ HouseholdID: householdId });
            if (!household) return res.status(404).json({ error: 'Household not found' });

            const inviteCode = household.InviteCode || String(household.HouseholdID);

            // Send email if one was provided
            if (Email) {
                // Block if already a household member
                const existingUser = await db.collection("Users").findOne({ Email: Email.toLowerCase() });
                if (existingUser && (household.MemberIDs || []).includes(existingUser.UserID)) {
                    return res.status(400).json({ error: "This person is already a member of your household." });
                }

                const joinLink = `http://localhost:5173/join`;
                await transporter.sendMail({
                    from: "avatheboss56@gmail.com",
                    to: Email,
                    subject: "You've been invited to join a household on OurPlace!",
                    html: `
                        <h2>You're invited! 🏠</h2>
                        <p>Someone invited you to join their household on <strong>OurPlace</strong>.</p>
                        <p>Use the invite code below when signing up:</p>
                        <h1 style="letter-spacing: 4px; font-family: monospace;">${inviteCode}</h1>
                        <a href="${joinLink}" style="
                            display: inline-block;
                            margin-top: 12px;
                            padding: 12px 24px;
                            background: #8B3A3A;
                            color: white;
                            border-radius: 8px;
                            text-decoration: none;
                            font-weight: bold;
                        ">Join Now</a>
                    `
                });
            }

            res.status(200).json({ error: '', InviteCode: inviteCode });
        } catch (e) {
            console.error("INVITE ERROR:", e);
            res.status(500).json({ error: e.toString() });
        }
    });

    // POST /api/households/join
    router.post('/join', async (req, res) => {
        try {
            const { HouseholdID, InviteCode, UserID } = req.body || {};
            const userId = Number(UserID);
            const householdId = HouseholdID ? Number(HouseholdID) : Number(InviteCode);

            if (!householdId || !userId) {
                return res.status(400).json({ error: 'HouseholdID (or InviteCode) and UserID are required' });
            }

            const household = await db.collection('Households').findOne({ HouseholdID: householdId });
            if (!household) return res.status(404).json({ error: 'Household not found' });

            const user = await db.collection('Users').findOne({ UserID: userId });
            if (!user) return res.status(404).json({ error: 'User not found' });

            await db.collection('Users').updateOne(
                { UserID: userId },
                { $set: { HouseholdID: householdId, UpdatedAt: new Date().toISOString() } }
            );

            await db.collection('Households').updateOne(
                { HouseholdID: householdId },
                { $addToSet: { MemberIDs: userId } }
            );

            res.status(200).json({ error: '', HouseholdID: householdId });
        } catch (e) {
            res.status(500).json({ error: e.toString() });
        }
    });

    return router;
};