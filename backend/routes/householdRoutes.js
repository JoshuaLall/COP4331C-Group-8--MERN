const express = require('express');
const router = express.Router();
const { Resend } = require('resend');

const resend = process.env.RESEND_API_KEY
    ? new Resend(process.env.RESEND_API_KEY)
    : null;
const EMAIL_FROM = process.env.EMAIL_FROM || 'OurPlace <noreply@cop4331c.com>';
const FRONTEND_BASE_URL = (process.env.FRONTEND_BASE_URL || 'http://localhost:5173').replace(/\/$/, '');

async function sendEmailOrLog({ to, subject, html, fallbackLink }) {
    if (!resend) {
        console.log(`Household invite email skipped for ${to}; RESEND_API_KEY is not configured.`);
        console.log(`Household invite link: ${fallbackLink}`);
        return;
    }

    await resend.emails.send({
        from: EMAIL_FROM,
        to,
        subject,
        html
    });
}

module.exports = function (db) {

    const INVITE_CODE_LENGTH = 6;
    const INVITE_CODE_CHARS = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

    const generateInviteCode = () => {
        let code = "";
        for (let i = 0; i < INVITE_CODE_LENGTH; i++) {
            code += INVITE_CODE_CHARS[Math.floor(Math.random() * INVITE_CODE_CHARS.length)];
        }
        return code;
    };

    const isValidInviteCode = (code) =>
        typeof code === "string" && /^[A-Z0-9]{6}$/.test(code.trim().toUpperCase());

    const getUniqueInviteCode = async () => {
        for (let attempt = 0; attempt < 25; attempt++) {
            const code = generateInviteCode();
            const exists = await db.collection("Households").findOne({ InviteCode: code });
            if (!exists) return code;
        }
        throw new Error("Unable to generate a unique invite code");
    };

    const ensureHouseholdInviteCode = async (household) => {
        const existingCode = (household?.InviteCode || "").toString().trim().toUpperCase();
        if (isValidInviteCode(existingCode)) {
            return existingCode;
        }

        const newCode = await getUniqueInviteCode();
        await db.collection("Households").updateOne(
            { HouseholdID: household.HouseholdID },
            { $set: { InviteCode: newCode } }
        );
        return newCode;
    };

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
            const householdInviteCode = await getUniqueInviteCode();

            const household = {
                HouseholdID: newHouseholdId,
                HouseholdName,
                MemberIDs: [creatorUserId],
                InviteCode: householdInviteCode,
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
                InviteCode: householdInviteCode
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

            const inviteCode = await ensureHouseholdInviteCode(household);

            res.status(200).json({
                error: '',
                result: {
                    HouseholdID: household.HouseholdID,
                    HouseholdName: household.HouseholdName,
                    MemberIDs: household.MemberIDs || [],
                    InviteCode: inviteCode
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

            const inviteCode = await ensureHouseholdInviteCode(household);

            if (Email) {
                const normalizedEmail = String(Email).trim().toLowerCase();
                const existingUser = await db.collection("Users").findOne({ Email: normalizedEmail });
                if (existingUser && (household.MemberIDs || []).includes(existingUser.UserID)) {
                    return res.status(400).json({ error: "This person is already a member of your household." });
                }

                const joinLink = `${FRONTEND_BASE_URL}/join?code=${inviteCode}&email=${encodeURIComponent(normalizedEmail)}`;
                await sendEmailOrLog({
                    to: normalizedEmail,
                    subject: "You've been invited to join a household on OurPlace!",
                    fallbackLink: joinLink,
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
            let household = null;

            if (!userId || (!HouseholdID && !InviteCode)) {
                return res.status(400).json({ error: 'HouseholdID (or InviteCode) and UserID are required' });
            }

            if (!req.user || Number(req.user.UserID) !== userId) {
                return res.status(403).json({ error: 'Not authorized to transfer this user' });
            }

            if (HouseholdID) {
                household = await db.collection('Households').findOne({ HouseholdID: Number(HouseholdID) });
            } else {
                const normalizedCode = String(InviteCode).trim().toUpperCase();
                household = await db.collection('Households').findOne({ InviteCode: normalizedCode });

                if (!household && /^\d+$/.test(normalizedCode)) {
                    household = await db.collection('Households').findOne({ HouseholdID: Number(normalizedCode) });
                }
            }

            if (!household) return res.status(404).json({ error: 'Invalid invite code or household not found' });

            const user = await db.collection('Users').findOne({ UserID: userId });
            if (!user) return res.status(404).json({ error: 'User not found' });

            const currentHouseholdId = user.HouseholdID;

            if (currentHouseholdId && currentHouseholdId === household.HouseholdID) {
                return res.status(400).json({ error: 'You are already in this household' });
            }

            if (currentHouseholdId && currentHouseholdId !== household.HouseholdID) {
                await db.collection('Households').updateOne(
                    { HouseholdID: currentHouseholdId },
                    { $pull: { MemberIDs: userId } }
                );

                await db.collection('Chores').updateMany(
                    { AssignedToUserID: userId, HouseholdID: currentHouseholdId },
                    {
                        $set: {
                            AssignedToUserID: null,
                            Status: 'open',
                            CompletedAt: null,
                            CompletedByUserID: null,
                            UpdatedAt: new Date().toISOString()
                        }
                    }
                );

                await db.collection('RecurringChores').updateMany(
                    { DefaultAssignedUserID: userId, HouseholdID: currentHouseholdId },
                    {
                        $set: {
                            DefaultAssignedUserID: null,
                            UpdatedAt: new Date().toISOString()
                        }
                    }
                );

                const oldHousehold = await db.collection('Households').findOne({ HouseholdID: currentHouseholdId });

                if (oldHousehold && (!oldHousehold.MemberIDs || oldHousehold.MemberIDs.length === 0)) {
                    await db.collection('Households').deleteOne({ HouseholdID: currentHouseholdId });
                    await db.collection('Chores').deleteMany({ HouseholdID: currentHouseholdId });
                    await db.collection('RecurringChores').deleteMany({ HouseholdID: currentHouseholdId });
                }
            }

            const householdInviteCode = await ensureHouseholdInviteCode(household);

            await db.collection('Users').updateOne(
                { UserID: userId },
                { $set: { HouseholdID: household.HouseholdID, UpdatedAt: new Date().toISOString() } }
            );

            await db.collection('Households').updateOne(
                { HouseholdID: household.HouseholdID },
                { $addToSet: { MemberIDs: userId } }
            );

            res.status(200).json({
                error: '',
                HouseholdID: household.HouseholdID,
                InviteCode: householdInviteCode
            });
        } catch (e) {
            res.status(500).json({ error: e.toString() });
        }
    });


    // PUT /api/households/:id - Added this to update household name
    router.put('/:id', async (req, res) => {
        try {
            const householdId = Number(req.params.id);
            const { HouseholdName } = req.body;

            if (!householdId) {
                return res.status(400).json({ error: 'HouseholdID is required' });
            }

            if (!HouseholdName || !HouseholdName.trim()) {
                return res.status(400).json({ error: 'HouseholdName is required' });
            }

            const result = await db.collection('Households').updateOne(
                { HouseholdID: householdId },
                { $set: { HouseholdName: HouseholdName.trim() } }
            );

            if (result.matchedCount === 0) {
                return res.status(404).json({ error: 'Household not found' });
            }

            res.status(200).json({ error: '' });
        } catch (e) {
            res.status(500).json({ error: e.toString() });
        }
    });

    return router;
};
