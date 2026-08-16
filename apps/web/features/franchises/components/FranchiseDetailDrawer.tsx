'use client';

import React from 'react';
import { Store, User, MapPin, Phone, Mail, FileText, Package, Calendar } from 'lucide-react';
import {
  Drawer,
  Button,
  Badge,
  Table,
  TableHeader,
  TableHead,
  TableBody,
  TableRow,
  TableCell
} from '../../../components/ui';
import type { FranchiseDoc, FranchiseSupplyOrderDoc } from '../types';

export interface FranchiseDetailDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  franchise: FranchiseDoc | null;
  orders: FranchiseSupplyOrderDoc[];
  canManage: boolean;
  onRecordSupply: (franchise: FranchiseDoc) => void;
}

export function FranchiseDetailDrawer({
  isOpen,
  onClose,
  franchise,
  orders,
  canManage,
  onRecordSupply
}: FranchiseDetailDrawerProps) {
  if (!franchise) return null;

  const franchiseOrders = orders.filter((o) => o.franchiseId === franchise.id);
  const totalDispatched = franchiseOrders.reduce((sum, o) => sum + Number(o.grandTotal ?? 0), 0);
  const totalPaid = franchiseOrders
    .filter((o) => o.paymentStatus === 'paid')
    .reduce((sum, o) => sum + Number(o.grandTotal ?? 0), 0);
  const pendingAmount = totalDispatched - totalPaid;

  return (
    <Drawer
      isOpen={isOpen}
      onClose={onClose}
      title={franchise.name}
      description={`Location: ${franchise.location}`}
      maxWidth="lg"
      footer={
        <div className="flex items-center justify-between w-full gap-2">
          {canManage ? (
            <Button
              variant="primary"
              size="sm"
              onClick={() => onRecordSupply(franchise)}
              leftIcon={<Package className="h-4 w-4" />}
            >
              Record Supply Dispatch
            </Button>
          ) : (
            <div />
          )}
          <Button variant="ghost" size="sm" onClick={onClose}>
            Close
          </Button>
        </div>
      }
    >
      <div className="space-y-6 py-2 overflow-y-auto">
        {/* Status Badge */}
        <div className="flex items-center justify-between bg-black/20 p-2.5 rounded-lg border border-white/5">
          <span className="text-xs text-slate-400">Partner Status</span>
          <Badge variant={franchise.status === 'active' ? 'success' : 'neutral'} dot>
            {franchise.status.toUpperCase()}
          </Badge>
        </div>

        {/* Key Metrics Grid */}
        <div className="grid grid-cols-3 gap-3 bg-black/20 p-3.5 rounded-xl border border-white/10">
          <div>
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
              Total Supply
            </span>
            <p className="text-sm sm:text-base font-extrabold text-white mt-0.5">
              ₹{totalDispatched.toLocaleString('en-IN', { maximumFractionDigits: 2 })}
            </p>
          </div>
          <div>
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
              Paid Realized
            </span>
            <p className="text-sm sm:text-base font-extrabold text-emerald-400 mt-0.5">
              ₹{totalPaid.toLocaleString('en-IN', { maximumFractionDigits: 2 })}
            </p>
          </div>
          <div>
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
              Pending Credit
            </span>
            <p className="text-sm sm:text-base font-extrabold text-amber-400 mt-0.5">
              ₹{pendingAmount.toLocaleString('en-IN', { maximumFractionDigits: 2 })}
            </p>
          </div>
        </div>

        {/* Profile Details */}
        <div className="bg-[#001845] p-4 rounded-xl border border-white/10 space-y-3">
          <h4 className="text-xs font-bold text-slate-300 uppercase tracking-wider">
            Franchise Partner Profile
          </h4>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
            <div className="flex items-center gap-2 text-slate-300">
              <User className="h-4 w-4 text-slate-400" />
              <span>
                Owner: <strong className="text-white">{franchise.owner}</strong>
              </span>
            </div>
            <div className="flex items-center gap-2 text-slate-300">
              <Phone className="h-4 w-4 text-slate-400" />
              <span>
                Phone: <strong className="text-white">{franchise.phone || 'N/A'}</strong>
              </span>
            </div>
            <div className="flex items-center gap-2 text-slate-300">
              <Mail className="h-4 w-4 text-slate-400" />
              <span>
                Email: <strong className="text-white">{franchise.email || 'N/A'}</strong>
              </span>
            </div>
            <div className="flex items-center gap-2 text-slate-300">
              <FileText className="h-4 w-4 text-slate-400" />
              <span>
                GSTIN: <strong className="text-white font-mono">{franchise.gstin || 'Unregistered'}</strong>
              </span>
            </div>
          </div>
        </div>

        {/* Supply Agreement Catalog */}
        <div className="space-y-2">
          <h4 className="text-xs font-bold text-slate-300 uppercase tracking-wider">
            Wholesale Pricing Catalog ({franchise.supplyList?.length || 0} Products)
          </h4>
          {!franchise.supplyList || franchise.supplyList.length === 0 ? (
            <div className="bg-black/20 p-3 rounded-lg text-center text-xs text-slate-400">
              No custom products mapped. Standard central catalog pricing applies.
            </div>
          ) : (
            <div className="overflow-hidden rounded-xl border border-white/10 bg-[#001845]">
              <Table density="dense">
                <TableHeader>
                  <tr>
                    <TableHead>Product</TableHead>
                    <TableHead isNumeric>Wholesale Price</TableHead>
                    <TableHead isNumeric>Retail MRP</TableHead>
                  </tr>
                </TableHeader>
                <TableBody>
                  {franchise.supplyList.map((item, idx) => (
                    <TableRow key={`${item.productId}-${idx}`}>
                      <TableCell>
                        <span className="font-semibold text-white text-xs">{item.name}</span>
                      </TableCell>
                      <TableCell isNumeric>
                        <span className="text-emerald-400 font-bold text-xs">
                          ₹{Number(item.supplyPrice || 0).toFixed(2)}
                        </span>
                      </TableCell>
                      <TableCell isNumeric>
                        <span className="text-slate-300 text-xs">
                          ₹{Number(item.retailPrice || 0).toFixed(2)}
                        </span>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </div>

        {/* Supply Dispatch History */}
        <div className="space-y-2">
          <h4 className="text-xs font-bold text-slate-300 uppercase tracking-wider">
            Supply Dispatch History ({franchiseOrders.length} Orders)
          </h4>
          {franchiseOrders.length === 0 ? (
            <div className="bg-black/20 p-3 rounded-lg text-center text-xs text-slate-400">
              No supply orders dispatched to this franchise yet.
            </div>
          ) : (
            <div className="overflow-hidden rounded-xl border border-white/10 bg-[#001845]">
              <Table density="dense">
                <TableHeader>
                  <tr>
                    <TableHead>Order ID / Date</TableHead>
                    <TableHead isNumeric>Items</TableHead>
                    <TableHead isNumeric>Grand Total</TableHead>
                    <TableHead align="center">Payment</TableHead>
                  </tr>
                </TableHeader>
                <TableBody>
                  {franchiseOrders.map((order) => (
                    <TableRow key={order.id}>
                      <TableCell>
                        <div className="font-mono text-xs text-white">{order.id}</div>
                        <div className="text-[10px] text-slate-400 flex items-center gap-1">
                          <Calendar className="h-3 w-3" />
                          {order.date || order.createdAt ? new Date(order.date || order.createdAt).toLocaleDateString('en-IN') : '—'}
                        </div>
                      </TableCell>
                      <TableCell isNumeric>
                        <span className="text-xs text-slate-300">{order.items?.length || 0}</span>
                      </TableCell>
                      <TableCell isNumeric>
                        <span className="text-xs font-bold text-white">
                          ₹{Number(order.grandTotal || 0).toLocaleString('en-IN', { maximumFractionDigits: 2 })}
                        </span>
                      </TableCell>
                      <TableCell align="center">
                        <Badge
                          variant={order.paymentStatus === 'paid' ? 'success' : 'warning'}
                          size="sm"
                        >
                          {order.paymentStatus.toUpperCase()}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </div>
      </div>
    </Drawer>
  );
}
