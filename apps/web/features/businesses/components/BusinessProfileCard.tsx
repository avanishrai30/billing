'use client';

import React from 'react';
import { Building, Phone, Mail, FileCheck, MapPin, Landmark, QrCode } from 'lucide-react';
import { Badge, Skeleton } from '../../../components/ui';
import type { BusinessDoc } from '../types';

export interface BusinessProfileCardProps {
  business: BusinessDoc | null;
  isLoading: boolean;
}

export function BusinessProfileCard({ business, isLoading }: BusinessProfileCardProps) {
  if (isLoading) {
    return (
      <div className="bg-white border border-slate-200 rounded-2xl p-5 space-y-4 shadow-xs">
        <Skeleton variant="text" className="w-48 h-6" />
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <Skeleton variant="rectangular" className="h-20 rounded-xl" />
          <Skeleton variant="rectangular" className="h-20 rounded-xl" />
          <Skeleton variant="rectangular" className="h-20 rounded-xl" />
        </div>
      </div>
    );
  }

  if (!business) {
    return (
      <div className="bg-white border border-slate-200 rounded-2xl p-6 text-center text-xs text-slate-500 shadow-xs">
        No business profile configured. Please register a legal business entity.
      </div>
    );
  }

  return (
    <div className="bg-white border border-slate-200 rounded-2xl p-5 space-y-5 shadow-xs">
      {/* Brand & Primary Details */}
      <div className="flex flex-wrap items-center justify-between gap-4 pb-4 border-b border-slate-100">
        <div>
          <div className="flex items-center gap-2.5">
            <h2 className="text-lg font-bold text-slate-900 tracking-tight">{business.name}</h2>
            <Badge variant="success" size="sm">
              {business.status.toUpperCase()}
            </Badge>
          </div>
          {business.subtitle && (
            <p className="text-xs text-slate-500 mt-0.5">{business.subtitle}</p>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-4 text-xs text-slate-600">
          {business.phone && (
            <span className="flex items-center gap-1.5 font-mono">
              <Phone className="w-3.5 h-3.5 text-blue-600" />
              {business.phone}
            </span>
          )}
          {business.email && (
            <span className="flex items-center gap-1.5">
              <Mail className="w-3.5 h-3.5 text-indigo-600" />
              {business.email}
            </span>
          )}
        </div>
      </div>

      {/* 3 Section Grid: Legal / Tax, Address, Banking */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
        {/* Tax & Identification */}
        <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 space-y-2">
          <div className="flex items-center gap-1.5 font-semibold text-slate-500">
            <FileCheck className="w-3.5 h-3.5 text-emerald-600" />
            <span>Tax & Legal Info</span>
          </div>
          <div className="space-y-1">
            <div className="text-slate-700">
              GSTIN: <strong className="font-mono text-slate-900">{business.gstin || 'Unregistered'}</strong>
            </div>
            {business.owner && (
              <div className="text-slate-500 text-[11px]">
                Proprietor: <span className="text-slate-800">{business.owner}</span>
              </div>
            )}
          </div>
        </div>

        {/* Location & Address */}
        <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 space-y-2">
          <div className="flex items-center gap-1.5 font-semibold text-slate-500">
            <MapPin className="w-3.5 h-3.5 text-amber-600" />
            <span>Registered Address</span>
          </div>
          <p className="text-slate-700 text-[11px] leading-relaxed">
            {business.address || 'No registered business address set'}
          </p>
        </div>

        {/* Banking & UPI */}
        <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 space-y-2">
          <div className="flex items-center gap-1.5 font-semibold text-slate-500">
            <Landmark className="w-3.5 h-3.5 text-blue-600" />
            <span>Banking Credentials</span>
          </div>
          <div className="space-y-0.5 text-[11px]">
            <div className="text-slate-700">
              Bank: <span className="text-slate-900 font-medium">{business.bankName || 'N/A'}</span>
            </div>
            {business.accountNo && (
              <div className="text-slate-600 font-mono">
                A/C: {business.accountNo} ({business.ifsc || 'IFSC N/A'})
              </div>
            )}
            {business.upiId && (
              <div className="text-indigo-700 flex items-center gap-1 font-mono pt-1 font-semibold">
                <QrCode className="w-3 h-3" />
                UPI: {business.upiId}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
