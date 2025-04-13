const config = require('../config.json');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const crypto = require('crypto');
const { Op } = require('sequelize');
const sendEmail = require('../_helpers/send-email');
const db = require('../_helpers/db');
const Role = require('../_helpers/role');

module.exports = {
    authenticate,
    refreshToken,
    revokeToken,
    forgotPassword,
    register,
    verifyEmail,
    validateResetToken,
    resetPassword,
    getAll,
    getById,
    create,
    update,
    delete: _delete
};

async function authenticate({ email, password, ipAddress }) {
    try {
        // Parse input if it's a string
        if (typeof arguments[0] === 'string') {
            const params = JSON.parse(arguments[0]);
            email = params.email;
            password = params.password;
            ipAddress = params.ipAddress;
        }

        // Validate inputs
        if (!email || !password) {
            throw new Error('Email and password are required');
        }

        // Find account
        const account = await db.Account.findOne({ 
            where: { email },
            attributes: ['id', 'email', 'passwordHash', 'title', 'firstName', 'lastName', 'role', 'verified', 'created', 'updated']
        });
        
        if (!account) {
            throw new Error('Email or password is incorrect');
        }

        if (!account.verified) {
            throw new Error('Please verify your email before logging in');
        }

        // Verify password
        const isValid = await bcrypt.compare(password, account.passwordHash);
        if (!isValid) {
            throw new Error('Email or password is incorrect');
        }

        // authentication successful so generate jwt and refresh tokens
        const jwtToken = generateJwtToken(account);
        const refreshToken = generateRefreshToken(account, ipAddress);

        // save refresh token
        await refreshToken.save();

        // return basic details and tokens
        return {
            ...basicDetails(account),
            jwtToken,
            refreshToken: refreshToken.token
        };
    } catch (error) {
        throw new Error(`Authentication failed: ${error.message}`);
    }
}

async function refreshToken({ token, ipAddress }) {
    const refreshToken = await getRefreshToken(token);
    const account = await refreshToken.getAccount();

    // replace old refresh token with a new one and save
    const newRefreshToken = generateRefreshToken(account, ipAddress);
    refreshToken.revoked = Date.now();
    refreshToken.revokedByIp = ipAddress;
    refreshToken.replacedByToken = newRefreshToken.token;
    await refreshToken.save();
    await newRefreshToken.save();
    
    // generate new jwt
    const jwtToken = generateJwtToken(account);
    // return basic details and tokens
    return {
        ...basicDetails(account),
        jwtToken,
        refreshToken: newRefreshToken.token
    };
}

async function revokeToken({ token, ipAddress }) {
    const refreshToken = await getRefreshToken(token);

    // revoke token and save
    refreshToken.revoked = Date.now();
    refreshToken.revokedByIp = ipAddress;
    await refreshToken.save();
}

async function register(params, origin) {
    try {
        // Parse params if it's a string
        if (typeof params === 'string') {
            params = JSON.parse(params);
        }

        // validate
        if (await db.Account.findOne({ where: { email: params.email } })) {
            throw new Error(`Email '${params.email}' is already registered`);
        }

        // validate password strength
        if (params.password.length < 8) {
            throw new Error('Password must be at least 8 characters long');
        }

        if (!/\d/.test(params.password) || !/[a-zA-Z]/.test(params.password)) {
            throw new Error('Password must contain both letters and numbers');
        }

        // create account object
        const account = new db.Account(params);

        // first registered account is an admin
        const isFirstAccount = (await db.Account.count()) === 0;
        account.role = isFirstAccount ? 'Admin' : 'User';
        account.verificationToken = randomTokenString();

        // hash password
        account.passwordHash = await hash(params.password);

        // save account
        await account.save();

        // send email
        await sendVerificationEmail(account, origin);

        return { 
            message: 'Registration successful, please check your email for verification instructions',
            verificationToken: account.verificationToken // Only for testing purposes, remove in production
        };
    } catch (error) {
        throw new Error(`Registration failed: ${error.message}`);
    }
}

async function verifyEmail({ token }) {
    try {
        const account = await db.Account.findOne({ where: { verificationToken: token } });
        
        if (!account) {
            throw new Error('Verification failed: Token is invalid');
        }

        if (account.verified) {
            throw new Error('Email is already verified');
        }
        
        // Update account verification status
        account.verified = new Date();
        account.verificationToken = null;
        await account.save();

        return {
            message: "Verification successful, you can now login"
        };
    } catch (error) {
        throw new Error(`Verification failed: ${error.message}`);
    }
}

async function forgotPassword({ email }, origin) {
    const account = await db.Account.findOne({ where: { email } });

    // always return ok response to prevent email enumeration
    if (!account) return;

    // create reset token that expires after 24 hours
    account.resetToken = randomTokenString();
    account.resetTokenExpires = new Date(Date.now() +24*60*60*1000);
    await account.save();

    // send email
    await sendPasswordResetEmail(account, origin);
}    
    
async function validateResetToken({ token }) {
    const account = await db.Account.findOne({
        where: {
            resetToken: token,
            resetTokenExpires: { [Op.gt]: Date.now() }
        }
    });

    if (!account) throw 'Invalid token';

    return account;
}

async function resetPassword({ token, password }) {
    try {
        const account = await db.Account.findOne({
            where: {
                resetToken: token,
                resetTokenExpires: { [Op.gt]: Date.now() }
            }
        });

        if (!account) {
            throw new Error('Invalid or expired password reset token');
        }

        // validate password strength
        if (password.length < 8) {
            throw new Error('Password must be at least 8 characters long');
        }

        if (!/\d/.test(password) || !/[a-zA-Z]/.test(password)) {
            throw new Error('Password must contain both letters and numbers');
        }

        // update password and remove reset token
        account.passwordHash = await hash(password);
        account.passwordReset = Date.now();
        account.resetToken = null;
        account.resetTokenExpires = null;
        await account.save();

        return { message: 'Password reset successful, you can now login' };
    } catch (error) {
        throw new Error(`Password reset failed: ${error.message}`);
    }
}

async function getAll() {
    const accounts = await db.Account.findAll();
    return accounts.map(x => basicDetails(x));
}

async function getById(id) {
    const account = await getAccount(id);
    return basicDetails(account);
}

async function create(params) {
    //validate
    if (await db.Account.findOne({ where: {email: params.email } })) {
        throw 'Email "' + params.email + '" is already registered';
    }

    const account = new db.Account(params);
    account.verified = Date.now();

    //hash password
    account.passwordHash = await hash(params.password);

    //save password
    await account.save();

    return basicDetails(account);
}

async function update(id, params) {
    const account = await getAccount(id);
    
    // valldate (if email was changed)
    if (params.email && account.email !== params.email && await db.Account.findOne({ where: { email: params.email } })) {
        throw 'Email "' + params.email + '" is already taken';
    }

    //hash password if it was entered
    if (params.password) {
        params.passwordHash = await hash(params.password);
    }

    // copy params to account and save
    Object.assign(account, params);
    account.updated = Date.now();
    await account.save();

    return basicDetails(account);
}

async function _delete(id) {
    const account = await getAccount(id);
    await account.destroy();
}

// helper functions
async function getAccount(id) {
    const account = await db.Account.findByPk(id);
    if (!account) throw 'Account not found';
    return account;
}

async function getRefreshToken(token) {
    const refreshToken = await db.RefreshToken.findOne({ where: { token } });
    if (!refreshToken || !refreshToken.isActive) throw 'Invalid token';
    return refreshToken;
}

async function hash(password) {
    return await bcrypt.hash(password, 10);
}

function randomTokenString() {
    return crypto.randomBytes(40).toString('hex');
}

function generateJwtToken(account) {
    return jwt.sign({ sub: account.id, id: account.id }, config.secret, { expiresIn: '15m' });
}

function generateRefreshToken(account, ipAddress) {
    return new db.RefreshToken({
        accountId: account.id,
        token: randomTokenString(),
        expires: new Date(Date.now() + 7*24*60*60*1000), // 7 days
        createdByIp: ipAddress
    });
}

function basicDetails(account) {
    const { id, title, firstName, lastName, email, role, created, updated, isVerified } = account;
    return { id, title, firstName, lastName, email, role, created, updated, isVerified };
}

async function sendVerificationEmail(account, origin) {
    let message;
    if (origin) {
        const verifyUrl = `${origin}/account/verify-email?token=${account.verificationToken}`;
        message = `
            <p>Please click the below link to verify your email address:</p>
            <p><a href="${verifyUrl}">${verifyUrl}</a></p>`;
    } else {
        message = `
            <p>Please use the below token to verify your email address with the <code>/account/verify-email</code> api route:</p>
            <p><code>${account.verificationToken}</code></p>
            <p>To verify your email, make a POST request to: <code>/account/verify-email</code> with the following JSON body:</p>
            <pre>
            {
                "token": "${account.verificationToken}"
            }
            </pre>`;
    }

    await sendEmail({
        to: account.email,
        subject: 'Welcome! Verify Your Email',
        html: `
            <h4>Verify Your Email Address</h4>
            <p>Thank you for registering! Please verify your email address to complete the registration process.</p>
            ${message}
            <p>If you did not create this account, please ignore this email.</p>`
    });
}

async function sendAlreadyRegisteredEmail(email, origin) {
    let message;
    if (origin) {
        message = `
    <p>If you don't know your password please visit the <a href="${origin}/account/forgot-password">forgot password</a> page .</p>`;
    } else {
        message = `
    <p>If you don't know your password you can reset it via the <code>/account/forgot-password</code> api route .</p>`;
    }

    await sendEmail({
        to: email,
        subject: 'Sign-up Verification API - Email Already Registered',
        html: `<h4>Email Already Registered</h4>
               <p>Your email <strong>${email}</strong> is already registered.</p>
               ${message}`
    });
}

async function sendPasswordResetEmail(account, origin) {
    let message;
    if (origin) {
        const resetUrl = `${origin}/account/reset-password?token=${account.resetToken}`;
        message = `<p>Please click the below link to reset your password, the link will be valid for 1 day :</p>
                   <p><a href="${resetUrl}">${resetUrl}</a></p>`;
    } else {
        message = `<p>Please use the below token to reset your password with the <code>/account/reset-password</code> api route: </p>
                   <p><code>${account.resetToken}</code></p>`;
    }
    await sendEmail({
        to: account.email,
        subject: 'Sign-up Verification API - Reset Password',
        html: `<h4>Reset Password Email</h4>
               ${message}`
    });
}