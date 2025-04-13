const { DataTypes } = require('sequelize');

module.exports = model;

function model(sequelize) {
    const attributes = {
        email: {
            type: DataTypes.STRING,
            allowNull: false,
            unique: true,
            validate: {
                isEmail: {
                    msg: 'Please enter a valid email address'
                },
                notNull: {
                    msg: 'Email is required'
                }
            }
        },
        passwordHash: {
            type: DataTypes.STRING,
            allowNull: false,
            validate: {
                notNull: {
                    msg: 'Password is required'
                }
            }
        },
        title: {
            type: DataTypes.STRING,
            validate: {
                isIn: {
                    args: [['Mr', 'Mrs', 'Miss', 'Ms', 'Dr']],
                    msg: 'Invalid title selected'
                }
            }
        },
        firstName: {
            type: DataTypes.STRING,
            allowNull: false,
            validate: {
                notNull: {
                    msg: 'First name is required'
                },
                len: {
                    args: [2, 50],
                    msg: 'First name must be between 2 and 50 characters'
                }
            }
        },
        lastName: {
            type: DataTypes.STRING,
            allowNull: false,
            validate: {
                notNull: {
                    msg: 'Last name is required'
                },
                len: {
                    args: [2, 50],
                    msg: 'Last name must be between 2 and 50 characters'
                }
            }
        },
        acceptTerms: {
            type: DataTypes.BOOLEAN,
            allowNull: false,
            validate: {
                notNull: {
                    msg: 'Terms must be accepted'
                },
                is: {
                    args: true,
                    msg: 'Terms must be accepted'
                }
            }
        },
        role: {
            type: DataTypes.STRING,
            allowNull: false,
            validate: {
                isIn: {
                    args: [['Admin', 'User']],
                    msg: 'Invalid role selected'
                }
            }
        },
        verificationToken: {
            type: DataTypes.STRING
        },
        verified: {
            type: DataTypes.DATE
        },
        resetToken: {
            type: DataTypes.STRING
        },
        resetTokenExpires: {
            type: DataTypes.DATE,
            validate: {
                isDate: {
                    msg: 'Invalid date for token expiration'
                }
            }
        },
        passwordReset: {
            type: DataTypes.DATE
        },
        created: { 
            type: DataTypes.DATE, 
            allowNull: false, 
            defaultValue: DataTypes.NOW
        },
        updated: { 
            type: DataTypes.DATE,
            defaultValue: DataTypes.NOW
        },
        isVerified: {
            type: DataTypes.VIRTUAL,
            get() { return !!(this.verified || this.passwordReset); }
        }
    };

    const options = {
        timestamps: true,
        createdAt: 'created',
        updatedAt: 'updated',
        defaultScope: {
            attributes: { exclude: ['passwordHash'] }
        },
        scopes: {
            withHash: { attributes: {} }
        }
    };

    return sequelize.define('account', attributes, options);
}