import React from 'react';
import { Store, Check, MapPin, Phone, Mail, Hash } from 'lucide-react';
import { Badge, Button } from '../../../components/ui';
import { useStoresQuery } from '../../stores/hooks';
import { useStoreScope } from '../../../providers/StoreScopeProvider';

export function StoreSettings() {
  const { activeStoreId, switchStore, isRestricted } = useStoreScope();
  const { data: stores = [], isLoading } = useStoresQuery();

  return (
    <div className="bg-[#001845]/60 border border-white/10 rounded-2xl p-6 backdrop-blur-md space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3 border-b border-white/10 pb-4">
        <div>
          <h2 className="text-lg font-bold text-white flex items-center gap-2">
            <Store className="w-5 h-5 text-blue-400" />
            Registered Store Outlets & Branches
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            Select an active store to scope settings or view branch operational status.
          </p>
        </div>
        <Badge variant="info" className="text-xs">
          {stores.length} Outlets Configured
        </Badge>
      </div>

      {isLoading ? (
        <div className="text-center py-8 text-slate-400 text-sm">
          Loading store outlets...
        </div>
      ) : stores.length === 0 ? (
        <div className="text-center py-8 text-slate-400 text-sm">
          No stores found in directory.
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {stores.map((store) => {
            const isSelected = activeStoreId === store.id || (activeStoreId === 'all' && store === stores[0]);
            const s = store as any;

            return (
              <div
                key={store.id}
                className={`p-4 rounded-xl border transition-colors ${
                  isSelected
                    ? 'bg-blue-500/10 border-blue-500/30'
                    : 'bg-black/20 border-white/5 hover:border-white/10'
                }`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="space-y-1 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-bold text-white text-sm">{store.name}</span>
                      <Badge variant="neutral" className="text-[10px] font-mono">
                        {store.code || store.id}
                      </Badge>
                      {isSelected && (
                        <Badge variant="success" className="text-[10px] gap-1 px-1.5 py-0.5">
                          <Check className="w-3 h-3" />
                          Active
                        </Badge>
                      )}
                    </div>
                    {s.subtitle && (
                      <p className="text-xs text-slate-400 italic">{s.subtitle}</p>
                    )}
                  </div>

                  {!isRestricted && (
                    <Button
                      variant={isSelected ? 'primary' : 'secondary'}
                      size="sm"
                      onClick={() => switchStore(store.id)}
                      className="text-xs px-2.5 py-1"
                    >
                      {isSelected ? 'Selected' : 'Select'}
                    </Button>
                  )}
                </div>

                <div className="mt-3 pt-3 border-t border-white/5 space-y-1.5 text-xs text-slate-400">
                  {store.address && (
                    <div className="flex items-center gap-1.5">
                      <MapPin className="w-3.5 h-3.5 text-slate-500 flex-shrink-0" />
                      <span className="truncate">{store.address}</span>
                    </div>
                  )}
                  {store.phone && (
                    <div className="flex items-center gap-1.5">
                      <Phone className="w-3.5 h-3.5 text-slate-500 flex-shrink-0" />
                      <span>{store.phone}</span>
                    </div>
                  )}
                  {s.email && (
                    <div className="flex items-center gap-1.5">
                      <Mail className="w-3.5 h-3.5 text-slate-500 flex-shrink-0" />
                      <span>{s.email}</span>
                    </div>
                  )}
                  {s.gstin && (
                    <div className="flex items-center gap-1.5 font-mono">
                      <Hash className="w-3.5 h-3.5 text-slate-500 flex-shrink-0" />
                      <span>GSTIN: {s.gstin}</span>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
