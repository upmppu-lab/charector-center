import React from 'react';
import { CHARACTER_DESCRIPTIONS } from '../utils/sampleData';
import { SlotConfig } from '../types';
import { Check, User } from 'lucide-react';

interface BatchGridThumbnailsProps {
  slotConfigs: SlotConfig[];
  activeSlotId: number | null;
  onSelectSlot: (id: number) => void;
  headTiles: HTMLCanvasElement[];
  bodyTiles: HTMLCanvasElement[];
  legTiles: HTMLCanvasElement[];
}

export const BatchGridThumbnails: React.FC<BatchGridThumbnailsProps> = ({
  slotConfigs,
  activeSlotId,
  onSelectSlot,
  headTiles,
  bodyTiles,
  legTiles,
}) => {
  return (
    <div className="bg-slate-900/95 border-t border-slate-800 p-2.5 px-4 overflow-x-auto select-none">
      <div className="max-w-7xl mx-auto flex items-center gap-2">
        <div className="shrink-0 text-slate-400 text-xs font-semibold pr-2 border-r border-slate-800 flex flex-col justify-center">
          <span className="text-white font-bold">15개 조합</span>
          <span className="text-[10px] text-slate-500">1~15번 리스트</span>
        </div>

        <div className="flex items-center gap-2 overflow-x-auto py-1 scrollbar-thin">
          {CHARACTER_DESCRIPTIONS.map((item) => {
            const config = slotConfigs.find((s) => s.id === item.id);
            const isSelected = activeSlotId === item.id;
            const hasHead = !!headTiles[item.id - 1];

            return (
              <button
                key={item.id}
                onClick={() => onSelectSlot(item.id)}
                className={`flex items-center gap-2 px-3 py-1.5 rounded-lg border text-left shrink-0 transition ${
                  isSelected
                    ? 'bg-indigo-600/20 border-indigo-500 text-white shadow-sm ring-1 ring-indigo-500/50'
                    : 'bg-slate-800/60 border-slate-700/80 hover:bg-slate-800 text-slate-300'
                }`}
              >
                <div
                  className={`w-6 h-6 rounded-md flex items-center justify-center font-bold text-xs shrink-0 ${
                    isSelected
                      ? 'bg-indigo-600 text-white'
                      : 'bg-slate-700 text-slate-300'
                  }`}
                >
                  #{item.id}
                </div>

                <div className="text-[11px] leading-tight max-w-[130px] truncate">
                  <div className="font-semibold text-slate-200 truncate">
                    {item.top.split('&')[0]}
                  </div>
                  <div className="text-[10px] text-slate-400 truncate">
                    {item.hair}
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
};
