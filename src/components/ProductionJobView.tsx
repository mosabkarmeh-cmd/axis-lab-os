import React, { useState } from 'react';
import { 
  Wrench, 
  Clock, 
  Activity, 
  Check, 
  AlertTriangle, 
  Calculator, 
  Layers, 
  DollarSign, 
  Trash2, 
  RefreshCw, 
  Search, 
  Plus, 
  Info, 
  TrendingUp, 
  Sparkles,
  ChevronDown,
  GripVertical,
  ArrowUp,
  ArrowDown,
  ListOrdered,
  Move,
  Cpu,
  Zap,
  Sliders,
  LayoutGrid,
  List
} from 'lucide-react';
import { ProductionJob, Machine, Order } from '../types';
import { DEFAULT_EXCHANGE_RATE } from '../lib/currency';
import { materialPriceUSD } from '../lib/materials';

interface MaterialItem {
  id: string;
  name: string;
  category: string;
  price?: number;
  unitPrice?: number;
  pricePerUnit?: number;
  costPerUnit?: number;
  unit?: string;
  thickness?: number;
  inventory?: {
    quantity?: number;
  };
}

interface ProductionJobViewProps {
  productionJobs: ProductionJob[];
  materials: MaterialItem[];
  machines: Machine[];
  orders?: Order[];
  exchangeRate?: number;
  onUpdateJob?: (jobId: string, updatedData: Partial<ProductionJob>) => void;
  onStartJob?: (jobId: string, machineId: string) => void;
  onPauseJob?: (jobId: string) => void;
  onCompleteJob?: (jobId: string) => void;
  onAddJob?: (newJob: Partial<ProductionJob>) => void;
  onReorderJobs?: (newJobs: ProductionJob[]) => void;
  onUpdateOrderStatus?: (orderId: string, status: string, notesText: string) => void;
}

export const ProductionJobView: React.FC<ProductionJobViewProps> = ({
  productionJobs = [],
  materials = [],
  machines = [],
  orders = [],
  exchangeRate = DEFAULT_EXCHANGE_RATE,
  onUpdateJob,
  onStartJob,
  onPauseJob,
  onCompleteJob,
  onAddJob,
  onReorderJobs,
  onUpdateOrderStatus
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'pending' | 'running' | 'paused' | 'completed'>('all');
  const [queueViewMode, setQueueViewMode] = useState<'table' | 'cards'>('table');
  const [selectedJobForWaste, setSelectedJobForWaste] = useState<ProductionJob | null>(null);

  // Drag and Drop State for Queue Rescheduling
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);
  const [isDragging, setIsDragging] = useState<boolean>(false);
  const [rescheduleMessage, setRescheduleMessage] = useState<string | null>(null);
  const [startJobSuccessBanner, setStartJobSuccessBanner] = useState<string | null>(null);

  // Auto-Assignment State
  const [showAutoAssignModal, setShowAutoAssignModal] = useState<boolean>(false);
  const [autoAssignProposals, setAutoAssignProposals] = useState<Array<{ job: ProductionJob; recommendedMachine: Machine; reason: string }>>([]);
  const [autoStartJobs, setAutoStartJobs] = useState<boolean>(true);
  const [isProcessingAutoAssign, setIsProcessingAutoAssign] = useState<boolean>(false);

  // Compute Auto-Assignment Proposals
  const computeAutoAssignProposals = (pending: ProductionJob[], macs: Machine[]) => {
    const validMacs = macs.filter(m => m.status !== 'maintenance' && m.status !== 'offline');
    if (validMacs.length === 0) return [];

    const batchCounts = new Map<string, number>();
    validMacs.forEach(m => batchCounts.set(m.id, 0));

    return pending.map(job => {
      const matName = (job.materialName || job.itemName || "").toLowerCase();
      let preferredType = "laser_co2";
      if (matName.includes("فايبر") || matName.includes("حديد") || matName.includes("معدن") || matName.includes("استيل") || matName.includes("fiber")) {
        preferredType = "fiber_laser";
      } else if (matName.includes("cnc") || matName.includes("راوتر") || matName.includes("سميك")) {
        preferredType = "cnc_router";
      }

      let candidates = validMacs.filter(m => m.type === preferredType || m.type?.includes(preferredType));
      if (candidates.length === 0) candidates = [...validMacs];

      candidates.sort((a, b) => {
        if (a.status === 'idle' && b.status !== 'idle') return -1;
        if (a.status !== 'idle' && b.status === 'idle') return 1;

        const countA = batchCounts.get(a.id) || 0;
        const countB = batchCounts.get(b.id) || 0;
        if (countA !== countB) return countA - countB;

        return (a.workingHours || 0) - (b.workingHours || 0);
      });

      const chosen = candidates[0];
      batchCounts.set(chosen.id, (batchCounts.get(chosen.id) || 0) + 1);

      const typeLabel = chosen.type === 'fiber_laser' ? 'فايبر ليزر' : chosen.type === 'cnc_router' ? 'راوتر CNC' : 'CO2 ليزر';

      return {
        job,
        recommendedMachine: chosen,
        reason: `الماكينة الأقل استهلاكاً للساعات (${chosen.workingHours?.toFixed(1) || 0} ساعة) والمتوافقة مع تقنية (${typeLabel})`
      };
    });
  };

  const handleOpenAutoAssignModal = () => {
    const pending = productionJobs.filter(j => j.status === 'pending');
    if (pending.length === 0) {
      setStartJobSuccessBanner("لا توجد مهام قص معلقة بانتظار التوزيع التلقائي حالياً.");
      setTimeout(() => setStartJobSuccessBanner(null), 4000);
      return;
    }
    const proposals = computeAutoAssignProposals(pending, machines);
    setAutoAssignProposals(proposals);
    setShowAutoAssignModal(true);
  };

  const handleConfirmAutoAssign = async () => {
    setIsProcessingAutoAssign(true);
    try {
      const jobIdsToAssign = autoAssignProposals.map(p => p.job.id);
      const res = await fetch("/api/production/jobs/auto-assign", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          jobIds: jobIdsToAssign,
          autoStart: autoStartJobs
        })
      });
      const data = await res.json();
      if (data.success) {
        setStartJobSuccessBanner(`⚡ ${data.message}`);
        setTimeout(() => setStartJobSuccessBanner(null), 6000);
        setShowAutoAssignModal(false);

        autoAssignProposals.forEach(({ job, recommendedMachine }) => {
          if (onUpdateJob) {
            onUpdateJob(job.id, {
              machineId: recommendedMachine.id,
              status: (autoStartJobs && recommendedMachine.status === 'idle') ? 'running' : job.status
            });
          }
        });
      }
    } catch (e) {
      console.error("Auto assignment error:", e);
    } finally {
      setIsProcessingAutoAssign(false);
    }
  };

  const handleQuickAutoAssignSingleJob = async (job: ProductionJob) => {
    const proposals = computeAutoAssignProposals([job], machines);
    if (proposals.length > 0) {
      const chosen = proposals[0].recommendedMachine;
      try {
        const res = await fetch("/api/production/jobs/auto-assign", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ jobIds: [job.id], autoStart: false })
        });
        const data = await res.json();
        if (data.success) {
          if (onUpdateJob) {
            onUpdateJob(job.id, { machineId: chosen.id });
          }
          setStartJobSuccessBanner(`⚡ تم تكليف المهمة #${job.jobNo} تلقائياً على الماكينة (${chosen.name}) - الأقل استهلاكاً للساعات (${chosen.workingHours?.toFixed(1) || 0}س).`);
          setTimeout(() => setStartJobSuccessBanner(null), 5000);
        }
      } catch (e) {
        console.error(e);
      }
    }
  };

  // Start Job and auto-update order status
  const handleStartJobWithOrderUpdate = (job: ProductionJob, machineId?: string) => {
    const idleMac = machines.find(m => m.status === 'idle') || machines[0];
    const targetMachineId = machineId || (idleMac ? idleMac.id : '');
    
    if (!targetMachineId) return;

    // 1. Call onStartJob handler
    if (onStartJob) {
      onStartJob(job.id, targetMachineId);
    }

    // 2. Auto update linked order status to 'in_progress'
    if (job.orderId && onUpdateOrderStatus) {
      onUpdateOrderStatus(
        job.orderId,
        'in_progress',
        `تحديث تلقائي: تم بدء تنفيذ مهمة القص (${job.jobNo}) على الآلة`
      );
    }

    // 3. Display feedback banner
    const targetMacObj = machines.find(m => m.id === targetMachineId);
    setStartJobSuccessBanner(
      `⚡ تم بدء مهمة الإنتاج ${job.jobNo} على الآلة (${targetMacObj ? targetMacObj.name : 'الماكينة'})، وتحديث حالة الطلب #${job.orderNumber} تلقائياً إلى (قيد التنفيذ)`
    );
    setTimeout(() => setStartJobSuccessBanner(null), 5000);
  };
  
  // Waste Calculation Modal State
  const [wasteQtyInput, setWasteQtyInput] = useState<number>(0);
  const [usedQtyInput, setUsedQtyInput] = useState<number>(1);
  const [selectedMaterialId, setSelectedMaterialId] = useState<string>('');
  const [customPriceOverride, setCustomPriceOverride] = useState<string>('');

  // Find material unit price from materials array
  const getMaterialUnitPrice = (matId: string, fallbackPrice?: number): number => {
    const mat = materials.find(m => m.id === matId);
    if (mat) {
      // Material prices are stored in SYP; production costing is stored in USD.
      const storedSyp = mat.pricePerUnit ?? mat.unitPrice ?? mat.price ?? mat.costPerUnit;
      if (storedSyp !== undefined) return materialPriceUSD(storedSyp, exchangeRate);
    }
    // Existing production jobs already store materialPricePerUnit in USD.
    return Number(fallbackPrice) || 0;
  };

  const openWasteCalculator = (job: ProductionJob) => {
    setSelectedJobForWaste(job);
    setSelectedMaterialId(job.materialId || (materials[0]?.id || ''));
    const currentMatUnitPrice = getMaterialUnitPrice(job.materialId, job.materialPricePerUnit);
    setCustomPriceOverride(currentMatUnitPrice ? currentMatUnitPrice.toString() : '');
    
    // Extract existing waste if available
    const existingWaste = (job as any).wasteQuantity || 0;
    const existingUsed = (job as any).usedQuantity || 1;
    setWasteQtyInput(existingWaste);
    setUsedQtyInput(existingUsed);
  };

  const handleSaveWasteCalculation = () => {
    if (!selectedJobForWaste) return;

    const currentMat = materials.find(m => m.id === selectedMaterialId);
    const unitPrice = customPriceOverride !== '' 
      ? parseFloat(customPriceOverride) || 0 
      : getMaterialUnitPrice(selectedMaterialId, selectedJobForWaste.materialPricePerUnit);

    const wasteQuantity = Math.max(0, wasteQtyInput);
    const usedQuantity = Math.max(0, usedQtyInput);

    // Calculate total costs based on recorded waste quantity
    const baseMaterialCostUSD = Number((usedQuantity * unitPrice).toFixed(2));
    const wasteCostUSD = Number((wasteQuantity * unitPrice).toFixed(2));
    const totalMaterialCostUSD = Number((baseMaterialCostUSD + wasteCostUSD).toFixed(2));

    const techCostUSD = selectedJobForWaste.technicianCostUSD || Number(((selectedJobForWaste.estTimeSec / 60) * 0.25).toFixed(2));
    const totalDirectCostUSD = Number((techCostUSD + totalMaterialCostUSD).toFixed(2));

    if (onUpdateJob) {
      onUpdateJob(selectedJobForWaste.id, {
        materialId: selectedMaterialId,
        materialName: currentMat ? currentMat.name : selectedJobForWaste.materialName,
        materialPricePerUnit: unitPrice,
        materialCostUSD: totalMaterialCostUSD,
        totalDirectCostUSD: totalDirectCostUSD,
        ...({
          wasteQuantity,
          usedQuantity,
          wasteCostUSD,
          baseMaterialCostUSD
        } as any)
      });
    }

    setSelectedJobForWaste(null);
  };

  // Reorder queue logic (Drag & Drop or Arrow buttons)
  const handleReorder = (fromIdx: number, toIdx: number) => {
    if (fromIdx === toIdx || fromIdx < 0 || toIdx < 0 || toIdx >= filteredJobs.length) return;
    
    const jobToMove = filteredJobs[fromIdx];
    const targetJob = filteredJobs[toIdx];
    if (!jobToMove || !targetJob) return;

    const listCopy = [...productionJobs];
    const actualFromPos = listCopy.findIndex(j => j.id === jobToMove.id);
    const actualToPos = listCopy.findIndex(j => j.id === targetJob.id);

    if (actualFromPos === -1 || actualToPos === -1) return;

    // Remove item from original position and insert at target position
    listCopy.splice(actualFromPos, 1);
    listCopy.splice(actualToPos, 0, jobToMove);

    // Update sequence priority numbers
    const reorderedJobs = listCopy.map((j, index) => ({
      ...j,
      priority: index + 1
    }));

    if (onReorderJobs) {
      onReorderJobs(reorderedJobs);
    }

    setRescheduleMessage(`تم تغيير أولوية المهمة "${jobToMove.itemName}" إلى المرتبة #${toIdx + 1}`);
    setTimeout(() => setRescheduleMessage(null), 3500);
  };

  const handleDragStart = (e: React.DragEvent, index: number) => {
    setDraggedIndex(index);
    setIsDragging(true);
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', index.toString());
  };

  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    if (dragOverIndex !== index) {
      setDragOverIndex(index);
    }
  };

  const handleDrop = (e: React.DragEvent, targetIndex: number) => {
    e.preventDefault();
    if (draggedIndex !== null) {
      handleReorder(draggedIndex, targetIndex);
    }
    setDraggedIndex(null);
    setDragOverIndex(null);
    setIsDragging(false);
  };

  const handleDragEnd = () => {
    setDraggedIndex(null);
    setDragOverIndex(null);
    setIsDragging(false);
  };

  const handleMoveUp = (index: number) => {
    if (index > 0) {
      handleReorder(index, index - 1);
    }
  };

  const handleMoveDown = (index: number) => {
    if (index < filteredJobs.length - 1) {
      handleReorder(index, index + 1);
    }
  };

  // Filtered production jobs
  const filteredJobs = productionJobs.filter(job => {
    if (statusFilter !== 'all' && job.status !== statusFilter) return false;
    if (searchTerm.trim()) {
      const q = searchTerm.toLowerCase();
      const matchName = (job.itemName || '').toLowerCase().includes(q);
      const matchNo = (job.jobNo || '').toLowerCase().includes(q);
      const matchOrder = (job.orderNumber || '').toLowerCase().includes(q);
      const matchMat = (job.materialName || '').toLowerCase().includes(q);
      if (!matchName && !matchNo && !matchOrder && !matchMat) return false;
    }
    return true;
  });

  // Calculate totals for production analytics with high precision
  const totalWasteCost = productionJobs.reduce((acc, job) => acc + ((job as any).wasteCostUSD || 0), 0);
  const totalMaterialCost = productionJobs.reduce((acc, job) => acc + (job.materialCostUSD || 0), 0);
  const totalWasteCount = productionJobs.reduce((acc, job) => acc + ((job as any).wasteQuantity || 0), 0);

  // High-precision completion and production calculations
  const totalJobsCount = productionJobs.length;
  const completedJobsCount = productionJobs.filter(j => j.status === 'completed').length;
  const runningJobsCount = productionJobs.filter(j => j.status === 'running').length;
  const pausedJobsCount = productionJobs.filter(j => j.status === 'paused').length;
  const pendingJobsCount = productionJobs.filter(j => j.status === 'pending').length;

  const totalUnitsQuantity = productionJobs.reduce((acc, j) => acc + ((j as any).quantity || (j as any).usedQuantity || 1), 0);
  const completedUnitsQuantity = productionJobs.reduce((acc, j) => {
    const qty = (j as any).quantity || (j as any).usedQuantity || 1;
    if (j.status === 'completed') return acc + qty;
    if (j.status === 'running' || j.status === 'paused') {
      const compQty = (j as any).completedQuantity !== undefined 
        ? (j as any).completedQuantity 
        : Math.round(((j.progress || 25) / 100) * qty);
      return acc + Math.min(qty, compQty);
    }
    return acc;
  }, 0);

  const exactCompletionPercent = totalUnitsQuantity > 0 
    ? Number(((completedUnitsQuantity / totalUnitsQuantity) * 100).toFixed(1))
    : (totalJobsCount > 0 ? Number(((completedJobsCount / totalJobsCount) * 100).toFixed(1)) : 100);

  const totalAvailableMachines = machines.filter(m => m.status !== 'offline' && m.status !== 'maintenance').length;
  const activeWorkingMachines = machines.filter(m => (m.status as string) !== 'idle' && m.status !== 'offline' && m.status !== 'maintenance').length;
  const exactMachineEfficiency = totalAvailableMachines > 0 
    ? Number(((activeWorkingMachines / totalAvailableMachines) * 100).toFixed(1))
    : 0;

  const exactYieldRate = totalUnitsQuantity > 0 
    ? Number((Math.max(0, ((totalUnitsQuantity - totalWasteCount) / totalUnitsQuantity) * 100)).toFixed(1))
    : 100;

  return (
    <div className="space-y-6 text-right font-sans">
      {/* Header Banner */}
      <div className="bg-zinc-950 border border-zinc-850 p-5 rounded-2xl flex flex-col md:flex-row md:items-center justify-between gap-4 shadow-xl">
        <div>
          <div className="flex items-center gap-2 justify-end">
            <h2 className="text-lg font-black text-zinc-100">إدارة مهام الإنتاج والقص بالليزر</h2>
            <div className="p-2 rounded-xl bg-amber-950/40 border border-amber-800/40 text-[#c59257]">
              <Calculator className="w-5 h-5" />
            </div>
          </div>
          <p className="text-xs text-zinc-400 mt-1">
            حساب تكلفة المواد والهدر تلقائياً وربطها بسعر الوحدة من سجل الخامات والمستودع.
          </p>
        </div>

        {/* Quick Summary Cards */}
        <div className="flex items-center gap-3 flex-wrap justify-end">
          <div className="bg-zinc-900 border border-zinc-800 px-3.5 py-2 rounded-xl text-right">
            <span className="text-[10px] text-zinc-500 block">إجمالي تكلفة المواد:</span>
            <span className="text-sm font-mono font-bold text-amber-400">${totalMaterialCost.toFixed(2)}</span>
            <span className="text-[9px] text-zinc-500 block">({Math.round(totalMaterialCost * exchangeRate).toLocaleString()} ل.س)</span>
          </div>

          <div className="bg-zinc-900 border border-rose-900/40 px-3.5 py-2 rounded-xl text-right">
            <span className="text-[10px] text-rose-400 font-bold block flex items-center gap-1 justify-end">
              <span>تكلّفة الهدر المسجلة:</span>
              <AlertTriangle className="w-3 h-3 text-rose-400" />
            </span>
            <span className="text-sm font-mono font-bold text-rose-400">${totalWasteCost.toFixed(2)}</span>
            <span className="text-[9px] text-zinc-500 block">({totalWasteCount} وحدات هدر)</span>
          </div>
        </div>
      </div>

      {/* 📊 HIGH-PRECISION PRODUCTION METRICS & COMPLETION RATE PANEL */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Metric 1: Precise Production Completion Rate */}
        <div className="bg-zinc-950 border border-zinc-850 p-4 rounded-xl space-y-2 relative overflow-hidden shadow-md">
          <div className="flex items-center justify-between text-xs">
            <span className="text-zinc-400 font-bold flex items-center gap-1.5">
              <Check className="w-4 h-4 text-emerald-400" />
              <span>معدل إكتمال الإنتاج الفعلي</span>
            </span>
            <span className="font-mono font-black text-emerald-400 text-sm">{exactCompletionPercent}%</span>
          </div>
          <div className="w-full bg-zinc-900 border border-zinc-800 rounded-full h-2 overflow-hidden p-0.5">
            <div 
              className="bg-gradient-to-r from-emerald-500 to-teal-400 h-full rounded-full transition-all duration-700 shadow-[0_0_8px_rgba(16,185,129,0.4)]" 
              style={{ width: `${Math.max(exactCompletionPercent, 3)}%` }} 
            />
          </div>
          <div className="flex items-center justify-between text-[10px] text-zinc-500 font-mono">
            <span>القطع المنجزة: {completedUnitsQuantity} / {totalUnitsQuantity}</span>
            <span>المهام: {completedJobsCount} من {totalJobsCount}</span>
          </div>
        </div>

        {/* Metric 2: Machine Utilization Efficiency */}
        <div className="bg-zinc-950 border border-zinc-850 p-4 rounded-xl space-y-2 relative overflow-hidden shadow-md">
          <div className="flex items-center justify-between text-xs">
            <span className="text-zinc-400 font-bold flex items-center gap-1.5">
              <Activity className="w-4 h-4 text-indigo-400" />
              <span>كفاءة تشغيل الماكينات</span>
            </span>
            <span className="font-mono font-black text-indigo-300 text-sm">{exactMachineEfficiency}%</span>
          </div>
          <div className="w-full bg-zinc-900 border border-zinc-800 rounded-full h-2 overflow-hidden p-0.5">
            <div 
              className="bg-gradient-to-r from-indigo-500 to-cyan-400 h-full rounded-full transition-all duration-700 shadow-[0_0_8px_rgba(99,102,241,0.4)]" 
              style={{ width: `${Math.max(exactMachineEfficiency, 3)}%` }} 
            />
          </div>
          <div className="flex items-center justify-between text-[10px] text-zinc-500 font-mono">
            <span>ماكينات قيد القص: {activeWorkingMachines} / {totalAvailableMachines}</span>
            <span>الخاملة: {Math.max(0, totalAvailableMachines - activeWorkingMachines)}</span>
          </div>
        </div>

        {/* Metric 3: Production Yield & Quality Accuracy */}
        <div className="bg-zinc-950 border border-zinc-850 p-4 rounded-xl space-y-2 relative overflow-hidden shadow-md">
          <div className="flex items-center justify-between text-xs">
            <span className="text-zinc-400 font-bold flex items-center gap-1.5">
              <TrendingUp className="w-4 h-4 text-amber-400" />
              <span>دقة الجودة وخلو الدفعة من التلف</span>
            </span>
            <span className="font-mono font-black text-amber-400 text-sm">{exactYieldRate}%</span>
          </div>
          <div className="w-full bg-zinc-900 border border-zinc-800 rounded-full h-2 overflow-hidden p-0.5">
            <div 
              className="bg-gradient-to-r from-amber-500 to-yellow-400 h-full rounded-full transition-all duration-700 shadow-[0_0_8px_rgba(245,158,11,0.4)]" 
              style={{ width: `${Math.max(exactYieldRate, 3)}%` }} 
            />
          </div>
          <div className="flex items-center justify-between text-[10px] text-zinc-500 font-mono">
            <span>وحدات هدر مسجلة: {totalWasteCount}</span>
            <span>تكلّفة الهدر: ${totalWasteCost.toFixed(2)}</span>
          </div>
        </div>

        {/* Metric 4: Active Queue Workload */}
        <div className="bg-zinc-950 border border-zinc-850 p-4 rounded-xl space-y-2 relative overflow-hidden shadow-md">
          <div className="flex items-center justify-between text-xs">
            <span className="text-zinc-400 font-bold flex items-center gap-1.5">
              <Clock className="w-4 h-4 text-cyan-400" />
              <span>حالة طابور الإنتاج المباشر</span>
            </span>
            <span className="font-mono font-black text-cyan-300 text-sm">{pendingJobsCount + runningJobsCount} قائمة</span>
          </div>
          <div className="w-full bg-zinc-900 border border-zinc-800 rounded-full h-2 overflow-hidden p-0.5 flex gap-0.5">
            <div className="bg-emerald-500 h-full rounded-l-full" style={{ width: `${totalJobsCount > 0 ? (completedJobsCount / totalJobsCount) * 100 : 0}%` }} title="مكتمل" />
            <div className="bg-indigo-500 h-full animate-pulse" style={{ width: `${totalJobsCount > 0 ? (runningJobsCount / totalJobsCount) * 100 : 0}%` }} title="جاري القص" />
            <div className="bg-amber-500 h-full" style={{ width: `${totalJobsCount > 0 ? (pendingJobsCount / totalJobsCount) * 100 : 0}%` }} title="معلق" />
          </div>
          <div className="flex items-center justify-between text-[10px] text-zinc-500 font-mono">
            <span className="text-indigo-400">قيد القص: {runningJobsCount}</span>
            <span className="text-amber-400">بانتظار البدء: {pendingJobsCount}</span>
          </div>
        </div>
      </div>

      {/* ⚡ AUTO-ASSIGNMENT CONTROL PANEL BANNER */}
      <div className="bg-gradient-to-r from-zinc-950 via-zinc-900 to-zinc-950 border border-indigo-900/60 p-4 sm:p-5 rounded-2xl flex flex-col sm:flex-row items-center justify-between gap-4 shadow-xl text-right">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-indigo-950/80 border border-indigo-800/80 text-indigo-400 shrink-0 shadow-inner">
            <Cpu className="w-6 h-6 text-indigo-400 animate-pulse" />
          </div>
          <div>
            <div className="flex items-center gap-2 justify-start flex-wrap">
              <h3 className="text-sm sm:text-base font-extrabold text-zinc-100 flex items-center gap-1.5">
                <span>خاصية التوزيع التلقائي للمهام (Auto-Assignment)</span>
                <Sparkles className="w-4 h-4 text-amber-400" />
              </h3>
              <span className="bg-indigo-950/80 text-indigo-300 border border-indigo-800/80 text-[10px] font-bold px-2.5 py-0.5 rounded-full font-mono">
                معيار ساعات الاستهلاك + التوافق التقني
              </span>
            </div>
            <p className="text-xs text-zinc-400 mt-1 leading-relaxed">
              توزيع ذكي ومتوازن لجميع مهام القص المعلقة على الماكينات الأقل استهلاكاً بالساعات والمعايرة لنوع الخامة.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3 w-full sm:w-auto justify-end">
          <div className="text-left font-mono hidden md:block border-l border-zinc-800 pl-4">
            <span className="text-[10px] text-zinc-500 block">المهام المعلقة للتوزيع:</span>
            <span className="text-xs font-extrabold text-amber-400">
              {productionJobs.filter(j => j.status === 'pending').length} مهام
            </span>
          </div>

          <button
            type="button"
            onClick={handleOpenAutoAssignModal}
            className="w-full sm:w-auto px-4 py-2.5 bg-gradient-to-r from-indigo-600 to-indigo-700 hover:from-indigo-500 hover:to-indigo-600 text-white rounded-xl text-xs font-bold transition-all shadow-lg shadow-indigo-600/20 cursor-pointer flex items-center justify-center gap-2 border border-indigo-500/30"
          >
            <Zap className="w-4 h-4 text-amber-300 fill-amber-300" />
            <span>التوزيع التلقائي للمهام ⚡</span>
          </button>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-zinc-950 border border-zinc-850 p-3 sm:p-4 rounded-xl flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="flex items-center gap-1 bg-zinc-900 p-1 rounded-lg border border-zinc-800/80 w-full sm:w-auto overflow-x-auto no-scrollbar">
          <button
            type="button"
            onClick={() => setStatusFilter('all')}
            className={`px-2.5 py-1 rounded text-[11px] sm:text-xs font-bold transition-colors cursor-pointer shrink-0 ${
              statusFilter === 'all' ? 'bg-[#c59257] text-zinc-950' : 'text-zinc-400 hover:text-zinc-200'
            }`}
          >
            الكل ({productionJobs.length})
          </button>
          <button
            type="button"
            onClick={() => setStatusFilter('pending')}
            className={`px-2.5 py-1 rounded text-[11px] sm:text-xs font-bold transition-colors cursor-pointer shrink-0 ${
              statusFilter === 'pending' ? 'bg-amber-500 text-zinc-950' : 'text-zinc-400 hover:text-amber-400'
            }`}
          >
            معلقة ({productionJobs.filter(j => j.status === 'pending').length})
          </button>
          <button
            type="button"
            onClick={() => setStatusFilter('running')}
            className={`px-2.5 py-1 rounded text-[11px] sm:text-xs font-bold transition-colors cursor-pointer shrink-0 ${
              statusFilter === 'running' ? 'bg-indigo-600 text-white' : 'text-zinc-400 hover:text-indigo-400'
            }`}
          >
            جاري القص ({productionJobs.filter(j => j.status === 'running').length})
          </button>
          <button
            type="button"
            onClick={() => setStatusFilter('completed')}
            className={`px-2.5 py-1 rounded text-[11px] sm:text-xs font-bold transition-colors cursor-pointer shrink-0 ${
              statusFilter === 'completed' ? 'bg-emerald-600 text-white' : 'text-zinc-400 hover:text-emerald-400'
            }`}
          >
            مكتملة ({productionJobs.filter(j => j.status === 'completed').length})
          </button>
        </div>

        <div className="flex flex-col sm:flex-row items-center gap-2 w-full sm:w-auto">
          {/* View Mode Switcher Toggle */}
          <div className="flex items-center gap-1 bg-zinc-900 p-1 rounded-lg border border-zinc-800/80 w-full sm:w-auto justify-center">
            <button
              type="button"
              onClick={() => setQueueViewMode('table')}
              className={`px-3 py-1 rounded text-[11px] font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                queueViewMode === 'table' ? 'bg-[#c59257] text-zinc-950 shadow-sm' : 'text-zinc-400 hover:text-zinc-200'
              }`}
              title="عرض الجدول التفصيلي"
            >
              <List className="w-3.5 h-3.5" />
              <span>جدول الطابور</span>
            </button>
            <button
              type="button"
              onClick={() => setQueueViewMode('cards')}
              className={`px-3 py-1 rounded text-[11px] font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                queueViewMode === 'cards' ? 'bg-[#c59257] text-zinc-950 shadow-sm' : 'text-zinc-400 hover:text-zinc-200'
              }`}
              title="عرض لوحة البطاقات التفاعلية مع سحب وإفلات سريع"
            >
              <LayoutGrid className="w-3.5 h-3.5" />
              <span>بطاقات السحب 🎴</span>
            </button>
          </div>

          <div className="relative w-full sm:w-64">
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="بحث برقم الأمر، الصنف، الخامات..."
              className="w-full bg-zinc-900 border border-zinc-800 rounded-lg pr-8 pl-3 py-1.5 text-xs text-zinc-200 focus:outline-none focus:border-[#c59257]"
            />
            <Search className="w-3.5 h-3.5 text-zinc-500 absolute right-2.5 top-2.5" />
          </div>
        </div>
      </div>

      {/* Queue Reschedule Guidance & Alert Banner */}
      <div className="space-y-2">
        {startJobSuccessBanner && (
          <div className="bg-emerald-950/90 border border-emerald-800 p-3 sm:p-3.5 rounded-xl flex items-center justify-between gap-3 text-xs text-emerald-200 animate-fadeIn shadow-lg shadow-emerald-950/40">
            <div className="flex items-center gap-2 font-bold">
              <Check className="w-4 h-4 text-emerald-400 shrink-0" />
              <span>{startJobSuccessBanner}</span>
            </div>
            <button
              type="button"
              onClick={() => setStartJobSuccessBanner(null)}
              className="text-emerald-400 hover:text-emerald-200 font-bold text-xs cursor-pointer"
            >
              ✕
            </button>
          </div>
        )}

        <div className="bg-zinc-950 border border-amber-900/40 p-3 sm:p-3.5 rounded-xl flex flex-col sm:flex-row items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-2 text-amber-300/90 font-medium">
            <ListOrdered className="w-4 h-4 text-[#c59257] shrink-0" />
            <span>
              <strong className="text-amber-400 font-bold">خاصية سحب وإفلات أولويات القص (Drag & Drop):</strong> امسك أيقونة المقبض (<GripVertical className="w-3.5 h-3.5 inline text-amber-400" />) واسحب بطاقات أو صفوف المهام لتعديل ترتيبها الفوري في طابور الماكينة.
            </span>
          </div>
          
          {rescheduleMessage && (
            <span className="px-3 py-1 bg-emerald-950/80 text-emerald-300 border border-emerald-800 rounded-lg text-[11px] font-bold animate-fadeIn shrink-0">
              ✓ {rescheduleMessage}
            </span>
          )}
        </div>
      </div>

      {/* Production Jobs Content (Table or Cards View) */}
      {queueViewMode === 'cards' ? (
        /* CARDS DRAG & DROP BOARD */
        <div className="space-y-4">
          {filteredJobs.length === 0 ? (
            <div className="bg-zinc-950 border border-zinc-850 rounded-2xl p-12 text-center text-zinc-500 text-xs">
              لا توجد مهام إنتاج مطابقة لخيارات الفلترة والتفتيش.
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredJobs.map((job, idx) => {
                const linkedMat = materials.find(m => m.id === job.materialId);
                const unitPrice = getMaterialUnitPrice(job.materialId, job.materialPricePerUnit);
                const wasteQty = (job as any).wasteQuantity || 0;
                const wasteCost = (job as any).wasteCostUSD || Number((wasteQty * unitPrice).toFixed(2));
                const usedQty = (job as any).usedQuantity || 1;
                const baseMatCost = (job as any).baseMaterialCostUSD || Number((usedQty * unitPrice).toFixed(2));
                const calcTotalMatCost = job.materialCostUSD || Number((baseMatCost + wasteCost).toFixed(2));
                const techCost = job.technicianCostUSD || Number(((job.estTimeSec / 60) * 0.25).toFixed(2));
                const totalDirectCost = job.totalDirectCostUSD || Number((techCost + calcTotalMatCost).toFixed(2));

                const isRunning = job.status === "running";
                const isPending = job.status === "pending";
                const isPaused = job.status === "paused";
                const isCompleted = job.status === "completed";

                const isDragged = draggedIndex === idx;
                const isDragTarget = dragOverIndex === idx;

                return (
                  <div
                    key={job.id}
                    draggable={true}
                    onDragStart={(e) => handleDragStart(e, idx)}
                    onDragOver={(e) => handleDragOver(e, idx)}
                    onDrop={(e) => handleDrop(e, idx)}
                    onDragEnd={handleDragEnd}
                    className={`bg-zinc-950 border rounded-2xl p-4 transition-all duration-200 flex flex-col justify-between space-y-3.5 relative select-none ${
                      isDragged 
                        ? 'opacity-30 border-2 border-dashed border-amber-500 bg-amber-950/20 scale-[0.98]' 
                        : isDragTarget 
                        ? 'border-2 border-dashed border-[#c59257] bg-amber-950/40 shadow-2xl shadow-amber-950/40 ring-2 ring-[#c59257]/50 scale-[1.01]' 
                        : 'border-zinc-850 hover:border-zinc-700 bg-gradient-to-b from-zinc-950 to-zinc-900/60 shadow-lg'
                    }`}
                  >
                    {/* Drop Target Indicator Badge */}
                    {isDragTarget && (
                      <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-[#c59257] text-zinc-950 text-[10px] font-black px-3 py-0.5 rounded-full shadow-md animate-bounce z-10 flex items-center gap-1">
                        <span>إفلات هنا لتأكيد المرتبة #{idx + 1}</span>
                      </div>
                    )}

                    {/* Card Header: Drag Handle, Priority Badge, Status */}
                    <div className="flex items-center justify-between gap-2 border-b border-zinc-900 pb-2.5">
                      <div className="flex items-center gap-2">
                        <div 
                          className="cursor-grab active:cursor-grabbing p-1.5 text-amber-400/80 hover:text-amber-300 hover:bg-amber-950/40 rounded-lg transition-colors border border-amber-900/40"
                          title="امسك واسحب لإعادة جدولة أولوية المهمة في الطابور"
                        >
                          <GripVertical className="w-5 h-5" />
                        </div>

                        <span className={`px-2.5 py-1 rounded-lg text-xs font-mono font-black flex items-center gap-1 ${
                          idx === 0 
                            ? 'bg-[#c59257] text-zinc-950 shadow-md shadow-[#c59257]/20' 
                            : idx === 1
                            ? 'bg-amber-950 text-amber-300 border border-amber-800'
                            : 'bg-zinc-900 text-zinc-300 border border-zinc-800'
                        }`}>
                          <span>#{idx + 1}</span>
                          {idx === 0 && <span className="text-[9px] font-sans font-extrabold">(الأولوية القصوى)</span>}
                        </span>
                      </div>

                      <div className="flex items-center gap-1">
                        <div className="flex items-center gap-0.5 ml-1">
                          <button
                            type="button"
                            onClick={() => handleMoveUp(idx)}
                            disabled={idx === 0}
                            className="p-1 text-zinc-400 hover:text-amber-400 disabled:opacity-20 cursor-pointer hover:bg-zinc-900 rounded"
                            title="تقديم للأعلى"
                          >
                            <ArrowUp className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleMoveDown(idx)}
                            disabled={idx === filteredJobs.length - 1}
                            className="p-1 text-zinc-400 hover:text-amber-400 disabled:opacity-20 cursor-pointer hover:bg-zinc-900 rounded"
                            title="تأخير للأسفل"
                          >
                            <ArrowDown className="w-3.5 h-3.5" />
                          </button>
                        </div>

                        <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold border ${
                          isRunning ? 'bg-indigo-950 text-indigo-300 border-indigo-800 animate-pulse' :
                          isCompleted ? 'bg-emerald-950 text-emerald-300 border-emerald-800' :
                          isPaused ? 'bg-rose-950 text-rose-300 border-rose-800' :
                          'bg-amber-950 text-amber-300 border-amber-800'
                        }`}>
                          {isRunning ? 'جاري القص ⚡' : isCompleted ? 'مكتمل ✅' : isPaused ? 'متوقف ⚠️' : 'معلق ⏳'}
                        </span>
                      </div>
                    </div>

                    {/* Card Body: Item & Material details */}
                    <div className="space-y-2 text-right">
                      <div>
                        <h4 className="font-extrabold text-sm text-zinc-100">{job.itemName}</h4>
                        <div className="flex items-center gap-2 mt-1 text-[11px] text-zinc-400 font-mono flex-wrap">
                          <span className="text-[#c59257] font-bold">{job.jobNo}</span>
                          <span>•</span>
                          <span>الطلب: <strong className="text-indigo-400 font-mono">#{job.orderNumber}</strong></span>
                        </div>
                      </div>

                      {/* Material & Laser params */}
                      <div className="bg-zinc-900/80 p-2.5 rounded-xl border border-zinc-850/80 space-y-1.5 text-[11px]">
                        <div className="flex items-center justify-between">
                          <span className="text-zinc-400">الخامة:</span>
                          <span className="font-bold text-zinc-200">{job.materialName || linkedMat?.name || 'خامة عامة'}</span>
                        </div>
                        <div className="flex items-center justify-between text-[10px]">
                          <span className="text-zinc-400">سعر الوحدة:</span>
                          <span className="text-amber-400 font-mono font-bold">${unitPrice.toFixed(2)}</span>
                        </div>
                        <div className="flex items-center justify-between text-[10px]">
                          <span className="text-zinc-400">معايرة الليزر:</span>
                          <span className="text-zinc-300 font-mono font-bold">
                            قدرة {job.laserPower}% | سرعة {job.laserSpeed} مم/ث
                          </span>
                        </div>
                      </div>

                      {/* Machine & Cost breakdown */}
                      <div className="flex items-center justify-between text-[11px] pt-1">
                        <div className="flex items-center gap-1 text-zinc-400">
                          <Cpu className="w-3.5 h-3.5 text-indigo-400" />
                          <span>
                            {job.machineId 
                              ? (machines.find(m => m.id === job.machineId)?.name || 'الماكينة المكلفة') 
                              : 'غير مكلفة لماكينة'}
                          </span>
                        </div>

                        <div className="text-left font-mono">
                          <span className="text-[10px] text-zinc-500 block">التكلفة المباشرة:</span>
                          <span className="font-extrabold text-emerald-400">${totalDirectCost.toFixed(2)}</span>
                        </div>
                      </div>
                    </div>

                    {/* Card Actions Footer */}
                    <div className="pt-2 border-t border-zinc-900 flex items-center justify-between gap-2">
                      <button
                        type="button"
                        onClick={() => openWasteCalculator(job)}
                        className="px-2.5 py-1.5 bg-zinc-900 hover:bg-zinc-850 text-amber-400 border border-zinc-800 rounded-lg text-[10px] font-bold transition-all flex items-center gap-1 cursor-pointer"
                        title="حساب وتطبيق الهدر"
                      >
                        <Calculator className="w-3 h-3 text-amber-400" />
                        <span>حساب الهدر</span>
                      </button>

                      <div className="flex items-center gap-1.5">
                        {isPending && (
                          <button
                            type="button"
                            onClick={() => handleStartJobWithOrderUpdate(job)}
                            className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-[11px] font-bold transition-all flex items-center gap-1 cursor-pointer shadow-sm shadow-indigo-600/30"
                          >
                            <Zap className="w-3 h-3 fill-amber-300 text-amber-300" />
                            <span>بدء القص</span>
                          </button>
                        )}

                        {isRunning && (
                          <>
                            <button
                              type="button"
                              onClick={() => onPauseJob && onPauseJob(job.id)}
                              className="px-2.5 py-1.5 bg-amber-950/80 hover:bg-amber-900/80 text-amber-300 border border-amber-800 rounded-lg text-[10px] font-bold transition-all cursor-pointer"
                            >
                              إيقاف مؤقت
                            </button>
                            <button
                              type="button"
                              onClick={() => onCompleteJob && onCompleteJob(job.id)}
                              className="px-2.5 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-[10px] font-bold transition-all cursor-pointer flex items-center gap-1"
                            >
                              <Check className="w-3 h-3" />
                              <span>إكمال</span>
                            </button>
                          </>
                        )}

                        {isPaused && (
                          <button
                            type="button"
                            onClick={() => handleStartJobWithOrderUpdate(job)}
                            className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-[11px] font-bold transition-all cursor-pointer"
                          >
                            استئناف
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      ) : (
        /* TABLE VIEW */
        <div className="bg-zinc-950 border border-zinc-850 rounded-2xl overflow-hidden shadow-lg">
        <div className="overflow-x-auto w-full">
          <table className="w-full min-w-[780px] text-xs text-zinc-300 text-right border-collapse">
            <thead>
              <tr className="bg-zinc-900/70 text-zinc-400 border-b border-zinc-850 text-[11px]">
                <th className="p-2.5 sm:p-3.5 text-center w-28">ترتيب الأولوية</th>
                <th className="p-2.5 sm:p-3.5">الطلب والعميل</th>
                <th className="p-2.5 sm:p-3.5">الخامة وسعر الوحدة</th>
                <th className="p-2.5 sm:p-3.5 text-center">كمية الهدر المسجلة</th>
                <th className="p-2.5 sm:p-3.5 text-center">تكلفة المادة والتكلفة المباشرة</th>
                <th className="p-2.5 sm:p-3.5 text-center">سرعة وطاقة الليزر</th>
                <th className="p-2.5 sm:p-3.5 text-center">حالة التشغيل</th>
                <th className="p-2.5 sm:p-3.5 text-center">إجراءات والتكلفة</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-900">
              {filteredJobs.length === 0 ? (
                <tr>
                  <td colSpan={8} className="p-12 text-center text-zinc-600">
                    لا توجد مهام إنتاج مطابقة لخيارات الفلترة والتفتيش.
                  </td>
                </tr>
              ) : (
                filteredJobs.map((job, idx) => {
                  const linkedMat = materials.find(m => m.id === job.materialId);
                  const unitPrice = getMaterialUnitPrice(job.materialId, job.materialPricePerUnit);
                  const wasteQty = (job as any).wasteQuantity || 0;
                  const usedQty = (job as any).usedQuantity || 1;
                  const wasteCost = (job as any).wasteCostUSD || Number((wasteQty * unitPrice).toFixed(2));
                  const baseMatCost = (job as any).baseMaterialCostUSD || Number((usedQty * unitPrice).toFixed(2));
                  const calcTotalMatCost = job.materialCostUSD || Number((baseMatCost + wasteCost).toFixed(2));
                  const techCost = job.technicianCostUSD || Number(((job.estTimeSec / 60) * 0.25).toFixed(2));
                  const totalDirectCost = job.totalDirectCostUSD || Number((techCost + calcTotalMatCost).toFixed(2));

                  const isRunning = job.status === "running";
                  const isPending = job.status === "pending";
                  const isPaused = job.status === "paused";
                  const isCompleted = job.status === "completed";

                  const isDragged = draggedIndex === idx;
                  const isDragTarget = dragOverIndex === idx;

                  return (
                    <tr 
                      key={job.id} 
                      draggable={true}
                      onDragStart={(e) => handleDragStart(e, idx)}
                      onDragOver={(e) => handleDragOver(e, idx)}
                      onDrop={(e) => handleDrop(e, idx)}
                      onDragEnd={handleDragEnd}
                      className={`transition-all duration-150 ${
                        idx % 2 === 1 ? 'bg-zinc-900/20' : ''
                      } ${
                        isDragged ? 'opacity-30 bg-amber-950/30 scale-[0.99]' : 'hover:bg-zinc-900/40'
                      } ${
                        isDragTarget ? 'border-2 border-dashed border-[#c59257] bg-amber-950/40 shadow-inner' : ''
                      }`}
                    >
                      {/* Priority position & Drag Handle */}
                      <td className="p-3.5 text-center">
                        <div className="flex items-center justify-center gap-1.5">
                          <div 
                            className="cursor-grab active:cursor-grabbing p-1 text-zinc-500 hover:text-amber-400 transition-colors"
                            title="سحب وإفلات لإعادة جدولة أولوية القص (Drag to reschedule)"
                          >
                            <GripVertical className="w-4 h-4" />
                          </div>

                          <span className={`px-2 py-0.5 rounded-md text-[10px] font-mono font-black ${
                            idx === 0 
                              ? 'bg-[#c59257] text-zinc-950 shadow-sm' 
                              : idx === 1
                              ? 'bg-amber-950/80 text-amber-300 border border-amber-800/60'
                              : 'bg-zinc-900 text-zinc-400 border border-zinc-800'
                          }`}>
                            #{idx + 1}
                          </span>

                          <div className="flex flex-col gap-0.5">
                            <button
                              type="button"
                              onClick={() => handleMoveUp(idx)}
                              disabled={idx === 0}
                              className="p-0.5 text-zinc-500 hover:text-amber-400 disabled:opacity-20 disabled:hover:text-zinc-500 cursor-pointer disabled:cursor-not-allowed"
                              title="تقديم الأولوية"
                            >
                              <ArrowUp className="w-3 h-3" />
                            </button>
                            <button
                              type="button"
                              onClick={() => handleMoveDown(idx)}
                              disabled={idx === filteredJobs.length - 1}
                              className="p-0.5 text-zinc-500 hover:text-amber-400 disabled:opacity-20 disabled:hover:text-zinc-500 cursor-pointer disabled:cursor-not-allowed"
                              title="تأخير الأولوية"
                            >
                              <ArrowDown className="w-3 h-3" />
                            </button>
                          </div>
                        </div>
                      </td>
                      {/* Job details */}
                      <td className="p-3.5">
                        <div className="font-bold text-zinc-100">{job.itemName}</div>
                        <div className="flex gap-2 items-center justify-start mt-1 text-[10px] text-zinc-500 font-mono flex-wrap">
                          <span className="text-[#c59257] font-bold">{job.jobNo}</span>
                          <span>•</span>
                          <span>الطلب: <strong className="text-indigo-400 font-mono">#{job.orderNumber}</strong></span>
                          {(() => {
                            const linkedOrd = orders.find(o => (job.orderId && o.id === job.orderId) || (job.orderNumber && o.orderNumber === job.orderNumber));
                            if (!linkedOrd) return null;
                            const isOrdInProgress = linkedOrd.status === 'in_progress';
                            const isOrdReady = linkedOrd.status === 'ready';
                            const isOrdDelivered = linkedOrd.status === 'delivered';
                            return (
                              <span className={`px-1.5 py-0.5 rounded text-[9.5px] font-bold font-sans ${
                                isOrdInProgress ? 'bg-blue-950/80 text-blue-300 border border-blue-800/80 animate-pulse' :
                                isOrdReady ? 'bg-emerald-950/80 text-emerald-300 border border-emerald-800/80' :
                                isOrdDelivered ? 'bg-zinc-900 text-zinc-400 border border-zinc-800' :
                                'bg-indigo-950/80 text-indigo-300 border border-indigo-800/80'
                              }`}>
                                {isOrdInProgress ? 'حالة الطلب: قيد التنفيذ' :
                                 isOrdReady ? 'جاهز للتسليم' :
                                 isOrdDelivered ? 'تم التسليم' : 'جديد'}
                              </span>
                            );
                          })()}
                        </div>

                        {/* Machine Assignment Info */}
                        <div className="mt-1.5 flex items-center gap-1.5 font-sans">
                          {job.machineId ? (
                            (() => {
                              const assignedMac = machines.find(m => m.id === job.machineId);
                              return (
                                <span className="inline-flex items-center gap-1 bg-indigo-950/80 border border-indigo-800/80 px-2 py-0.5 rounded text-[10px] text-indigo-300 font-mono">
                                  <Cpu className="w-3 h-3 text-indigo-400" />
                                  <span>{assignedMac ? assignedMac.name : 'الماكينة المكلفة'}</span>
                                  <span className="text-zinc-400 text-[9px]">({assignedMac?.workingHours?.toFixed(1) || 0}س)</span>
                                </span>
                              );
                            })()
                          ) : (
                            <div className="inline-flex items-center gap-1.5 flex-wrap">
                              <span className="text-[9.5px] text-amber-400/90 font-mono bg-amber-950/40 border border-amber-900/40 px-1.5 py-0.5 rounded">
                                غير مكلفة لماكينة
                              </span>
                              {isPending && (
                                <button
                                  type="button"
                                  onClick={() => handleQuickAutoAssignSingleJob(job)}
                                  className="text-[9.5px] font-bold text-indigo-400 hover:text-indigo-300 underline cursor-pointer flex items-center gap-0.5"
                                  title="توزيع أوتوماتيكي للمهمة على الماكينة الأكثر ملاءمة والأقل استهلاكاً للساعات"
                                >
                                  <Zap className="w-2.5 h-2.5 text-amber-300" />
                                  <span>توزيع أوتوماتيكي ⚡</span>
                                </button>
                              )}
                            </div>
                          )}
                        </div>
                      </td>

                      {/* Material & Unit price link */}
                      <td className="p-3.5">
                        <div className="font-bold text-zinc-200">{job.materialName || linkedMat?.name || 'خامة عامة'}</div>
                        <div className="text-[10px] text-amber-400 font-mono mt-0.5">
                          سعر الوحدة: <strong>${unitPrice.toFixed(2)}</strong> / {linkedMat?.unit || 'وحدة'}
                        </div>
                        {linkedMat?.category && (
                          <div className="text-[9px] text-zinc-500">{linkedMat.category}</div>
                        )}
                      </td>

                      {/* Waste Quantity & Visual Status */}
                      <td className="p-3.5 text-center">
                        <div className="inline-flex flex-col items-center">
                          <span className={`px-2.5 py-1 rounded-lg border text-[11px] font-mono font-bold ${
                            wasteQty > 0 
                              ? 'bg-rose-950/40 text-rose-300 border-rose-800/60' 
                              : 'bg-zinc-900 text-zinc-500 border-zinc-800'
                          }`}>
                            {wasteQty} {linkedMat?.unit || 'وحدة'} هدر
                          </span>
                          {wasteCost > 0 && (
                            <span className="text-[10px] font-mono text-rose-400 mt-1 font-bold">
                              تكلفة الهدر: ${wasteCost.toFixed(2)}
                            </span>
                          )}
                        </div>
                      </td>

                      {/* Material Cost Breakdown */}
                      <td className="p-3.5 text-center font-mono">
                        <div className="text-xs font-bold text-amber-400">${calcTotalMatCost.toFixed(2)}</div>
                        <div className="text-[9.5px] text-zinc-500 mt-0.5">
                          أساسي: ${baseMatCost.toFixed(2)} + هدر: ${wasteCost.toFixed(2)}
                        </div>
                        <div className="text-[10px] text-[#c59257] font-bold mt-1">
                          إجمالي المباشر: ${totalDirectCost.toFixed(2)}
                        </div>
                      </td>

                      {/* Laser specs */}
                      <td className="p-3.5 text-center font-mono">
                        <div className="text-zinc-300">طاقة: {job.laserPower || 80}%</div>
                        <div className="text-[10px] text-zinc-500 mt-0.5">سرعة: {job.laserSpeed || 30} mm/s</div>
                      </td>

                      {/* Status */}
                      <td className="p-3.5 text-center">
                        <span className={`px-2.5 py-1 border text-[10px] font-bold rounded-full inline-flex items-center gap-1.5 justify-center ${
                          isPending ? 'bg-zinc-900 text-zinc-400 border-zinc-800' :
                          isRunning ? 'bg-indigo-950/40 text-indigo-400 border-indigo-800 animate-pulse' :
                          isPaused ? 'bg-amber-950/40 text-amber-400 border-amber-800' :
                          'bg-emerald-950/40 text-emerald-400 border-emerald-800'
                        }`}>
                          {isPending && <Clock className="w-3 h-3 text-zinc-400" />}
                          {isRunning && <Activity className="w-3 h-3 text-indigo-400" />}
                          {isPaused && <Wrench className="w-3 h-3 text-amber-400" />}
                          {isCompleted && <Check className="w-3 h-3 text-emerald-400" />}
                          <span>
                            {isPending ? 'معلقة' : isRunning ? 'جاري القص' : isPaused ? 'موقوفة' : 'مكتملة'}
                          </span>
                        </span>
                      </td>

                      {/* Action buttons */}
                      <td className="p-3.5 text-center">
                        <div className="flex items-center justify-center gap-1.5 flex-wrap">
                          {/* Waste calculator trigger */}
                          <button
                            type="button"
                            onClick={() => openWasteCalculator(job)}
                            className="px-2.5 py-1 bg-amber-950/60 hover:bg-amber-900/80 text-amber-300 border border-amber-800/60 rounded text-[10px] font-bold transition-colors cursor-pointer flex items-center gap-1"
                            title="تعديل حسابات الهدر وسعر المادة"
                          >
                            <Calculator className="w-3 h-3 text-amber-400" />
                            <span>تسجيل الهدر والتكلفة</span>
                          </button>

                          {isPending && onStartJob && machines.length > 0 && (
                            <button
                              type="button"
                              onClick={() => handleStartJobWithOrderUpdate(job)}
                              className="px-2.5 py-1 bg-indigo-600 hover:bg-indigo-500 text-white rounded text-[10px] font-bold transition-all shadow-md shadow-indigo-600/20 cursor-pointer flex items-center gap-1"
                              title="بدء تشغيل المهمة وتحديث حالة الطلب المرتبط إلى (قيد التنفيذ) تلقائياً"
                            >
                              <Sparkles className="w-3 h-3 text-amber-300" />
                              <span>بدء المهمة ⚡</span>
                            </button>
                          )}

                          {isRunning && onPauseJob && (
                            <button
                              type="button"
                              onClick={() => onPauseJob(job.id)}
                              className="px-2 py-1 bg-zinc-900 hover:bg-zinc-800 text-zinc-300 rounded text-[10px] font-bold transition-colors cursor-pointer"
                            >
                              إيقاف ⏸️
                            </button>
                          )}

                          {!isCompleted && onCompleteJob && (
                            <button
                              type="button"
                              onClick={() => onCompleteJob(job.id)}
                              className="px-2 py-1 bg-emerald-600 hover:bg-emerald-500 text-white rounded text-[10px] font-bold transition-colors cursor-pointer"
                            >
                              إكمال ✓
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
      )}

      {/* WASTE & MATERIAL COST CALCULATOR MODAL */}
      {selectedJobForWaste && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-zinc-950 border border-amber-800/60 rounded-2xl p-6 max-w-lg w-full space-y-5 text-right shadow-2xl animate-fadeIn">
            <div className="flex items-center justify-between border-b border-zinc-900 pb-3">
              <button
                type="button"
                onClick={() => setSelectedJobForWaste(null)}
                className="text-zinc-500 hover:text-zinc-300 font-bold text-sm cursor-pointer"
              >
                ✕
              </button>
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-black text-amber-400">حساب تكلفة المادة والهدر تلقائياً</h3>
                <Calculator className="w-4 h-4 text-amber-400" />
              </div>
            </div>

            <div className="space-y-4 text-xs">
              {/* Job info banner */}
              <div className="bg-zinc-900 p-3 rounded-xl border border-zinc-800 space-y-1">
                <div className="font-bold text-zinc-100">{selectedJobForWaste.itemName}</div>
                <div className="text-[10px] text-zinc-400 font-mono">
                  رقم المهمة: <span className="text-[#c59257]">{selectedJobForWaste.jobNo}</span> | الطلب: #{selectedJobForWaste.orderNumber}
                </div>
              </div>

              {/* 1. Material Selector & Linked Unit Price */}
              <div className="space-y-1.5">
                <label className="block text-zinc-300 font-bold text-[11px]">
                  اختر المادة من جدول الخامات (لربط سعر الوحدة تلقائياً):
                </label>
                <select
                  value={selectedMaterialId}
                  onChange={(e) => {
                    const matId = e.target.value;
                    setSelectedMaterialId(matId);
                    const p = getMaterialUnitPrice(matId);
                    setCustomPriceOverride(p ? p.toString() : '');
                  }}
                  className="w-full bg-zinc-900 border border-zinc-800 rounded-lg p-2 text-xs text-zinc-200 focus:outline-none focus:border-[#c59257]"
                >
                  <option value="">-- اختر خامة --</option>
                  {materials.map(m => {
                    const p = getMaterialUnitPrice(m.id);
                    return (
                      <option key={m.id} value={m.id}>
                        {m.name} ({m.category || 'عام'}) - سعر الوحدة: ${p}
                      </option>
                    );
                  })}
                </select>
              </div>

              {/* 2. Custom Unit Price Override */}
              <div className="space-y-1.5">
                <label className="block text-zinc-300 font-bold text-[11px]">
                  سعر الوحدة الافتراضي ($):
                </label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={customPriceOverride}
                  onChange={(e) => setCustomPriceOverride(e.target.value)}
                  placeholder="أدخل سعر الوحدة يدوياً في حال رغبت بتعديله..."
                  className="w-full bg-zinc-900 border border-zinc-800 rounded-lg p-2 text-xs text-zinc-200 font-mono focus:outline-none focus:border-[#c59257]"
                />
              </div>

              {/* 3. Used Quantity vs Waste Quantity */}
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label className="block text-zinc-300 font-bold text-[11px]">
                    الكمية المستهلكة المباشرة:
                  </label>
                  <input
                    type="number"
                    step="0.1"
                    min="0"
                    value={usedQtyInput}
                    onChange={(e) => setUsedQtyInput(parseFloat(e.target.value) || 0)}
                    className="w-full bg-zinc-900 border border-zinc-800 rounded-lg p-2 text-xs text-zinc-200 font-mono focus:outline-none focus:border-[#c59257]"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="block text-rose-300 font-bold text-[11px] flex items-center gap-1 justify-end">
                    <span>كمية الهدر المسجلة:</span>
                    <AlertTriangle className="w-3 h-3 text-rose-400" />
                  </label>
                  <input
                    type="number"
                    step="0.1"
                    min="0"
                    value={wasteQtyInput}
                    onChange={(e) => setWasteQtyInput(parseFloat(e.target.value) || 0)}
                    className="w-full bg-rose-950/30 border border-rose-800/80 rounded-lg p-2 text-xs text-rose-200 font-mono focus:outline-none focus:border-rose-500"
                  />
                </div>
              </div>

              {/* Live Calculation Preview Card */}
              {(() => {
                const uPrice = customPriceOverride !== '' ? (parseFloat(customPriceOverride) || 0) : getMaterialUnitPrice(selectedMaterialId);
                const baseCost = Number((usedQtyInput * uPrice).toFixed(2));
                const wasteCost = Number((wasteQtyInput * uPrice).toFixed(2));
                const totalMatCost = Number((baseCost + wasteCost).toFixed(2));
                const techCost = selectedJobForWaste.technicianCostUSD || Number(((selectedJobForWaste.estTimeSec / 60) * 0.25).toFixed(2));
                const totalDirect = Number((techCost + totalMatCost).toFixed(2));

                return (
                  <div className="bg-zinc-900/90 border border-amber-900/50 p-4 rounded-xl space-y-2 font-mono">
                    <div className="text-[11px] font-bold text-amber-400 border-b border-zinc-800 pb-1.5 font-sans">
                      📊 ملخص الحساب التلقائي لتكلفة المواد والهدر:
                    </div>
                    <div className="flex justify-between text-zinc-300">
                      <span>تكلفة الكمية المستهلكة:</span>
                      <span className="font-bold">${baseCost.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between text-rose-400">
                      <span>تكلفة كمية الهدر ({wasteQtyInput} وحدات):</span>
                      <span className="font-bold">+ ${wasteCost.toFixed(2)}</span>
                    </div>
                    <div className="pt-2 border-t border-zinc-850 flex justify-between text-amber-400 font-bold">
                      <span>إجمالي تكلفة المادة (الأساسية + الهدر):</span>
                      <span>${totalMatCost.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between text-indigo-400 text-[10.5px]">
                      <span>أجر الفني والتشغيل:</span>
                      <span>${techCost.toFixed(2)}</span>
                    </div>
                    <div className="pt-1.5 border-t border-zinc-800 flex justify-between text-[#c59257] font-black text-sm">
                      <span>إجمالي التكلفة المباشرة للطلب:</span>
                      <span>${totalDirect.toFixed(2)} ({Math.round(totalDirect * exchangeRate).toLocaleString()} ل.س)</span>
                    </div>
                  </div>
                );
              })()}
            </div>

            {/* Modal Actions */}
            <div className="flex items-center justify-end gap-2 pt-2 border-t border-zinc-900">
              <button
                type="button"
                onClick={() => setSelectedJobForWaste(null)}
                className="px-4 py-2 bg-zinc-900 hover:bg-zinc-800 text-zinc-400 rounded-lg font-bold text-xs cursor-pointer"
              >
                إلغاء
              </button>
              <button
                type="button"
                onClick={handleSaveWasteCalculation}
                className="px-5 py-2 bg-[#c59257] hover:bg-[#b07f46] text-zinc-950 rounded-lg font-black text-xs cursor-pointer flex items-center gap-1.5 shadow-lg shadow-amber-500/10"
              >
                <Check className="w-3.5 h-3.5" />
                <span>حفظ واعتماد حساب التكلفة والهدر</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ⚡ AUTO-ASSIGNMENT PROPOSALS & CONFIRMATION MODAL */}
      {showAutoAssignModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-zinc-950 border border-indigo-900/60 rounded-2xl p-6 max-w-2xl w-full space-y-5 text-right shadow-2xl animate-fadeIn font-sans">
            <div className="flex items-center justify-between border-b border-zinc-850 pb-3">
              <button
                type="button"
                onClick={() => setShowAutoAssignModal(false)}
                className="text-zinc-500 hover:text-zinc-300 font-bold text-sm cursor-pointer"
              >
                ✕
              </button>
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-extrabold text-zinc-100 font-sans">
                  توزيع المهام التلقائي (Auto-Assignment System)
                </h3>
                <Cpu className="w-5 h-5 text-indigo-400" />
              </div>
            </div>

            <div className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="bg-zinc-900/80 border border-zinc-800 p-3 rounded-xl text-right">
                  <span className="text-[10px] text-zinc-500 block">المهام المعلقة للتوزيع:</span>
                  <span className="text-sm font-bold text-amber-400 font-mono">{autoAssignProposals.length} مهام</span>
                </div>
                <div className="bg-zinc-900/80 border border-zinc-800 p-3 rounded-xl text-right">
                  <span className="text-[10px] text-zinc-500 block">الماكينات النشطة المتاحة:</span>
                  <span className="text-sm font-bold text-emerald-400 font-mono">
                    {machines.filter(m => m.status !== 'maintenance' && m.status !== 'offline').length} ماكينات
                  </span>
                </div>
                <div className="bg-zinc-900/80 border border-zinc-800 p-3 rounded-xl text-right">
                  <span className="text-[10px] text-zinc-500 block">معيار الخوارزمية:</span>
                  <span className="text-xs font-bold text-indigo-300">الساعات الأقل + نوع التقنية</span>
                </div>
              </div>

              <div className="space-y-2">
                <span className="text-xs font-bold text-zinc-300 block">مقترح خوارزمية التوزيع التلقائي:</span>
                <div className="max-h-64 overflow-y-auto space-y-2 pr-1 scrollbar-thin">
                  {autoAssignProposals.length === 0 ? (
                    <div className="p-6 text-center text-xs text-zinc-500 bg-zinc-900/40 rounded-xl border border-zinc-850">
                      لا توجد مهام قص معلقة حالياً تتطلب التوزيع التلقائي.
                    </div>
                  ) : (
                    autoAssignProposals.map(({ job, recommendedMachine, reason }) => (
                      <div key={job.id} className="p-3 bg-zinc-900/60 border border-zinc-800 rounded-xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs">
                        <div>
                          <div className="font-bold text-zinc-200">
                            #{job.jobNo} - {job.itemName}
                          </div>
                          <div className="text-[10px] text-zinc-400 mt-0.5">
                            الخامة: {job.materialName || 'غير محددة'} | الزمن التقديري: {job.estTimeSec} ثانية
                          </div>
                        </div>

                        <div className="sm:text-left text-right">
                          <div className="font-bold text-indigo-400 flex items-center gap-1 justify-end">
                            <Cpu className="w-3.5 h-3.5 text-indigo-400" />
                            <span>{recommendedMachine.name}</span>
                          </div>
                          <div className="text-[10px] text-zinc-400 mt-0.5 font-mono">
                            الساعات الإجمالية: <strong className="text-amber-400">{recommendedMachine.workingHours?.toFixed(1) || 0} ساعة</strong>
                          </div>
                          <span className="inline-block mt-1 text-[9px] px-2 py-0.5 bg-indigo-950/60 text-indigo-300 border border-indigo-900/40 rounded">
                            {reason}
                          </span>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>

              {autoAssignProposals.length > 0 && (
                <div className="bg-indigo-950/30 border border-indigo-900/40 p-3 rounded-xl flex items-center gap-2 text-xs text-indigo-300">
                  <input
                    type="checkbox"
                    id="autoStartCheck"
                    checked={autoStartJobs}
                    onChange={(e) => setAutoStartJobs(e.target.checked)}
                    className="rounded border-zinc-700 bg-zinc-900 text-indigo-600 focus:ring-indigo-500 w-4 h-4 cursor-pointer"
                  />
                  <label htmlFor="autoStartCheck" className="cursor-pointer font-bold">
                    بدء تشغيل المهام فوراً على الماكينات الخالية (Idle)
                  </label>
                </div>
              )}
            </div>

            <div className="flex items-center justify-between border-t border-zinc-850 pt-3">
              <button
                type="button"
                onClick={() => setShowAutoAssignModal(false)}
                className="px-4 py-2 bg-zinc-900 hover:bg-zinc-800 text-zinc-300 text-xs font-bold rounded-xl cursor-pointer"
              >
                إلغاء
              </button>

              {autoAssignProposals.length > 0 && (
                <button
                  type="button"
                  disabled={isProcessingAutoAssign}
                  onClick={handleConfirmAutoAssign}
                  className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold rounded-xl cursor-pointer shadow-lg shadow-indigo-600/20 flex items-center gap-2"
                >
                  <Zap className="w-4 h-4 text-amber-300 fill-amber-300" />
                  <span>{isProcessingAutoAssign ? 'جاري التوزيع...' : 'تأكيد وتطبيق التوزيع التلقائي ⚡'}</span>
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ProductionJobView;
