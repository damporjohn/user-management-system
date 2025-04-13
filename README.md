# User Management System

A full-stack application for managing user accounts with features like email sign-up, verification, authentication, role-based authorization, and CRUD operations. Built using Node.js and MySQL for the backend, and Angular (v10, updated to v17) for the frontend. Includes features such as profile management, password recovery, admin dashboard, and even a fake backend mode for development without a live server.

This project is developed by:

John Vincent Dampor,
John Jecu Cutanda, 
Rey Mark Rivas,
Rod Kent Ito


## Installation Instructions:

  Install this in your system:

 • [Node.js](https://nodejs.org/en)

 • [MYSQL](https://www.mysql.com/) 

 • [Angular CLI](https://v17.angular.io/cli)

  ## Setting up the frontend (Angular):
1. Clone the repository:  
   `https://github.com/damporjohn/user-management-system.git`  
2. Install backend dependencies:   
   `npm install`  
3. Set up your environment variables by creating a `.env` file inside the `backend` folder:

```env
# Database Configuration
DB_HOST=your_db_host
DB_PORT=3306
DB_USER=your_db_user
DB_PASS=your_db_password
DB_NAME=your_db_name

# JWT Secret
JWT_SECRET=your_jwt_secret

# Email Configuration
EMAIL_FROM=your_email@example.com
SMTP_HOST=your_smtp_host
SMTP_PORT=your_smtp_port
SMTP_USER=your_smtp_user
SMTP_PASS=your_smtp_password
```

 4. Start the backend server:  
`npm start`

5. Install frontend dependencies and run the Angular app:
   
     • Directory 
    
      `cd ../frontend`
    
     • Dependencies  
    
      `npm install`
    
     • Start frontend server
    
      `ng serve`  

    ## Usage
   ### Register Account
     • Register a new account at `/accounts/register`
   
     • Check email for the verification link
   
   ### Verify your email
   
     • Verify your email using the link sent to your inbox.
   
   ### Login
   
    • Log in at `/accounts/login`.
   
   ### Access the dashboard
   
    • Access the dashboard and other features based on your role (admin/user).
   
   ### Manage your account
   
    • Manage your profile, change your password, or delete your account if needed.

   ### Testing:  
    • [Functional testing results](https://docs.google.com/document/d/14-NYugjVtZtmKZx0OU3p-VYpnjvCzG2uei2wqnE5gBg/edit?usp=sharing)
   
    • [Security testing results](https://docs.google.com/document/d/1yA2n1kgYDzU_MjLtzoBLvb59zafBJx01SozeLfB9rJc/edit?usp=sharing)

   ## Contributing:  

    • Fork the repository

   • Create a new branch (`feature/your-feature-name`)

   • Commit your changes with clear messages

   • Push your branch, and open a pull request

   • Review other pull requests

   • Resolve conflicts

   • Collaborate using GitHub issues and comments

License:  
MIT License


  ## Team Structure

  ### Group Leader: DAMPOR, JOHN VINCENT 
  "Responsible for managing the main branch, reviewing pull requests, and ensuring smooth integration."

  Backend Developers: DAMPOR, JOHN VINCENT and RIVAS, REY MARK

  Developer 1: Implement email sign-up, verification, and authentication.

  Developer 2: Implement role-based authorization, forgot password/reset password, and CRUD operations.

  Frontend Developers: CUTANDA, JOHN JECU

  Developer 3: Implement email sign-up, verification, and authentication.
  
  Developer 4: Implement profile management, admin dashboard, and fake backend.

  Testers: ITO, ROD KENT

  Tester 1: Perform functional testing and validate user flows.

  Tester 2: Perform security testing and validate edge cases.