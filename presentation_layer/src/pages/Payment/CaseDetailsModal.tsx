import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Building2,
  MapPin,
  Users,
  BadgeDollarSign,
  ExternalLink,
  FileText,
  AlertCircle,
  Loader2,
} from 'lucide-react';
import { Modal } from '../../components/ui/Modal';
import { Button } from '../../components/ui/Button';
import { landAcquisitionApi } from '../../services/landAcquisitionApi';
import { CASE_STATUS_CLASS_MAP, CASE_STATUS_LABEL_MAP } from '../../constants/landAcquisition';
interface CaseDetailsModalProps {
  caseId: string | null;
  onClose: () => void;
}

export const CaseDetailsModal: React.FC<CaseDetailsModalProps> = ({ caseId, onClose }) => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [caseData, setCaseData] = useState<any>(null);

  useEffect(() => {
    if (!caseId) {
      setCaseData(null);
      setError(null);
      return;
    }

    let isMounted = true;
    setLoading(true);
    setError(null);

    landAcquisitionApi
      .getCaseById(caseId)
      .then((data: any) => {
        if (isMounted) {
          // Backend response structure might be { success: true, data: { ... } } or raw case
          setCaseData(data?.data || data?.case || data);
        }
      })
      .catch((err: unknown) => {
        if (isMounted) {
          setError((err as Error).message || 'Failed to load case details');
        }
      })
      .finally(() => {
        if (isMounted) setLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, [caseId]);

  const fmtCurrency = (val?: number | string | null) =>
    val != null && !isNaN(Number(val))
      ? `RM ${Number(val).toLocaleString('en-MY', { minimumFractionDigits: 2 })}`
      : 'RM 0.00';

  const project = caseData?.project;
  const landParcel = caseData?.landParcel;
  const ownerships = landParcel?.ownerships || [];
  const compReport = caseData?.compensationReports?.[0];

  return (
    <Modal
      isOpen={Boolean(caseId)}
      onClose={onClose}
      maxWidth="max-w-2xl"
      title={caseData?.caseTitle || `Case ${caseId}`}
      subtitle={`Reference: ${caseId || '—'}`}
      footer={
        <div className="flex items-center justify-between w-full">
          <Button variant="text" size="md" onClick={onClose}>
            Close
          </Button>
          {caseId && (
            <Button
              variant="filled"
              size="md"
              onClick={() => {
                onClose();
                navigate(`/admin/case/details/${caseId}`);
              }}
              className="inline-flex items-center gap-2"
            >
              <span>Open Full Case Page</span>
              <ExternalLink size={15} />
            </Button>
          )}
        </div>
      }
    >
      {loading && (
        <div className="flex flex-col items-center justify-center py-12 text-md-on-surface-variant gap-3">
          <Loader2 className="animate-spin text-md-primary" size={32} />
          <span className="text-sm font-medium">Loading acquisition case details…</span>
        </div>
      )}

      {error && (
        <div className="flex items-center gap-3 bg-md-error/10 border border-md-error/30 rounded-xl p-4 text-md-on-error-container text-sm">
          <AlertCircle size={18} className="text-md-error shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {!loading && !error && caseData && (
        <div className="space-y-5 text-sm">
          {/* Header Status Bar */}
          <div className="flex items-center justify-between bg-md-surface-container-low rounded-xl px-4 py-3 border border-md-outline/10">
            <div>
              <span className="text-xs text-md-on-surface-variant block mb-1">Statutory Case Status</span>
              <span className={`payment-badge ${CASE_STATUS_CLASS_MAP[caseData.status] || 'status-offer-accepted'} text-xs font-semibold`}>
                <span className="dot" />
                {CASE_STATUS_LABEL_MAP[caseData.status] || (caseData.status || 'Offer Accepted').replace(/_/g, ' ')}
              </span>
            </div>
            <div>
              <span className="text-xs text-md-on-surface-variant block">Registration Date</span>
              <span className="font-medium text-md-on-surface">
                {caseData.registrationDate
                  ? new Date(caseData.registrationDate).toLocaleDateString('en-GB')
                  : '—'}
              </span>
            </div>
          </div>

          {/* Project Details */}
          <div className="bg-md-surface-container-low rounded-xl p-4 border border-md-outline/10 space-y-2">
            <div className="flex items-center gap-2 font-bold text-md-primary text-xs uppercase tracking-wider">
              <Building2 size={16} />
              <span>Project Information</span>
            </div>
            <div className="grid grid-cols-2 gap-3 pt-1">
              <div>
                <span className="text-xs text-md-on-surface-variant block">Project Name</span>
                <span className="font-semibold text-md-on-surface">{project?.projectName || '—'}</span>
              </div>
              <div>
                <span className="text-xs text-md-on-surface-variant block">Project Type</span>
                <span className="text-md-on-surface">{project?.projectType || 'Public Infrastructure'}</span>
              </div>
              <div>
                <span className="text-xs text-md-on-surface-variant block">Purpose</span>
                <span className="text-md-on-surface">{project?.purpose || caseData.remarks || '—'}</span>
              </div>
              <div>
                <span className="text-xs text-md-on-surface-variant block">Project Budget</span>
                <span className="font-semibold text-md-primary">{fmtCurrency(project?.budget)}</span>
              </div>
            </div>
          </div>

          {/* Land Parcel Details */}
          <div className="bg-md-surface-container-low rounded-xl p-4 border border-md-outline/10 space-y-2">
            <div className="flex items-center gap-2 font-bold text-md-primary text-xs uppercase tracking-wider">
              <MapPin size={16} />
              <span>Land Parcel Specifications</span>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 pt-1">
              <div>
                <span className="text-xs text-md-on-surface-variant block">Lot Number</span>
                <span className="font-semibold text-md-on-surface font-mono">{landParcel?.lotNo || '—'}</span>
              </div>
              <div>
                <span className="text-xs text-md-on-surface-variant block">Title Number</span>
                <span className="font-semibold text-md-on-surface font-mono">{landParcel?.landTitleNo || '—'}</span>
              </div>
              <div>
                <span className="text-xs text-md-on-surface-variant block">Mukim / District</span>
                <span className="text-md-on-surface">
                  {landParcel?.mukim ? `${landParcel.mukim}, ${landParcel.district}` : '—'}
                </span>
              </div>
              <div>
                <span className="text-xs text-md-on-surface-variant block">Land Area</span>
                <span className="text-md-on-surface">
                  {landParcel?.area ? `${landParcel.area} ${landParcel.areaUnit || 'SQM'}` : '—'}
                </span>
              </div>
              <div>
                <span className="text-xs text-md-on-surface-variant block">Category</span>
                <span className="text-md-on-surface">{landParcel?.landCategory || 'Agriculture'}</span>
              </div>
              <div>
                <span className="text-xs text-md-on-surface-variant block">State</span>
                <span className="text-md-on-surface">{landParcel?.state || 'Selangor'}</span>
              </div>
            </div>
          </div>

          {/* Landowner Information */}
          <div className="bg-md-surface-container-low rounded-xl p-4 border border-md-outline/10 space-y-2">
            <div className="flex items-center gap-2 font-bold text-md-primary text-xs uppercase tracking-wider">
              <Users size={16} />
              <span>Landowner Information</span>
            </div>
            {ownerships.length > 0 ? (
              <div className="divide-y divide-md-outline/10">
                {ownerships.map((ow: any, idx: number) => (
                  <div key={idx} className="py-2 flex items-center justify-between first:pt-1 last:pb-0">
                    <div>
                      <div className="font-semibold text-md-on-surface">{ow.landOwner?.name || '—'}</div>
                      <div className="text-xs text-md-on-surface-variant font-mono">
                        NRIC / MyKad: {ow.landOwner?.nric || '—'}
                      </div>
                    </div>
                    <div className="text-right">
                      <span className="text-xs text-md-on-surface-variant block">Shareholding</span>
                      <span className="font-semibold text-md-primary">
                        {ow.sharePercentage ? `${ow.sharePercentage}%` : '100%'}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-xs text-md-on-surface-variant">No landowner records linked.</p>
            )}
          </div>

          {/* Valuation & Compensation Award */}
          <div className="bg-md-surface-container-low rounded-xl p-4 border border-md-outline/10 space-y-2">
            <div className="flex items-center gap-2 font-bold text-md-primary text-xs uppercase tracking-wider">
              <BadgeDollarSign size={16} />
              <span>Valuation &amp; Statutory Compensation Award</span>
            </div>
            <div className="grid grid-cols-3 gap-3 pt-1">
              <div>
                <span className="text-xs text-md-on-surface-variant block">Market Value</span>
                <span className="font-medium text-md-on-surface">{fmtCurrency(compReport?.marketValue)}</span>
              </div>
              <div>
                <span className="text-xs text-md-on-surface-variant block">Additional Damages</span>
                <span className="font-medium text-md-on-surface">{fmtCurrency(compReport?.additionalDamages)}</span>
              </div>
              <div>
                <span className="text-xs text-md-on-surface-variant block font-bold text-md-primary">Total Statutory Award</span>
                <span className="font-bold text-md-primary text-base">
                  {fmtCurrency(compReport?.totalCompensation || caseData.offerLetters?.[0]?.offerAmount)}
                </span>
              </div>
            </div>
          </div>
        </div>
      )}
    </Modal>
  );
};
