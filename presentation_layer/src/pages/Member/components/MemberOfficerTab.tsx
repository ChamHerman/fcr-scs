import React from 'react';
import { Phone, Mail } from 'lucide-react';

export interface AssignedOfficerInfo {
  name: string;
  designation: string;
  department: string;
  phone: string;
  email: string;
  office: string;
  officeHours: string;
}

export interface MemberOfficerTabProps {
  assignedOfficer: AssignedOfficerInfo;
}

export const MemberOfficerTab: React.FC<MemberOfficerTabProps> = ({ assignedOfficer }) => {
  const initials = assignedOfficer.name
    .split(' ')
    .map((n: string) => n[0])
    .slice(0, 2)
    .join('')
    .toUpperCase();

  return (
    <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-4">
      {/* Officer Profile Header */}
      <div className="flex items-center gap-3">
        <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-violet-600 to-indigo-600 text-white text-base font-extrabold flex items-center justify-center shadow-md shrink-0">
          {initials}
        </div>
        <div>
          <h3 className="text-sm font-bold text-slate-900">{assignedOfficer.name}</h3>
          <p className="text-xs text-violet-700 font-semibold">{assignedOfficer.designation}</p>
          <p className="text-[11px] text-slate-500">{assignedOfficer.department}</p>
        </div>
      </div>

      {/* Contact Action Cards */}
      <div className="grid sm:grid-cols-2 gap-3 pt-2 border-t border-slate-100 text-xs">
        <a
          href={`tel:${assignedOfficer.phone.replace(/[^0-9+]/g, '')}`}
          className="flex items-center justify-between p-3 bg-slate-50 hover:bg-violet-50 rounded-xl text-slate-700 border border-slate-200 hover:border-violet-200 transition cursor-pointer"
        >
          <div className="flex items-center gap-2">
            <Phone className="w-3.5 h-3.5 text-violet-600" />
            <span>{assignedOfficer.phone}</span>
          </div>
          <span className="text-[11px] font-bold text-violet-600">Call Now</span>
        </a>

        <a
          href={`mailto:${assignedOfficer.email}`}
          className="flex items-center justify-between p-3 bg-slate-50 hover:bg-violet-50 rounded-xl text-slate-700 border border-slate-200 hover:border-violet-200 transition cursor-pointer"
        >
          <div className="flex items-center gap-2 truncate">
            <Mail className="w-3.5 h-3.5 text-violet-600 shrink-0" />
            <span className="truncate">{assignedOfficer.email}</span>
          </div>
          <span className="text-[11px] font-bold text-violet-600 shrink-0">Email</span>
        </a>
      </div>

      {/* Office Location & Working Hours */}
      <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-1 text-xs text-slate-600">
        <div>
          <span className="font-semibold text-slate-700">Office Location: </span>
          <span className="text-[11px]">{assignedOfficer.office}</span>
        </div>
        <span className="text-[10px] text-slate-400 shrink-0">{assignedOfficer.officeHours}</span>
      </div>
    </div>
  );
};
