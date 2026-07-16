# Fair Compensation and Resettlement Smart Contract System (FCR-SCS)

## Overview
The Fair Compensation and Resettlement Smart Contract System (FCR-SCS) is a digital governance solution developed to enhance the transparency, accountability, and efficiency of compensation and resettlement processes for communities affected by tourism infrastructure development in Malaysia. Developed in alignment with the Visit Malaysia 2026 (VM2026) campaign and United Nations Sustainable Development Goal 8 (SDG 8), the system replaces conventional paper-based compensation management with an integrated digital platform. It combines blockchain technology, artificial intelligence (AI), image processing, and smart contracts to ensure equitable compensation for displaced artisanal fishers, smallholder farmers, and coastal residents.

## Key Features
* **User Management and Dashboard:** Role-based access control for administrators, government officers, land valuers, and displaced community members, featuring centralised dashboards with real-time statistics.
* **Land Acquisition and Case Management:** End-to-end tracking of the acquisition lifecycle, statutory form generation, and secure document management in compliance with the Land Acquisition Act 1960.
* **AI Asset Valuation:** Computer vision and machine learning models utilising OpenCV and Scikit-learn to detect assets, estimate fair market values, and identify potential valuation discrepancies.
* **Compensation Management:** Automated calculation of comprehensive compensation packages, approval workflows, and digital offer generation.
* **Smart Contract and Blockchain Integration:** Immutable recording of compensation agreements and automated execution of payment conditions using Solidity smart contracts on the Ethereum Sepolia Testnet.
* **Payment Integration:** Secure simulation of off-chain bank transactions and cryptographic notarisation of payment receipts on the blockchain.
* **Reporting and Analytics:** Interactive data visualisation using Chart.js and automated generation of compliance, audit, and valuation reports.
* **System Audit and Monitoring:** Comprehensive logging of user activities, system anomalies, and statutory deadline tracking to ensure institutional accountability.

## Technology Stack
* **Frontend:** React.js, Tailwind CSS, Chart.js
* **Backend:** Node.js, Express, RESTful API
* **AI Service:** Python, Scikit-learn, TensorFlow, OpenCV
* **Database:** PostgreSQL
* **Blockchain:** Solidity, Ethereum Sepolia Testnet, Ethers.js, MetaMask
* **Reporting:** jsPDF, PDFKit

## Prerequisites
Ensure the following software and tools are installed on your development environment before proceeding with the setup.
* Node.js and npm
* Python 3.9 or higher
* PostgreSQL
* Git
* MetaMask Browser Extension
* Hardhat or Truffle for smart contract compilation and deployment

## Setup and Installation

### 1. Clone the Repository
```bash
git clone https://github.com/your-username/fcr-scs.git
cd fcr-scs
```

### 2. Database Configuration
Initialize the PostgreSQL database and configure the connection credentials.
```bash
createdb fcr_scs_db
psql -d fcr_scs_db -f database/schema.sql
```

### 3. Backend Setup
Navigate to the backend directory, install dependencies, and configure environment variables.
```bash
cd backend
npm install
cp .env.example .env
```
Update the `.env` file with your PostgreSQL credentials, JSON Web Token (JWT) secrets, and AI service endpoint.

### 4. AI Service Setup
Navigate to the AI service directory, create a virtual environment, and install the required Python packages.
```bash
cd ../ai-service
python -m venv venv
source venv/bin/activate
```
For Windows systems, execute `venv\Scripts\activate` instead. Proceed to install the dependencies.
```bash
pip install -r requirements.txt
```

### 5. Frontend Setup
Navigate to the frontend directory and install the necessary React dependencies.
```bash
cd ../frontend
npm install
cp .env.example .env
```
Update the `.env` file with the backend application programming interface (API) URL and smart contract addresses.

### 6. Smart Contract Compilation
Navigate to the blockchain directory to compile the Solidity smart contracts.
```bash
cd ../blockchain
npm install
npx hardhat compile
```

## Running the Application

### 1. Start the Database
Ensure your PostgreSQL server is running and accessible.

### 2. Start the AI Service
```bash
cd ai-service
source venv/bin/activate
python app.py
```
The AI service will start on the designated port, typically port 5000.

### 3. Start the Backend Server
```bash
cd backend
npm run dev
```
The Node.js server will start and connect to the PostgreSQL database.

### 4. Start the Frontend Application
```bash
cd frontend
npm start
```
The React application will launch in your default web browser.

## Smart Contract Deployment
To deploy the smart contracts to the Ethereum Sepolia Testnet, ensure your MetaMask wallet is funded with Sepolia ETH and configure the private key in the blockchain environment variables.
```bash
cd blockchain
npx hardhat run scripts/deploy.js --network sepolia
```
Upon successful deployment, update the frontend environment variables with the newly generated smart contract address.

## Environment Variables
The project requires several environment variables to be configured across the frontend, backend, and blockchain modules. These include database connection strings, JWT secrets, AI service endpoints, blockchain network URLs, and deployer private keys. Refer to the `.env.example` files in each respective directory for the complete list of required variables.

## Project Context
This project is developed as part of the BMSE3004 Collaborative Development course. It addresses the socioeconomic impacts of compulsory land acquisition for tourism infrastructure by providing a mathematically sound and cryptographically secure valuation and compensation framework.

## Team
* Cham Herman: Project Manager and Development Lead
* Lum Siew Feng: Requirement Lead
* Wong Kai Bin: Design Lead
* Yeow Wei Kang: Testing Lead