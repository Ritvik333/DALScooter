# DALS Scooter Project

## Overview
The DALS Scooter project is a serverless, multi-cloud application developed for CSCI 5410/S25 by a team of ~4 members under the leadership of Sigma Jahan. This project, spanning approximately 2.5 months, aims to provide an eBike, gyroscooter, and segway rental system with features for guests, registered customers, and franchise operators. It includes user authentication, message passing, virtual assistance, notifications, data visualization, and a web application, implemented using AWS and GCP services with Terraform for infrastructure management.

## Features
- **User Management & Authentication (Module 1)**: Signup with validation, multi-factor authentication (MFA) using Cognito, Lambda, and DynamoDB.
- **Message Passing Module (Module 3)**: Asynchronous communication between customers and franchise operators using AWS SNS/SQS and DynamoDB logging.
- **Virtual Assistant (Module 2)**: Chatbot functionality with AWS Lex.
- **Notifications (Module 4)**: Email notifications for registration, login, and bookings via AWS SNS and SQS.
- **Data Analysis & Visualization (Module 5)**: Looker Studio dashboard for operators, feedback display, and sentiment analysis with google natural language.
- **Web Application (Module 6)**: React frontend hosted on AWS Fargate.

## Technologies
- **Cloud Platforms**: AWS (Cognito, Lambda, SNS, SQS, DynamoDB, QuickSight, Fargate).
- **Infrastructure**: Terraform (managed under LabRole constraints).
- **Frontend**: React.
- **Backend**: AWS API Gateway, Lambda functions.
- **Database**: DynamoDB.

## Setup Instructions
1. **Prerequisites**:
   - AWS and GCP accounts with appropriate credentials.
   - Terraform installed (v1.5+ recommended).
   - Node.js and npm for frontend development.
   - LabRole ARN (configured by lab environment).

2. **Installation**:
   - Clone the repository: `[https://github.com/Ritvik333/DALScooter.git]`.
   - Navigate to the project directory: `cd DALScooter`.
   - Install dependencies: `npm install` (in the `frontend` folder).
   - Configure environment variables in `.env` (e.g., AWS region, table names).

3. **Deployment**:
   - Run `terraform init` and `terraform apply` in the `terraform` directory to deploy infrastructure.
   - Deploy the frontend: `npm run build` and upload to AWS Fargate (manual step due to LabRole limits).
   - Update API Gateway stages manually if required.

4. **Running Locally**:
   - Start the frontend: `npm start` (runs on `http://localhost:3000`).
   - Test APIs using Postman or browser (e.g., `https://<api-id>.execute-api.us-east-1.amazonaws.com/prod/`).

## Project Structure
- `terraform/`: Terraform configuration files (e.g., `get-vehicles.tf`, `auth.tf`).
- `frontend/`: React application source code.
- `lambda/`: Lambda function code (e.g., `get_vehicles_handler.py`).

## Contributions
- **Team Members**: Akshita (B01020723), Ritvik (B01021909), Swapnik (B00992389), Bishad (B00973061).
- **Sprints**: 
  - Sprint 1: Planning and initial setup.
  - Sprint 2: Module 1 and Module 3 implementation.
  - Sprint 3: Completion of all modules (due Aug 01, 2025).

## License
This project is protected content for CSCI 5410/S25 and may not be shared, uploaded, or distributed outside the course (per `S25-5410-DALScooter-Project.pdf`).

## Contact
- Project Leader: Sigma Jahan
- Email: saurabh.dey@dal.ca (for course-related inquiries)

## Acknowledgements
- AWS for cloud services.
- Terraform for infrastructure management.
- React community for frontend development.
