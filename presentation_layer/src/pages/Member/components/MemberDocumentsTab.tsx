import React from 'react';
import { FileText, ExternalLink } from 'lucide-react';
import { BASE_URL } from '../../../services/api';

export interface DocumentItem {
  title: string;
  status: string;
  date: string;
  badge: string;
  filePath?: string;
  fileSize?: string;
}

export interface MemberDocumentsTabProps {
  documents: DocumentItem[];
}

export const MemberDocumentsTab: React.FC<MemberDocumentsTabProps> = ({ documents }) => {
  return (
    <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200 shadow-sm space-y-3">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-sm font-bold text-slate-900">Case Documents & Forms</h3>
          <p className="text-xs text-slate-500">Statutory filings and verification status for this parcel.</p>
        </div>
        {documents.length > 0 && (
          <span className="text-[11px] font-bold text-slate-500 bg-slate-100 px-2.5 py-1 rounded-lg">
            {documents.length} Records
          </span>
        )}
      </div>

      {documents.length === 0 ? (
        <div className="p-6 text-center text-xs text-slate-400 bg-slate-50 rounded-xl border border-slate-200">
          No statutory documents uploaded yet for this registered case.
        </div>
      ) : (
        <div className="space-y-2">
          {documents.map((doc, idx) => {
            const fileUrl = doc.filePath ? `${BASE_URL}/${doc.filePath.replace(/^\//, '')}` : null;

            return (
              <div
                key={idx}
                className="p-3 bg-slate-50 rounded-xl border border-slate-200 flex items-center justify-between gap-2 hover:border-violet-300 transition"
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className="p-1.5 bg-white rounded-lg border border-slate-200 text-slate-600 shrink-0">
                    <FileText className="w-4 h-4" />
                  </div>
                  <div className="truncate">
                    <h4 className="text-xs font-semibold text-slate-800 truncate">{doc.title}</h4>
                    <p className="text-[10px] text-slate-400">
                      {doc.date} {doc.fileSize ? `• ${doc.fileSize}` : ''}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold ${doc.badge}`}>
                    {doc.status}
                  </span>

                  {fileUrl && (
                    <button
                      type="button"
                      onClick={() => window.open(fileUrl, '_blank', 'noopener,noreferrer')}
                      className="p-1.5 rounded-lg bg-white border border-slate-200 hover:bg-violet-50 text-violet-700 text-xs flex items-center gap-1 font-semibold cursor-pointer shadow-xs"
                      title="View Document"
                    >
                      <ExternalLink className="w-3 h-3" />
                      <span className="hidden sm:inline text-[10px]">View</span>
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
