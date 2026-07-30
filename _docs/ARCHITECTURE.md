# Layered Architecture Mapping

## How the Layered Model Fits Your Tech Stack

In a modern web stack like yours (React.js, Node.js, Python), it is very common to split projects simply into `frontend/` and `backend/`. However, to strictly align your physical folder structure with your **Layered Architecture Diagram**, you can adopt a **Monorepo** approach. 

Here is how your specific technologies map to the layers:

1. **Presentation Layer (Frontend)**: This is your React.js application. It is strictly responsible for UI rendering, state management, and user interactions. It communicates with the layer below it via RESTful APIs. It should never connect directly to the database.
2. **Business Logic Layer (Backend Services)**: This layer contains your Node.js and Python services. It enforces the core rules of your system (e.g., validating compensation, managing approval workflows, orchestrating AI predictions).
3. **Data Layer (Data Access & Storage)**: This layer abstracts all data sources. It contains your PostgreSQL database configurations/models, your Solidity smart contracts, AI model repositories, and document storage logic. The Business Logic layer calls this layer to fetch or save data.

---

## Complete Folder Structure Tree

Below is a complete folder structure that exactly mirrors the three high-level layers and modules from your architecture diagram. 

```text
fcr-scs/
├── presentation_layer/               # (React.js + Tailwind CSS)
│   ├── package.json
│   ├── public/
│   └── src/
│       ├── components/               # Shared UI components
│       └── pages/                    # Maps exactly to User Interface boxes
│           ├── Login/
│           ├── Compensation/
│           ├── PredictionDashboard/
│           ├── Payment/
│           ├── Dashboard/
│           ├── SmartContract/
│           ├── Reports/
│           └── LandAcquisition/
│
├── business_logic_layer/             # (Node.js & Python Services)
│   ├── package.json                  
│   ├── user_management_service/      # Node.js
│   ├── compensation_management_service/ # Node.js
│   ├── smart_contract_service/       # Node.js
│   ├── reporting_service/            # Node.js
│   ├── land_acquisition_service/     # Node.js
│   ├── ai_prediction_service/        # Python (FastAPI/Flask or scripts)
│   └── payment_service/              # Node.js
│
└── data_layer/                       # (Data Access & Infrastructure)
    ├── package.json
    ├── database/                     # PostgreSQL schema, migrations, and ORM models
    ├── ai_model_repository/          # Trained AI models
    ├── blockchain_ledger/            # Solidity smart contracts (.sol) and deployment scripts
    └── document_storage/             # File storage handlers (e.g., local uploads, S3)
```

## Implementation Notes

To make this exact structure work efficiently in a real codebase:

- **Monorepo Setup**: Use a tool like `npm workspaces` or `Yarn workspaces`. This allows the `business_logic_layer` to import data access functions from the `data_layer` easily.
- **Strict Boundaries**: 
  - The `presentation_layer` only makes HTTP API calls to the `business_logic_layer`.
  - The `business_logic_layer` should not write raw SQL queries directly; it should call repository functions defined in the `data_layer/database` folder.
- **Renaming your existing folder**: If you want to adopt this, you would rename your existing `frontend/` folder to `presentation_layer/` and begin scaffolding the other two folders.
