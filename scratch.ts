import { adminCreateUser } from './business_logic_layer/user_management_service/src/controllers/user.controller';

const req = {
  body: {
    name: 'T',
    email: 't@t.com',
    contactNumber: '1',
    identificationNumber: '1',
    role: 'GOVERNMENT_OFFICER'
  }
} as any;

const res = {
  status: (code: number) => ({
    json: (data: any) => console.log('Response:', code, data)
  })
} as any;

adminCreateUser(req, res).catch(console.error);
