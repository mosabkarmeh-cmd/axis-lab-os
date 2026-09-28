import React, { useState, useEffect, useRef } from "react";
import { safeApiFetch } from "./lib/api";
import { useLocalStorage } from "./hooks/useLocalStorage";
import { useOrderFilters } from "./hooks/useOrderFilters";
import { useCurrencyCalculator } from "./hooks/useCurrencyCalculator";
import { useProductionWorkspace } from "./hooks/useProductionWorkspace";
import { useInventoryWorkspace } from "./hooks/useInventoryWorkspace";
import { useAccountingActions } from "./hooks/useAccountingActions";
import { useCustomerActions } from "./hooks/useCustomerActions";
import { useMaterialActions } from "./hooks/useMaterialActions";
import { useSmartSupplyActions } from "./hooks/useSmartSupplyActions";
import { useOrderActions } from "./hooks/useOrderActions";
import { useGCodeActions } from "./hooks/useGCodeActions";
import { useProductActions } from "./hooks/useProductActions";
import { useProductionActions } from "./hooks/useProductionActions";
import { useNotificationActions } from "./hooks/useNotificationActions";
import { useAuthActions, useLogoutAction } from "./hooks/useAuthActions";
import { useGlobalSearch } from "./hooks/useGlobalSearch";
import { useAiMemoryActions } from "./hooks/useAiMemoryActions";
import { useTerminalActions } from "./hooks/useTerminalActions";
import { useSupplyActions } from "./hooks/useSupplyActions";
import { useAiToolsActions } from "./hooks/useAiToolsActions";
import CutProgressInteractiveTable from "./components/CutProgressInteractiveTable.tsx";
import { calculateOrderProgress } from "./utils/orderProgress";
import { getOrderStatusBadge, getPaymentStatusBadge } from "./components/StatusBadges";
import { DEFAULT_EXCHANGE_RATE, EXCHANGE_RATE_STORAGE_KEY, sanitizeExchangeRate, sypToUsd, usdToSyp } from "./lib/currency";
import {
  Shield,
  UserCheck,
  Cpu,
  Layers,
  Users,
  Briefcase,
  Brain,
  Send,
  Activity,
  Database,
  Terminal as TerminalIcon,
  Play,
  FileCode,
  Lock,
  Unlock,
  Key,
  HelpCircle,
  Plus,
  Trash2,
  ChevronRight,
  ChevronDown,
  Eye,
  EyeOff,
  User as UserIcon,
  ShieldCheck,
  RefreshCw,
  Search,
  Command,
  BookOpen,
  MessageSquare,
  Sparkles,
  CheckCircle2,
  AlertTriangle,
  FolderOpen,
  TrendingUp,
  Settings,
  Scissors,
  DollarSign,
  X,
  Clock,
  Wrench,
  Info,
  Calendar,
  Printer,
  Check,
  Wallet,
  BarChart2,
  Sun,
  Moon,
  Coins,
  ArrowUp,
  ChevronLeft,
  Bell,
  Menu,
  LogOut,
  Calculator,
  FileDown,
  PlusCircle,
  Zap,
  FileText,
  Share2,
  Mail,
  MessageCircle,
  Instagram,
  Phone,
  Copy,
  ExternalLink,
  Truck,
  History,
  XCircle,
  ArrowLeft,
  GitCompare,
  LayoutGrid,
  List,
  Download,
  Archive,
  RotateCcw,
  Box,
  ShieldAlert,
  CreditCard,
  Receipt,
  Edit3,
  Filter,
  SlidersHorizontal,
  QrCode,
  GripVertical
} from "lucide-react";
import { QRCodeSVG } from "qrcode.react";
import { motion, AnimatePresence } from "motion/react";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend
} from "recharts";
import Markdown from "react-markdown";
import { User, Customer, Order, OrderItem, ActivityLog, CodeFile, GCodeResult, Product, Machine, ProductionJob } from "./types";
import { VIRTUAL_FILES } from "./virtualFiles";
import AccountingPage from "./components/AccountingPage";
import { AxisLabLogo, AxisLabLogoFull } from "./components/AxisLabLogo";
import { FileUploader } from "./components/FileUploader";
import ProductionPage from "./components/ProductionPage";
import DashboardPage from "./components/DashboardPage";
import DatabasePage from "./components/DatabasePage";
import AIHubPage from "./components/AIHubPage";
import GlobalDialogs from "./components/GlobalDialogs";
import EmployeeStatsModal from "./components/EmployeeStatsModal";
import InventoryPage from "./components/InventoryPage";
import ReportsPage from "./components/ReportsPage";
import SettingsPage from "./components/SettingsPage";
import HelpPage from "./components/HelpPage";
import SupplierPriceComparisonModal from "./components/SupplierPriceComparisonModal";
import HelpModal from "./components/HelpModal";
import HelpTooltip from "./components/HelpTooltip";
import AddOrderModal from "./components/AddOrderModal";
import LoginScreen from "./components/LoginScreen";
import AutoLogoutTimer from "./components/AutoLogoutTimer";
import CurrencyConverterModal from "./components/CurrencyConverterModal";
import FirstRunPasswordModal from "./components/FirstRunPasswordModal";


export default function App() {
  // Authentication states
  const [sessionActive, setSessionActive] = useState(false);
  const [theme, setTheme] = useLocalStorage<"dark" | "light">("axislab_theme", "dark");
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [authEmail, setAuthEmail] = useState<string>("admin@axislab.com");
  const [authPassword, setAuthPassword] = useState<string>("");
  const [authFullName, setAuthFullName] = useState<string>("");
  const [authRole, setAuthRole] = useState<'admin' | 'employee' | 'accountant'>("employee");
  const [users, setUsers] = useState<Array<{ id: string; email: string; fullName: string; role: string; isActive?: boolean }>>([]);
  const [isRegisterMode, setIsRegisterMode] = useState<boolean>(false);
  const [authError, setAuthError] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState<boolean>(false);
  const [isAuthLoading, setIsAuthLoading] = useState<boolean>(false);
  const [rememberMe, setRememberMe] = useState<boolean>(true);
  const [activePreset, setActivePreset] = useState<string>("admin");
  const [inspectToken, setInspectToken] = useState<any>(null);
  const [firstRunPasswordCurrent, setFirstRunPasswordCurrent] = useState<string | null>(null);
  const [isFirstRunPasswordLoading, setIsFirstRunPasswordLoading] = useState(false);
  const networkSyncInFlightRef = useRef(false);

  // Developer logs and JWT inspect panel visibility states (Hidden by default to keep the UI clean)
  const [showTerminalLogs, setShowTerminalLogs] = useLocalStorage<boolean>("axis_show_terminal_logs", false);
  const [showJwtHud, setShowJwtHud] = useLocalStorage<boolean>("axis_show_jwt_hud", false);

  // Application main navigation
  // "dashboard" | "database" | "gcode" | "explorer"
  const [activeView, setActiveView] = useState<string>("dashboard");
  const [accountingTab, setAccountingTab] = useState<"dashboard" | "reports" | "invoices" | "expenses" | "customers_balances">("dashboard");

  // Collapsible Sidebar & Navigation States
  const [isSidebarExpanded, setIsSidebarExpanded] = useLocalStorage<boolean>("axislab_sidebar_expanded", true);
  const toggleSidebar = () => setIsSidebarExpanded((previous) => !previous);

  // Interactive Notification states
  const [isNotificationsOpen, setIsNotificationsOpen] = useState<boolean>(false);
  const [recycleBinItems, setRecycleBinItems] = useState<any[]>([]);
  const [orderStatuses, setOrderStatuses] = useState<any[]>([]);

  // Global Search Command Palette States
  const [isSearchPaletteOpen, setIsSearchPaletteOpen] = useState<boolean>(false);
  const { searchQuery, setSearchQuery, searchResults, setSearchResults, isSearching } = useGlobalSearch();
  const [isHelpGuideOpen, setIsHelpGuideOpen] = useState<boolean>(false);
  const [showHelpModal, setShowHelpModal] = useState<boolean>(false);
  const [helpActiveTab, setHelpActiveTab] = useState<'intro' | 'smart_forms' | 'shortcuts' | 'video'>('intro');

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ctrl + K for Global Search
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setIsSearchPaletteOpen(prev => !prev);
        return;
      }

      // Alt shortcuts for navigation
      if (e.altKey && !e.ctrlKey && !e.metaKey) {
        const key = e.key.toLowerCase();
        let targetView = "";
        
        if (key === "d") targetView = "dashboard";
        else if (key === "o") targetView = "database";
        else if (key === "p") targetView = "production";
        else if (key === "i" || key === "l") targetView = "products";
        else if (key === "a") targetView = "accounting";
        else if (key === "s") targetView = "settings";
        else if (key === "h") {
          e.preventDefault();
          setIsHelpGuideOpen(prev => !prev);
          return;
        }

        if (targetView) {
          e.preventDefault();
          setActiveView(targetView);
        }
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  const [isProfileOpen, setIsProfileOpen] = useState<boolean>(false);

  // Operational states (fetched or local)
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [logs, setLogs] = useState<ActivityLog[]>([]);

  // Order archiving state
  const [orderTabFilter, setOrderTabFilter] = useState<"active" | "archived" | "all">("active");
  const [databaseTab, setDatabaseTab] = useState<"active" | "archived" | "all">("active");
  const [archiveDaysThreshold, setArchiveDaysThreshold] = useState<number>(30);

  // Advanced Order Filtering State
  const [orderFilterSearch, setOrderFilterSearch] = useState<string>("");
  const [orderFilterStartDate, setOrderFilterStartDate] = useState<string>("");
  const [orderFilterEndDate, setOrderFilterEndDate] = useState<string>("");
  const [orderFilterPriority, setOrderFilterPriority] = useState<string>("all");
  const [orderFilterCustomer, setOrderFilterCustomer] = useState<string>("all");
  const [orderFilterStatus, setOrderFilterStatus] = useState<string>("all");

  const resetOrderFilters = () => {
    setOrderFilterSearch("");
    setOrderFilterStartDate("");
    setOrderFilterEndDate("");
    setOrderFilterPriority("all");
    setOrderFilterCustomer("all");
    setOrderFilterStatus("all");
  };

  const activeOrderFiltersCount = (orderFilterSearch ? 1 : 0) +
    (orderFilterStartDate ? 1 : 0) +
    (orderFilterEndDate ? 1 : 0) +
    (orderFilterPriority !== "all" ? 1 : 0) +
    (orderFilterCustomer !== "all" ? 1 : 0) +
    (orderFilterStatus !== "all" ? 1 : 0);

  const filteredOrders = useOrderFilters({
    orders,
    customers,
    databaseTab,
    search: orderFilterSearch,
    startDate: orderFilterStartDate,
    endDate: orderFilterEndDate,
    priority: orderFilterPriority,
    customer: orderFilterCustomer,
    status: orderFilterStatus,
  });

  const [exchangeRate, setExchangeRate] = useState<number>(() => {
    const saved = localStorage.getItem(EXCHANGE_RATE_STORAGE_KEY);
    return sanitizeExchangeRate(saved, DEFAULT_EXCHANGE_RATE);
  });

  const { calcUsd, calcSyp, handleUsdChange, handleSypChange, refreshFromUsd } = useCurrencyCalculator(exchangeRate);

  useEffect(() => {
    localStorage.setItem(EXCHANGE_RATE_STORAGE_KEY, exchangeRate.toString());
  }, [exchangeRate]);

  // Server is the source of truth: on load, pull whatever rate the workshop owner
  // last saved (from any device/session) and use it instead of this browser's
  // possibly-stale localStorage copy.
  useEffect(() => {
    fetch("/api/exchange-rate")
      .then(res => res.json())
      .then(data => {
        if (data?.success && data.exchangeRate > 0) {
          setExchangeRate(data.exchangeRate);
        }
      })
      .catch(() => {});
  }, []);

  const updateRate = (newRate: number) => {
    const normalizedRate = sanitizeExchangeRate(newRate, exchangeRate);
    setExchangeRate(normalizedRate);
    localStorage.setItem(EXCHANGE_RATE_STORAGE_KEY, normalizedRate.toString());
    window.dispatchEvent(new Event("storage"));

    // Push to the backend so PDFs, payment records, and pricing suggestions all
    // use the same number instead of their own stale hardcoded rate.
    fetch("/api/exchange-rate", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ exchangeRate: normalizedRate })
    }).catch(() => {});

    // Refresh calculator values
    const numUsd = parseFloat(calcUsd);
    if (!isNaN(numUsd)) {
      refreshFromUsd(calcUsd, normalizedRate);
    }
  };

  const getSevenDaysChartData = () => {
    const data = [];
    const daysOfWeek = ["الأحد", "الاثنين", "الثلاثاء", "الأربعاء", "الخميس", "الجمعة", "السبت"];
    
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const dateStr = d.toISOString().slice(0, 10);
      const dayName = daysOfWeek[d.getDay()];
      
      const dayOrders = orders.filter(o => o.createdAt && o.createdAt.slice(0, 10) === dateStr);
      
      let revenue = dayOrders.reduce((sum, o) => sum + (o.totalPrice || 0), 0);
      let orderCount = dayOrders.length;
      
      // Map real orders
      const mappedRealOrders = dayOrders.map(o => {
        const cust = customers.find(c => c.id === o.customerId);
        const statusMap: Record<string, string> = {
          new: "جديد",
          in_progress: "قيد الإنتاج",
          ready: "جاهز للتسليم",
          delivered: "تم التسليم",
          cancelled: "ملغي"
        };
        const itemsSummary = o.items && o.items.length > 0 
          ? o.items.map(it => `${it.productName || "عنصر مخصص"} x${it.quantity}`).join("، ")
          : "طلب مخصص";
        return {
          orderNumber: o.orderNumber || `ORD-${o.id.slice(0, 4).toUpperCase()}`,
          customerName: cust ? cust.name : "عميل مجهول",
          totalPrice: o.totalPrice || 0,
          itemsSummary,
          status: statusMap[o.status] || "مجهول",
          isMock: false
        };
      });

      const allDayOrderDetails = mappedRealOrders;
      
      data.push({
        date: dateStr,
        day: dayName,
        revenue: parseFloat(revenue.toFixed(2)),
        orders: orderCount,
        orderDetails: allDayOrderDetails
      });
    }
    return data;
  };

    // Production workspace state is isolated so production handlers and pages can be moved independently.
  const {
    machines, setMachines, productionJobs, setProductionJobs, isLoadingProduction, setIsLoadingProduction,
    showAddJob, setShowAddJob, showAddMachine, setShowAddMachine, activeProductionSubTab, setActiveProductionSubTab,
    newMachineName, setNewMachineName, newMachineType, setNewMachineType, newMachineHours, setNewMachineHours,
    machineSearchQuery, setMachineSearchQuery, machineStatusFilter, setMachineStatusFilter, machineLayout, setMachineLayout,
    newJobItemName, setNewJobItemName, newJobMaterialId, setNewJobMaterialId, newJobLaserPower, setNewJobLaserPower,
    newJobLaserSpeed, setNewJobLaserSpeed, newJobEstTime, setNewJobEstTime, newJobOrderId, setNewJobOrderId,
    activeRunningJob, setActiveRunningJob, liveLogLines, setLiveLogLines, laserX, setLaserX, laserY, setLaserY,
    showRemnantRegister, setShowRemnantRegister, jobRemWidth, setJobRemWidth, jobRemHeight, setJobRemHeight,
    jobRemLocation, setJobRemLocation,
  } = useProductionWorkspace();

  // Workspace explorer files state
  const [virtualFiles, setVirtualFiles] = useState<CodeFile[]>(VIRTUAL_FILES);
  const [selectedFileId, setSelectedFileId] = useState<string>("v-prisma");

  // Customer modal/form states
  const [showAddCustomer, setShowAddCustomer] = useState<boolean>(false);
  const [custName, setCustName] = useState<string>("");
  const [custPhone, setCustPhone] = useState<string>("");
  const [custCompany, setCustCompany] = useState<string>("");
  const [custAddress, setCustAddress] = useState<string>("");
  const [custNotes, setCustNotes] = useState<string>("");
  const [custCategory, setCustCategory] = useState<string>("شركة");
  const [customerCategoryFilter, setCustomerCategoryFilter] = useState<string>("الكل");

  // Customer edit states
  const [editingCustomer, setEditingCustomer] = useState<Customer | null>(null);
  const [editCustName, setEditCustName] = useState<string>("");
  const [editCustPhone, setEditCustPhone] = useState<string>("");
  const [editCustWhatsapp, setEditCustWhatsapp] = useState<string>("");
  const [editCustEmail, setEditCustEmail] = useState<string>("");
  const [editCustCompany, setEditCustCompany] = useState<string>("");
  const [editCustAddress, setEditCustAddress] = useState<string>("");
  const [editCustNotes, setEditCustNotes] = useState<string>("");
  const [editCustCategory, setEditCustCategory] = useState<string>("شركة");

  // Product modal/form states
  const [showAddProduct, setShowAddProduct] = useState<boolean>(false);
  const [prodName, setProdName] = useState<string>("");
  const [prodCode, setProdCode] = useState<string>("");
  const [prodCategory, setProdCategory] = useState<string>("الأكريليك");
  const [prodPrice, setProdPrice] = useState<string>("");
  const [prodDescription, setProdDescription] = useState<string>("");
  const [prodStock, setProdStock] = useState<string>("");
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [productSearch, setProductSearch] = useState<string>("");
  const [productFilter, setProductFilter] = useState<string>("الكل");

  // Order creation state
  const [showAddOrder, setShowAddOrder] = useState<boolean>(false);
  const [showEmployeeStats, setShowEmployeeStats] = useState<boolean>(false);
  const [selectedCustomerIdForOrder, setSelectedCustomerIdForOrder] = useState<string>("");
  const [showShareModal, setShowShareModal] = useState<boolean>(false);

  // --- AXIS LAB AI Hub State Managers ---
  const [activeAiTab, setActiveAiTab] = useState<'chat' | 'fast_calc' | 'parser' | 'memory' | 'search'>("chat");
  const [fastResponseMode, setFastResponseMode] = useState<boolean>(true);
  const [lastResponseLatencyMs, setLastResponseLatencyMs] = useState<number | null>(4);

  // Fast Laser Calculator state
  const [calcMatId, setCalcMatId] = useState<string>("m-1");
  const [calcMachineId, setCalcMachineId] = useState<string>("");
  const [calcThicknessMm, setCalcThicknessMm] = useState<number>(3);
  const [calcWidthCm, setCalcWidthCm] = useState<number>(30);
  const [calcLengthCm, setCalcLengthCm] = useState<number>(40);
  const [calcCutLengthCm, setCalcCutLengthCm] = useState<number>(100);
  const [calcEngraveAreaCm2, setCalcEngraveAreaCm2] = useState<number>(50);
  const [calcQuantity, setCalcQuantity] = useState<number>(1);
  const [calcLaserPowerWatts, setCalcLaserPowerWatts] = useState<number>(100);
  const [calcTubeCostUSD, setCalcTubeCostUSD] = useState<number>(350);
  const [calcTubeLifespanHours, setCalcTubeLifespanHours] = useState<number>(4000);
  const [calcWorkType, setCalcWorkType] = useState<string>("cut_engrave");
  const [calcSetupFeeUSD, setCalcSetupFeeUSD] = useState<number>(3);
  const [calcElectricityRate, setCalcElectricityRate] = useState<number>(0.15);
  const [calcOperatorRate, setCalcOperatorRate] = useState<number>(15);
  const [calcAutoWaste, setCalcAutoWaste] = useState<boolean>(true);
  const [calcWasteOverridePercent, setCalcWasteOverridePercent] = useState<number>(10);
  const [calcTargetProfitMargin, setCalcTargetProfitMargin] = useState<number>(50);
  const [calcResult, setCalcResult] = useState<any>(null);
  const [isCalculatingFast, setIsCalculatingFast] = useState<boolean>(false);

  // Order Parser State
  const [parserInputText, setParserInputText] = useState<string>("");
  const [parserResult, setParserResult] = useState<any>(null);
  const [isParsingFast, setIsParsingFast] = useState<boolean>(false);

  const [chatMessages, setChatMessages] = useState<Array<{ id: string; sender: 'user' | 'ai'; text: string; time: string }>>([
    {
      id: "init",
      sender: "ai",
      text: "مرحباً بك في مركز **AXIS AI** الذكي المطور داخلياً ومحلياً بالكامل للعمل **دون الحاجة للإنترنت (100% Offline)**! 🧠\n\nأنا رفيقك ومستشارك الرقمي داخل الورشة، مستعد للإجابة عن أسئلتك حول الحسابات والأرباح ومستويات المخازن، واقتراح بارامترات ليزر CO2 المناسبة للخامات، وحل مشاكل التشغيل والصيانة.\n\nبمَ ترغب في البدء اليوم؟",
      time: new Date().toLocaleTimeString("ar-SY", { hour: '2-digit', minute: '2-digit' })
    }
  ]);
  const [chatInput, setChatInput] = useState<string>("");
  const [isSendingChatMessage, setIsSendingChatMessage] = useState<boolean>(false);

  // --- FAST LOCAL REAL-TIME AI INTERACTION STATES ---
  const [fastLocalInventoryPredictions, setFastLocalInventoryPredictions] = useState<any[]>([]);
  const [fastLocalProductionScheduling, setFastLocalProductionScheduling] = useState<{
    success: boolean;
    recommendedScheduling: any[];
    adviceMessage: string;
  } | null>(null);
  const [fastLocalDashboardTrends, setFastLocalDashboardTrends] = useState<{
    incomeTrend: string;
    efficiencyRate: string;
    bestSellerProduct: string;
    netProfit: string;
    expenseAnomaly: string | null;
    productionCompletedCount: number;
  } | null>(null);

  // Fetch Fast Local AI insights and scheduling predictions
  const fetchFastLocalGlobalInsights = () => {
    // 1. Inventory predictions
    fetch("/api/ai/fast-local", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "inventory-predictions" })
    })
    .then(res => {
      if (!res.ok) throw new Error(`HTTP error! status: ${res.status}`);
      return res.json();
    })
    .then(data => {
      if (Array.isArray(data)) {
        setFastLocalInventoryPredictions(data);
      }
    })
    .catch(err => console.error("Error fetching inventory predictions:", err));

    // 2. Production scheduling
    fetch("/api/ai/fast-local", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "production-scheduling" })
    })
    .then(res => {
      if (!res.ok) throw new Error(`HTTP error! status: ${res.status}`);
      return res.json();
    })
    .then(data => {
      setFastLocalProductionScheduling(data);
    })
    .catch(err => console.error("Error fetching production scheduling:", err));

    // 3. Dashboard trends
    fetch("/api/ai/fast-local", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "dashboard-trends" })
    })
    .then(res => {
      if (!res.ok) throw new Error(`HTTP error! status: ${res.status}`);
      return res.json();
    })
    .then(data => {
      setFastLocalDashboardTrends(data);
    })
    .catch(err => console.error("Error fetching dashboard trends:", err));
  };

  useEffect(() => {
    fetchFastLocalGlobalInsights();
  }, []);

  // Order viewing / details modal state
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [orderDetailsTab, setOrderDetailsTab] = useState<'items' | 'payments' | 'gcode' | 'timeline' | 'files'>("items");
  const [newPaymentAmount, setNewPaymentAmount] = useState<string>("");
  const [paymentInputCurrency, setPaymentInputCurrency] = useState<'USD' | 'SYP'>("SYP");
  const [newPaymentSYPAmount, setNewPaymentSYPAmount] = useState<string>("");
  const [newPaymentNotes, setNewPaymentNotes] = useState<string>("");
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState<'cash' | 'transfer' | 'card'>("cash");
  const [deliveryBlockedOrder, setDeliveryBlockedOrder] = useState<Order | null>(null);
  const [isProcessingQuickFullPay, setIsProcessingQuickFullPay] = useState<boolean>(false);
  const [selectedPaymentReceipt, setSelectedPaymentReceipt] = useState<{ receipt: any; order: Order } | null>(null);
  const [orderGcodeResult, setOrderGcodeResult] = useState<GCodeResult | null>(null);
  const [isCompilingOrderGcode, setIsCompilingOrderGcode] = useState<boolean>(false);
  const [printTicketOrder, setPrintTicketOrder] = useState<Order | null>(null);
  const [progressModalOrder, setProgressModalOrder] = useState<Order | null>(null);
  const [newCutItemName, setNewCutItemName] = useState<string>("");
  const [newCutItemQty, setNewCutItemQty] = useState<number>(1);
  const [newCutItemMat, setNewCutItemMat] = useState<string>("أكريليك");
  const [showAddCutItemForm, setShowAddCutItemForm] = useState<boolean>(false);

  // Share modal states
  const [shareEmail, setShareEmail] = useState<string>("");
  const [shareSubject, setShareSubject] = useState<string>("");
  const [shareBody, setShareBody] = useState<string>("");
  const [shareMethod, setShareMethod] = useState<'email' | 'whatsapp' | 'pdf'>("email");
  const [isSharingEmail, setIsSharingEmail] = useState<boolean>(false);
  const [shareEmailSuccess, setShareEmailSuccess] = useState<boolean>(false);
  const [sharePdfCopied, setSharePdfCopied] = useState<boolean>(false);
  const [shareMsgCopied, setShareMsgCopied] = useState<boolean>(false);
  const [companySettings, setCompanySettings] = useState<any>(null);

  useEffect(() => {
    fetch("/api/settings")
      .then(res => res.json())
      .then(data => {
        if (data?.settings?.company) setCompanySettings(data.settings.company);
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (showShareModal && selectedOrder) {
      const cust = customers.find(c => c.id === selectedOrder.customerId);
      const compName = companySettings?.name || "AXIS LAB - مجمع الورش الذكية";
      const compEmail = companySettings?.email || "contact@axislab.com";
      const compWhatsapp = companySettings?.whatsapp || companySettings?.phone || cust?.phone || "";
      const compInstagram = companySettings?.instagram || "";

      setShareEmail(cust?.email || (cust?.name ? `${cust.name.replace(/\s+/g, '').toLowerCase()}@example.com` : "customer@example.com"));
      setShareSubject(`${compName} - تفاصيل ملخص الطلب رقم #${selectedOrder.orderNumber}`);
      
      const itemsStr = selectedOrder.items ? selectedOrder.items.map(it => `  - ${it.productName} (الكمية: ${it.quantity} | السعر: $${it.unitPrice.toFixed(2)})`).join("\n") : "  - لا توجد عناصر حالياً";
      
      const bodyText = `عزيزي ${cust?.name || "العميل الكريم"}،

تحية طيبة من ${compName}.

نود تزويدك بملخص الطلب الخاص بك والذي تم تسجيله في نظامنا:

- رقم الطلب: ${selectedOrder.orderNumber}
- تاريخ التسجيل: ${new Date(selectedOrder.createdAt).toLocaleDateString('ar-EG')}
- حالة الطلب: ${
        selectedOrder.status === 'delivered' ? 'تم التسليم' :
        selectedOrder.status === 'ready' ? 'جاهز للتسليم' :
        selectedOrder.status === 'in_progress' ? 'قيد الإنتاج والقص' : 'جديد'
      }

العناصر المطلوبة:
${itemsStr}

التفاصيل المالية:
- القيمة الإجمالية للطلب: ${Number(selectedOrder.totalPrice || 0).toLocaleString()} ل.س
- المبلغ المدفوع: ${Number(selectedOrder.paidAmount || 0).toLocaleString()} ل.س
- المبلغ المتبقي: ${Number(selectedOrder.remaining || 0).toLocaleString()} ل.س

تحميل الفاتورة وسند التسليم الإلكتروني PDF:
https://axislab-portal.sy/api/orders/${selectedOrder.id}/pdf

للتواصل المباشر والاستفسار:
📱 واتساب المبيعات: ${compWhatsapp}
📧 البريد الرسمي: ${compEmail}
${compInstagram ? `📸 إنستغرام الورشة: ${compInstagram}\n` : ''}
نشكر ثقتكم بـ ${compName}.`;
      setShareBody(bodyText);
      setShareEmailSuccess(false);
      setSharePdfCopied(false);
      setShareMsgCopied(false);
    }
  }, [showShareModal, selectedOrder, customers, exchangeRate, companySettings]);

  const handleSendEmailShare = async () => {
    if (!selectedOrder) return;
    setIsSharingEmail(true);
    try {
      const response = await fetch(`/api/orders/${selectedOrder.id}/share`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          email: shareEmail,
          subject: shareSubject,
          body: shareBody,
          method: "email"
        })
      });
      const data = await response.json();
      if (data.success) {
        setShareEmailSuccess(true);
        addTerminalLog("EMAIL", `Sent order ${selectedOrder.orderNumber} summary to ${shareEmail}`);
        if (typeof fetchNotifications === "function") fetchNotifications();
        if (typeof fetchLogs === "function") fetchLogs();
      } else {
        window.showAlert?.("حدث خطأ أثناء المشاركة: " + data.message, "فشل المشاركة");
      }
    } catch (err: unknown) {
      console.error(err);
      window.showAlert?.("فشل الاتصال بالخادم لمشاركة الطلب", "خطأ في الاتصال");
    } finally {
      setIsSharingEmail(false);
    }
  };

  const handleCopyText = (text: string, type: 'pdf' | 'msg') => {
    navigator.clipboard.writeText(text);
    if (type === 'pdf') {
      setSharePdfCopied(true);
      setTimeout(() => setSharePdfCopied(false), 2000);
    } else {
      setShareMsgCopied(true);
      setTimeout(() => setShareMsgCopied(false), 2000);
    }
  };

  // File management expansion modals
  const [selectedProductFiles, setSelectedProductFiles] = useState<any | null>(null);
  const [selectedCustomerFiles, setSelectedCustomerFiles] = useState<any | null>(null);
  const [selectedMaterialFiles, setSelectedMaterialFiles] = useState<any | null>(null);

  // Order editing state
  const [editingOrder, setEditingOrder] = useState<Order | null>(null);
  const [editOrderItems, setEditOrderItems] = useState<Array<{ name: string; qty: number; price: number; notes?: string }>>([]);
  const [editFocusedItemIdx, setEditFocusedItemIdx] = useState<number | null>(null);

  // Inventory workspace state is isolated so materials, remnants and supplier workflows can move into InventoryPage safely.
  const {
    materials, setMaterials, draggedMaterialId, setDraggedMaterialId, dragOverMaterialId, setDragOverMaterialId,
    materialCategories, setMaterialCategories, remnants, setRemnants, suppliers, setSuppliers, supplyOrders, setSupplyOrders,
    materialStats, setMaterialStats, activeProductSubTab, setActiveProductSubTab, supplyOrdersFilterStatus, setSupplyOrdersFilterStatus,
    supplyOrdersSearch, setSupplyOrdersSearch, materialSortBy, setMaterialSortBy, materialQualityFilter, setMaterialQualityFilter,
    showSmartSupplyModal, setShowSmartSupplyModal, smartSupplyItems, setSmartSupplyItems, isSubmittingSmartSupply, setIsSubmittingSmartSupply,
    showAddMaterial, setShowAddMaterial, matName, setMatName, matCategory, setMatCategory, matSubCategory, setMatSubCategory,
    matThickness, setMatThickness, matColor, setMatColor, matWidth, setMatWidth, matHeight, setMatHeight, matUnit, setMatUnit,
    matPrice, setMatPrice, matMinStock, setMatMinStock, matSupplierId, setMatSupplierId, matNotes, setMatNotes, matLocation, setMatLocation,
    matQualityStatus, setMatQualityStatus, editingMaterial, setEditingMaterial, isAiClassifying, setIsAiClassifying,
    aiClassificationResult, setAiClassificationResult, showAdjustStock, setShowAdjustStock, adjustQty, setAdjustQty,
    adjustType, setAdjustType, adjustReason, setAdjustReason, priceComparisonMaterial, setPriceComparisonMaterial,
    isCurrencyConverterOpen, setIsCurrencyConverterOpen, selectedDashboardSupplierId, setSelectedDashboardSupplierId,
    newSupplyMaterialId, setNewSupplyMaterialId, newSupplyQty, setNewSupplyQty, newSupplyPrice, setNewSupplyPrice,
    newSupplyExpectedDate, setNewSupplyExpectedDate, newSupplyNotes, setNewSupplyNotes, isSubmittingSupplyOrder, setIsSubmittingSupplyOrder,
  } = useInventoryWorkspace();

  // Remnants form / modal states
  const [showAddRemnant, setShowAddRemnant] = useState<boolean>(false);
  const [isQuickActionsOpen, setIsQuickActionsOpen] = useState<boolean>(false);
  const [deleteConfirmTarget, setDeleteConfirmTarget] = useState<{ id: string; name: string; type: 'customer' | 'product' } | null>(null);
  const [remMatId, setRemMatId] = useState<string>("");
  const [remWidth, setRemWidth] = useState<string>("");
  const [remHeight, setRemHeight] = useState<string>("");
  const [remQty, setRemQty] = useState<string>("1");
  const [remLocation, setRemLocation] = useState<string>("");
  const [findSuitableMatId, setFindSuitableMatId] = useState<string>("");
  const [findSuitableW, setFindSuitableW] = useState<string>("");
  const [findSuitableH, setFindSuitableH] = useState<string>("");
  const [suitableRemnantResult, setSuitableRemnantResult] = useState<any | null>(null);

  // Laser G-Code Compiler tab states
  const [gcodeTabMode, setGcodeTabMode] = useState<'vector' | 'prompt'>("vector");
  const [gcodePrompt, setGcodePrompt] = useState<string>("قص ترس دائري بقطر 12سم مع حفر شعار نجمة هندسية بالمنتصف");
  const [gcodeMaterial, setGcodeMaterial] = useState<string>("Acrylic 5mm");
  const [gcodeSpeed, setGcodeSpeed] = useState<number>(45);
  const [gcodePower, setGcodePower] = useState<number>(80);
  const [isCompilingGCode, setIsCompilingGCode] = useState<boolean>(false);
  const [gcodeResult, setGcodeResult] = useState<GCodeResult | null>(null);

  const terminalBottomRef = useRef<HTMLDivElement>(null);

  // Computed Dashboard Metrics
  const pendingOrders = orders.filter(o => o.status === "new" || o.status === "in_progress");
  const lowStockCount = materialStats?.lowStock ?? materials.filter(m => m.inventory ? m.inventory.availableQuantity < m.minimumStock : m.minimumStock > 0).length;
  const laserMachines = machines.filter(m => m.type === 'laser_co2' || m.type === 'fiber_laser');
  const runningLasersCount = laserMachines.filter(m => m.status === 'running').length;
  const todayDateStr = new Date().toLocaleDateString("en-CA");
  const todayLaserJobs = productionJobs.filter(job => {
    const isToday = job.createdAt && job.createdAt.slice(0, 10) === todayDateStr;
    const isLaser = job.machineName ? (job.machineName.toLowerCase().includes('laser') || job.machineName.toLowerCase().includes('co2')) : true;
    return isToday && isLaser;
  });
  const laserUtilizationPercent = Math.min(100, Math.max(0, Math.round(65 + (laserMachines.length > 0 ? (runningLasersCount / laserMachines.length) * 20 : 0) + Math.min(todayLaserJobs.length * 4, 15))));

  // Load initial data from memory endpoints
  useEffect(() => {
    fetchCustomers();
    fetchProducts();
    fetchOrders();
    fetchLogs();
    refreshInventoryData();
    fetchMachines();
    fetchProductionJobs();
    fetchNotifications();
    fetchRecycleBin();
    fetchOrderStatuses();
  }, []);

  useEffect(() => {
    if (currentUser) void fetchAssignableUsers();
  }, [currentUser?.id]);

  // One coordinated LAN sync keeps all clients consistent without overlapping requests.
  useEffect(() => {
    const pollInterval = setInterval(() => {
      if (document.visibilityState === "visible" && currentUser) void refreshNetworkSnapshot();
    }, 8000);

    return () => clearInterval(pollInterval);
  }, [currentUser?.id]);

  // Restore the authenticated session from the server-side HttpOnly cookie.
  useEffect(() => {
    addTerminalLog("SYSTEM", "فحص جلسة العمل الآمنة عبر ملف تعريف الارتباط المحمي...");
    fetch("/api/auth/verify", { credentials: "include" })
      .then(res => {
        if (res.ok) return res.json();
        throw new Error("No active session");
      })
      .then(data => {
        setSessionActive(true);
        setCurrentUser(data.user);
        fetchAssignableUsers();
        if (data.user.role === "accountant") setActiveView("accounting");
        else if (data.user.role === "employee") setActiveView("production");
        else setActiveView("dashboard");
        addTerminalLog("JWT", `مرحباً بعودتك ${data.user.fullName}! تم التحقق من جلسة HttpOnly الآمنة.`);
        fetchLogs();
      })
      .catch(() => {
        setSessionActive(false);
        setCurrentUser(null);
      });
  }, []);

  useEffect(() => {
    if (currentUser?.mustChangePassword && sessionActive) {
      setFirstRunPasswordCurrent(authPassword || null);
    } else {
      setFirstRunPasswordCurrent(null);
    }
  }, [currentUser?.mustChangePassword, sessionActive, authPassword]);

  const handleFirstRunPasswordChange = async (currentPassword: string, newPassword: string) => {
    if (!sessionActive) return;
    setIsFirstRunPasswordLoading(true);
    try {
      const res = await fetch("/api/auth/change-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ currentPassword, newPassword }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "تعذر تغيير كلمة المرور");
      setCurrentUser(data.user);
      setFirstRunPasswordCurrent(null);
      setAuthError(null);
      addTerminalLog("AUTH", "تم تغيير كلمة مرور المسؤول المؤقتة بنجاح.");
    } catch (error: unknown) {
      setAuthError(error.message);
      addTerminalLog("ERROR", error.message);
    } finally {
      setIsFirstRunPasswordLoading(false);
    }
  };

  // Enforce role-based view permissions dynamically
  useEffect(() => {
    if (!currentUser) return;
    if (currentUser.role === "employee") {
      const allowedForEmployee = ["production", "dashboard", "products", "gcode", "database", "ai_hub", "help"];
      if (!allowedForEmployee.includes(activeView)) {
        setActiveView("production");
      }
    } else if (currentUser.role === "accountant") {
      const allowedForAccountant = ["accounting", "dashboard", "database", "products", "reports", "ai_hub", "help"];
      if (!allowedForAccountant.includes(activeView)) {
        setActiveView("accounting");
      }
    }
  }, [currentUser, activeView]);

  // JWT is intentionally not decoded in the renderer. The HttpOnly cookie is not readable by JavaScript.
  useEffect(() => {
    if (sessionActive) {
      setInspectToken({
        header: { mode: "HttpOnly session cookie", algorithm: "HS256 (server-side)" },
        payload: { session: "authenticated", visibility: "server-only" },
        signature: "hidden from renderer by HttpOnly cookie"
      });
    } else {
      setInspectToken(null);
    }
  }, [sessionActive]);

  // Database fetchers use the shared safe API client from src/lib/api.ts.
  const fetchAssignableUsers = async () => {
    const data = await safeApiFetch<{ success?: boolean; users?: Array<{ id: string; email: string; fullName: string; role: string; isActive?: boolean }> }>("/api/users/assignable");
    if (data?.success && Array.isArray(data.users)) setUsers(data.users);
  };

  const fetchMachines = async () => {
    const data = await safeApiFetch("/api/production/machines");
    if (data && data.success) setMachines(data.machines);
  };

  const fetchProductionJobs = async () => {
    const data = await safeApiFetch("/api/production/jobs");
    if (data && data.success) setProductionJobs(data.jobs);
  };

  const fetchCustomers = async () => {
    const data = await safeApiFetch("/api/customers");
    if (data && Array.isArray(data)) setCustomers(data);
  };

  const fetchProducts = async () => {
    const data = await safeApiFetch("/api/products");
    if (data && Array.isArray(data)) setProducts(data);
  };

  const fetchOrders = async () => {
    const data = await safeApiFetch("/api/orders");
    if (data && Array.isArray(data)) {
      setOrders(data);
      fetchFastLocalGlobalInsights();
    }
  };

  const fetchLogs = async () => {
    const data = await safeApiFetch("/api/logs");
    if (data && Array.isArray(data)) setLogs(data);
  };

  const refreshNetworkSnapshot = async () => {
    if (networkSyncInFlightRef.current || !currentUser) return;
    networkSyncInFlightRef.current = true;
    try {
      await Promise.all([
        fetchOrders(),
        fetchMachines(),
        fetchProductionJobs(),
        refreshInventoryData(),
        fetchLogs(),
        fetchNotifications(),
      ]);
    } finally {
      networkSyncInFlightRef.current = false;
    }
  };

  const fetchRecycleBin = async () => {
    const data = await safeApiFetch("/api/recycle-bin");
    if (data && data.success) setRecycleBinItems(data.items);
  };

  const fetchOrderStatuses = async () => {
    const data = await safeApiFetch("/api/order-statuses");
    if (data && data.success) setOrderStatuses(data.statuses);
  };

  const sortMaterialsBySavedOrder = (mats: any[]) => {
    try {
      const savedOrderRaw = localStorage.getItem("axislab_materials_order_ids");
      if (savedOrderRaw) {
        const savedIds: string[] = JSON.parse(savedOrderRaw);
        const orderMap = new Map<string, number>();
        savedIds.forEach((id, idx) => orderMap.set(id, idx));
        return [...mats].sort((a, b) => {
          const indexA = orderMap.has(a.id) ? orderMap.get(a.id)! : 99999;
          const indexB = orderMap.has(b.id) ? orderMap.get(b.id)! : 99999;
          return indexA - indexB;
        });
      }
    } catch (e) {
      console.error("Error loading saved material order", e);
    }
    return mats;
  };

  const fetchMaterials = async () => {
    const data = await safeApiFetch("/api/materials");
    if (data && data.success) {
      setMaterials(sortMaterialsBySavedOrder(data.materials));
    }
  };


  const fetchMaterialCategories = async () => {
    const data = await safeApiFetch("/api/materials/categories");
    if (data && data.success) setMaterialCategories(data.categories);
  };

  const fetchRemnants = async () => {
    const data = await safeApiFetch("/api/remnants");
    if (data && data.success) setRemnants(data.remnants);
  };

  const fetchSuppliers = async () => {
    const data = await safeApiFetch("/api/suppliers");
    if (data && data.success) setSuppliers(data.suppliers);
  };

  const fetchSupplyOrders = async () => {
    const data = await safeApiFetch("/api/supply-orders");
    if (data && data.success) setSupplyOrders(data.supplyOrders || []);
  };

  const fetchMaterialStats = async () => {
    const data = await safeApiFetch("/api/inventory/stats");
    if (data && data.success) setMaterialStats(data.stats);
  };

  const refreshInventoryData = () => {
    fetchMaterials();
    fetchRemnants();
    fetchMaterialStats();
    fetchSuppliers();
    fetchSupplyOrders();
    fetchMaterialCategories();
  };

  const addTerminalLog = (type: string, msg: string) => {
    const time = new Date().toLocaleTimeString([], { hour12: false });
    setTerminalLogs(prev => [...prev, { time, type: type.toUpperCase(), msg }]);
  };

  const { handleLogin, handleRegister, setAuthPreset } = useAuthActions({
    authEmail, authPassword, authFullName, authRole,
    setSessionActive, setCurrentUser, setAuthError, setIsAuthLoading, setIsRegisterMode,
    setActivePreset, setAuthEmail, setAuthPassword, setActiveView,
    rememberMe,
    addTerminalLog, fetchLogs,
  });

  const {
    aiMemoryLayers, isLoadingAiMemory, aiSearchQuery, setAiSearchQuery, aiSearchResults,
    isSearchingAi, fetchAiMemory, handleAiSearch,
  } = useAiMemoryActions({ activeAiTab, orders, materials });
  const [selectedMemoryLayer, setSelectedMemoryLayer] = useState<string>("short_term");
  const {
    terminalLogs, setTerminalLogs, commandInput, setCommandInput, handleTerminalSubmit, executeTerminalCommand,
  } = useTerminalActions({ currentUser, sessionActive, users, addTerminalLog });
  useEffect(() => {
    terminalBottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [terminalLogs]);

  const {
    notifications,
    fetchNotifications,
    handleMarkAsRead,
    handleMarkAllAsRead,
    handleDeleteNotification,
  } = useNotificationActions();

  const {
    handleAiClassifyMaterial,
    handleCreateMaterial,
    handleUpdateMaterial,
    handleUpdateMaterialQualityStatus,
    handleDeleteMaterial,
    handleReorderMaterials,
    handleExportMaterialsCSV,
  } = useMaterialActions({
    matName, matCategory, matSubCategory, matThickness, matColor, matWidth, matHeight, matUnit, matPrice, matMinStock, matSupplierId, matNotes, matLocation, matQualityStatus,
    editingMaterial, aiClassificationResult,
    setMatName, setMatSubCategory, setMatThickness, setMatColor, setMatWidth, setMatHeight, setMatPrice, setMatMinStock, setMatSupplierId, setMatNotes, setMatLocation, setMatQualityStatus,
    setEditingMaterial, setAiClassificationResult, setIsAiClassifying, setShowAddMaterial, setMaterials,
    refreshInventoryData, addTerminalLog, materials, exchangeRate, setMaterialSortBy,
  });
  const { handleCreateProduct, handleUpdateProduct, handleDeleteProduct } = useProductActions({
    prodName, prodCode, prodCategory, prodPrice, prodDescription, prodStock, editingProduct,
    setProdName, setProdCode, setProdCategory, setProdPrice, setProdDescription, setProdStock,
    setShowAddProduct, setEditingProduct, fetchProducts, addTerminalLog,
  });
  const {
    handleAddMachine, handleDeleteMachine, handleStartProductionJob, handlePauseProductionJob,
    handleUpdateMachineCalibration, handleUpdateProductionJob, handleReorderProductionJobs,
    handleCreateProductionJob, handleRegisterRemnantOnJobComplete, handleDirectCompleteJob,
    handleChangeMachineMaintenance,
  } = useProductionActions({
    newMachineName, newMachineType, newMachineHours, currentUser, productionJobs, activeRunningJob, orders,
    newJobItemName, newJobMaterialId, newJobLaserPower, newJobLaserSpeed, newJobEstTime, newJobOrderId,
    showRemnantRegister, jobRemWidth, jobRemHeight, jobRemLocation,
    setNewMachineName, setNewMachineHours, setShowAddMachine, setProductionJobs, setActiveRunningJob,
    setLiveLogLines, setNewJobItemName, setNewJobMaterialId, setNewJobLaserPower, setNewJobLaserSpeed,
    setNewJobEstTime, setNewJobOrderId, setShowAddJob, setShowRemnantRegister, setJobRemWidth,
    setJobRemHeight, setJobRemLocation,
    fetchMachines, fetchProductionJobs, fetchOrders, fetchLogs, refreshInventoryData, addTerminalLog,
  });
  const {
    handleAdjustStockSubmit, handleCreateRemnant, handleConsumeRemnant, handleWasteRemnant,
    handleCreateSupplyOrder, handleCreateDirectSupplyOrder, handleDuplicateSupplyOrder,
    handleUpdateSupplyOrderStatus, handleFindSuitableRemnantSubmit, handleQuickSupplyRequest,
  } = useSupplyActions({
    suppliers, activeView, setActiveView, setActiveProductSubTab, setSelectedDashboardSupplierId,
    showAdjustStock, adjustQty, adjustType, adjustReason, currentUser,
    remMatId, remWidth, remHeight, remQty, remLocation,
    selectedDashboardSupplierId, newSupplyMaterialId, newSupplyQty, newSupplyPrice, newSupplyExpectedDate, newSupplyNotes,
    findSuitableMatId, findSuitableW, findSuitableH,
    setShowAdjustStock, setAdjustQty, setAdjustReason,
    setShowAddRemnant, setRemMatId, setRemWidth, setRemHeight, setRemQty, setRemLocation,
    setIsSubmittingSupplyOrder, setNewSupplyMaterialId, setNewSupplyQty, setNewSupplyPrice, setNewSupplyExpectedDate, setNewSupplyNotes,
    setSuitableRemnantResult,
    fetchSupplyOrders, refreshInventoryData, addTerminalLog,
  });
  const {
    handleSelectCalcMaterial, handleSelectCalcMachine, handleRunFastCalculator,
    handleRunFastParser, handleSendChatMessage,
  } = useAiToolsActions({
    materials, machines, orders, customers,
    calcMatId, calcMachineId, calcThicknessMm, calcWidthCm, calcLengthCm, calcCutLengthCm,
    calcEngraveAreaCm2, calcQuantity, calcLaserPowerWatts, calcTubeCostUSD, calcTubeLifespanHours,
    calcElectricityRate, calcOperatorRate, calcAutoWaste, calcWasteOverridePercent,
    calcTargetProfitMargin, calcWorkType, calcSetupFeeUSD,
    parserInputText, chatInput, chatMessages, fastResponseMode, exchangeRate,
    setCalcMatId, setCalcThicknessMm, setCalcMachineId, setCalcLaserPowerWatts, setCalcTubeCostUSD,
    setIsCalculatingFast, setCalcResult, setIsParsingFast, setParserResult, setLastResponseLatencyMs,
    setChatInput, setChatMessages, setIsSendingChatMessage, addTerminalLog,
  });


  const {
    handleOpenSmartSupplyModal: smartHandleOpen,
    handleExecuteSmartSupplyOrders: smartHandleExecute,
  } = useSmartSupplyActions({
    materials, suppliers, smartSupplyItems, currentUser, setSmartSupplyItems, setShowSmartSupplyModal,
    setIsSubmittingSmartSupply, fetchSupplyOrders, addTerminalLog,
  });

  const {
    handleUpdateOrderStatus: orderHandleStatus,
    handleRunAutoArchive: orderHandleAutoArchive,
    handleArchiveOrder: orderHandleArchive,
    handleRestoreOrder: orderHandleRestore,
    handleUpdateItemProgress,
    handleEditOrderSubmit,
    handleAssignOrderWorkers,
    handleRateOrder,
  } = useOrderActions({
    orders, currentUser, fetchOrders, fetchLogs, setDeliveryBlockedOrder, addTerminalLog, archiveDaysThreshold,
    setOrders, selectedOrder, setSelectedOrder, progressModalOrder, setProgressModalOrder,
    editingOrder, setEditingOrder, editOrderItems,
  });

  const { handleLogout } = useLogoutAction({ setSessionActive, setCurrentUser, addTerminalLog });


  // Running job live progress update simulation interval
  useEffect(() => {
    if (!activeRunningJob) return;

    let progressLocal = activeRunningJob.progress;
    let elapsed = activeRunningJob.elapsedTimeSec;

    const interval = setInterval(() => {
      elapsed += 1;
      // Calculate new progress increment
      const increment = Math.max(3, Math.floor(100 / ((activeRunningJob.estTimeSec || 45) / 1.5)));
      progressLocal = Math.min(100, progressLocal + increment);

      // Generate simulated CNC Gcode travel coordinates
      const targetX = Math.round(Math.random() * 180 + 10);
      const targetY = Math.round(Math.random() * 180 + 10);
      setLaserX(targetX);
      setLaserY(targetY);

      // Add a simulated code line
      const commands = [
        `G01 X${targetX}.2 Y${targetY}.4 F${(activeRunningJob.laserSpeed || 30) * 60} S${(activeRunningJob.laserPower || 80) * 10}`,
        `G02 X${targetX + 5} Y${targetY - 5} R10`,
        `G00 Z4.20`,
        `M106 P1 (Air Assist active)`
      ];
      const randomCommand = commands[Math.floor(Math.random() * commands.length)];
      setLiveLogLines(prev => [
        ...prev.slice(-12), // keep last 12 lines
        `[${new Date().toLocaleTimeString()}] CUT: ${randomCommand}`
      ]);

      // Update in local state for UI responsiveness
      setProductionJobs(prev => prev.map(job => {
        if (job.id === activeRunningJob.id) {
          return { ...job, progress: progressLocal, elapsedTimeSec: elapsed, status: progressLocal === 100 ? 'completed' : 'running' };
        }
        return job;
      }));

      // Persist progress to backend
      fetch(`/api/production/jobs/${activeRunningJob.id}/progress`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ progress: progressLocal, elapsedTimeSec: elapsed })
      }).catch(err => console.error(err));

      if (progressLocal >= 100) {
        clearInterval(interval);
        setActiveRunningJob(null);
        addTerminalLog("SYSTEM", `اكتملت مهمة القص بالليزر ${activeRunningJob.jobNo}! يرجى فحص جودة القطع وتسجيل أي بقايا.`);
        
        // Open remnant prompt modal
        setShowRemnantRegister(activeRunningJob);
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [activeRunningJob]);


  // Edit Order Draft Items helpers
  const appendEditOrderDraftItem = () => {
    setEditOrderItems(prev => [...prev, { name: "", qty: 1, price: 10.0, notes: "" }]);
  };

  const removeEditOrderDraftItem = (index: number) => {
    setEditOrderItems(prev => prev.filter((_, idx) => idx !== index));
  };

  const updateEditOrderDraftItem = (index: number, key: 'name' | 'qty' | 'price' | 'notes', val: any) => {
    setEditOrderItems(prev => prev.map((item, idx) => {
      if (idx === index) {
        return { ...item, [key]: val };
      }
      return item;
    }));
  };

  const { handleAddCustomer, handleDeleteCustomer, handleOpenEditCustomer, handleSaveEditCustomer, handleExportCustomersCSV } = useCustomerActions({
    customers,
    orders,
    custName,
    custPhone,
    custCompany,
    custAddress,
    custNotes,
    custCategory,
    editingCustomer,
    editCustName,
    editCustPhone,
    editCustWhatsapp,
    editCustEmail,
    editCustCompany,
    editCustAddress,
    editCustNotes,
    editCustCategory,
    setCustName,
    setCustPhone,
    setCustCompany,
    setCustAddress,
    setCustNotes,
    setCustCategory,
    setShowAddCustomer,
    setEditingCustomer,
    setEditCustName,
    setEditCustPhone,
    setEditCustWhatsapp,
    setEditCustEmail,
    setEditCustCompany,
    setEditCustAddress,
    setEditCustNotes,
    setEditCustCategory,
    fetchCustomers,
    addTerminalLog,
  });
  const { handleRecordPaymentSubmit, handleDeletePayment, handleSettleRemainingAndDeliver } = useAccountingActions({
    selectedOrder,
    newPaymentAmount,
    newPaymentSYPAmount,
    paymentInputCurrency,
    newPaymentNotes,
    selectedPaymentMethod,
    currentUserId: currentUser?.id,
    setNewPaymentAmount,
    setNewPaymentSYPAmount,
    setNewPaymentNotes,
    setSelectedOrder,
    setIsProcessingQuickFullPay,
    setDeliveryBlockedOrder,
    fetchOrders,
    fetchLogs,
    addTerminalLog,
  });
  const { handleCompileOrderGCode, handleCompileGCode } = useGCodeActions({
    selectedOrder, gcodePrompt, gcodeMaterial, gcodeSpeed, gcodePower,
    setIsCompilingGCode, setGcodeResult, setIsCompilingOrderGcode, setOrderGcodeResult, addTerminalLog
  });

  const selectedFileObj = virtualFiles.find(f => f.id === selectedFileId);

  // Unauthenticated login screen
  if (!currentUser) {
    const renderCutProgressInteractiveTable = (targetOrder: Order) => (
    <CutProgressInteractiveTable
      targetOrder={targetOrder}
      productionJobs={productionJobs}
      onUpdateItemProgress={handleUpdateItemProgress}
      showAddCutItemForm={showAddCutItemForm}
      setShowAddCutItemForm={setShowAddCutItemForm}
      newCutItemName={newCutItemName}
      setNewCutItemName={setNewCutItemName}
      newCutItemQty={newCutItemQty}
      setNewCutItemQty={setNewCutItemQty}
      newCutItemMat={newCutItemMat}
      setNewCutItemMat={setNewCutItemMat}
    />
  );

  return (
      <LoginScreen
        theme={theme}
        setTheme={setTheme}
        companySettings={companySettings}
        exchangeRate={exchangeRate}
        isRegisterMode={isRegisterMode}
        setIsRegisterMode={setIsRegisterMode}
        authError={authError}
        authEmail={authEmail}
        setAuthEmail={setAuthEmail}
        authPassword={authPassword}
        setAuthPassword={setAuthPassword}
        authFullName={authFullName}
        setAuthFullName={setAuthFullName}
        authRole={authRole}
        setAuthRole={setAuthRole}
        rememberMe={rememberMe}
        setRememberMe={setRememberMe}
        isAuthLoading={isAuthLoading}
        activePreset={activePreset}
        setAuthPreset={setAuthPreset}
        setAuthError={setAuthError}
        handleLogin={handleLogin}
        handleRegister={handleRegister}
      />
    );
  }

  const pageVariants = {
    initial: { opacity: 0, y: 10, filter: "blur(2px)" },
    animate: { opacity: 1, y: 0, filter: "blur(0px)" },
    exit: { opacity: 0, y: -10, filter: "blur(2px)" }
  } as const;

  const pageTransition = {
    duration: 0.22,
    ease: "easeOut"
  } as const;

  // --- Dynamic Pricing Calculator Variables for Order Editing ---
  const editOrderSubtotal = editOrderItems.reduce((sum, item) => sum + ((Number(item.qty) || 1) * (Number(item.price) || 0)), 0);
  const editOrderTaxPercentVal = editingOrder ? (editingOrder.taxPercent !== undefined ? Number(editingOrder.taxPercent) : 0) : 0;
  const editOrderTaxAmount = editOrderSubtotal * (editOrderTaxPercentVal / 100);
  const editOrderDiscountAmountVal = editingOrder ? (editingOrder.discount !== undefined ? Number(editingOrder.discount) : 0) : 0;
  const editOrderTotalPrice = Math.max(0, editOrderSubtotal + editOrderTaxAmount - editOrderDiscountAmountVal);
  const editOrderPaidVal = editingOrder ? (Number(editingOrder.paidAmount) || 0) : 0;
  const editOrderRemaining = Math.max(0, editOrderTotalPrice - editOrderPaidVal);

  // Authenticated Workspace Header & Framework
  return (
    <div id="axis-system" dir="rtl" className={`flex flex-col h-screen w-full bg-[#09090b] text-zinc-300 font-sans overflow-hidden ${theme === "light" ? "theme-light" : ""}`}>
      <AutoLogoutTimer sessionActive={sessionActive} onLogout={() => handleLogout(true)} />
      {firstRunPasswordCurrent && (
        <FirstRunPasswordModal
          initialCurrentPassword={firstRunPasswordCurrent}
          onSubmit={handleFirstRunPasswordChange}
          error={authError}
          loading={isFirstRunPasswordLoading}
        />
      )}
      {/* Upper Navigation Rail */}
      <header className="h-12 border-b border-zinc-800 flex items-center justify-between px-4 bg-zinc-950 shrink-0 select-none">
        
        {/* RIGHT SIDE: Brand Logo / Title (RTL: right side is start) */}
        <div className="flex items-center gap-3">
          <AxisLabLogo size={28} src={companySettings?.logo} className="transform hover:rotate-12 transition-transform duration-300" />
          <h1 className="font-semibold text-xs tracking-tight text-zinc-100 flex items-center gap-1.5">
            <span className="text-[#c59257] font-bold">AXIS</span><span>LAB OS</span> 
            <span className="text-zinc-500 font-mono text-[10px] hidden sm:inline">/ v0.15.0 (Interactive)</span>
          </h1>
        </div>

        {/* LEFT SIDE: Icons & Quick Action Menus (RTL: left side is end) */}
        <div className="flex items-center gap-3 relative">
          
          {/* Quick System Connection Indicator */}
          <div className="hidden md:flex items-center gap-1.5 bg-zinc-900/50 border border-zinc-850 px-2.5 py-1 rounded-lg text-[10px] font-mono" title="الحالة التشغيلية لخوادم ليزر CO2">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
            </span>
            <span className="text-emerald-400 font-bold">جميع ماكينات الليزر متصلة</span>
          </div>

          <div className="h-4 w-[1px] bg-zinc-850 hidden md:block"></div>

          {/* Global Search command trigger button */}
          <button
            onClick={() => setIsSearchPaletteOpen(true)}
            className="flex items-center gap-2 bg-zinc-900 hover:bg-zinc-850 text-zinc-400 hover:text-zinc-200 border border-zinc-800 px-3 py-1.5 rounded-lg text-xs cursor-pointer transition-all shrink-0"
            title="البحث الشامل بالكامل (Ctrl+K)"
          >
            <span className="text-[10px] font-mono opacity-60">Ctrl + K</span>
            <Search className="w-3.5 h-3.5 text-[#c59257]" />
          </button>

          {/* Context-Sensitive Quick Help Button */}
          <button
            onClick={() => setShowHelpModal(true)}
            className="flex items-center gap-1.5 bg-zinc-900 hover:bg-zinc-850 text-zinc-450 hover:text-zinc-100 border border-zinc-800 px-3 py-1.5 rounded-lg text-xs cursor-pointer transition-all shrink-0 font-bold"
            title="مساعدة سريعة وإرشادات الشاشة الحالية"
          >
            <span className="hidden md:inline">مساعدة</span>
            <HelpCircle className="w-3.5 h-3.5 text-[#c59257]" />
          </button>

          {currentUser?.role === "admin" && (
            <button
              onClick={() => setShowEmployeeStats(true)}
              className="flex items-center gap-1.5 bg-zinc-900 hover:bg-zinc-850 text-zinc-450 hover:text-zinc-100 border border-zinc-800 px-3 py-1.5 rounded-lg text-xs cursor-pointer transition-all shrink-0 font-bold"
              title="إحصائيات أداء الموظفين (خاص بالمدير)"
            >
              <span className="hidden md:inline">أداء الموظفين</span>
              <Sparkles className="w-3.5 h-3.5 text-amber-400" />
            </button>
          )}

          {/* Interactive Notifications Popover */}
          <div className="relative">
            <button
              onClick={() => {
                setIsNotificationsOpen(!isNotificationsOpen);
                setIsProfileOpen(false);
              }}
              className="w-8 h-8 rounded-lg bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 flex items-center justify-center transition-all text-zinc-400 hover:text-zinc-200 cursor-pointer relative"
              title="الإشعارات والتنبيهات التشغيلية"
            >
              <Bell className="w-4 h-4" />
              {notifications.some(n => !n.isRead) && (
                <span className="absolute top-1 right-1 w-2 h-2 bg-rose-500 border border-zinc-950 rounded-full animate-pulse"></span>
              )}
            </button>

            {/* Notifications Dropdown Container */}
            <AnimatePresence>
              {isNotificationsOpen && (
                <motion.div
                  initial={{ opacity: 0, y: 10, scale: 0.95 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: 10, scale: 0.95 }}
                  className="absolute left-0 mt-2 w-80 bg-zinc-950 border border-zinc-800 rounded-xl shadow-2xl z-50 p-3 space-y-2 text-right"
                >
                  <div className="flex items-center justify-between pb-2 border-b border-zinc-900">
                    <button
                      onClick={handleMarkAllAsRead}
                      className="text-[9px] text-[#c59257] hover:underline cursor-pointer"
                    >
                      تحديد الكل كمقروء
                    </button>
                    <span className="text-xs font-bold text-zinc-200 font-sans flex items-center gap-1.5">
                      <span>مركز التنبيهات والأمان</span>
                      <Bell className="w-3.5 h-3.5 text-[#c59257]" />
                    </span>
                  </div>

                  <div className="max-h-60 overflow-y-auto space-y-1.5 py-1">
                    {notifications.length === 0 ? (
                      <div className="text-center py-6 text-[10px] text-zinc-500 font-sans">
                        لا توجد إشعارات تشغيلية حالياً.
                      </div>
                    ) : (
                      notifications.map(n => (
                        <div
                          key={n.id}
                          onClick={() => handleMarkAsRead(n.id)}
                          className={`p-2 rounded-lg text-[10.5px] border transition-all cursor-pointer relative group ${
                            n.isRead 
                              ? "bg-zinc-900/10 border-transparent text-zinc-400" 
                              : "bg-zinc-900/60 border-zinc-850 text-zinc-100 hover:border-zinc-800"
                          }`}
                        >
                          <div className="flex items-start justify-between gap-4">
                            {/* Delete Button */}
                            <button
                              onClick={(e) => handleDeleteNotification(n.id, e)}
                              className="text-zinc-600 hover:text-rose-400 p-0.5 rounded opacity-0 group-hover:opacity-100 transition-opacity absolute left-1 top-1"
                              title="حذف"
                            >
                              ✕
                            </button>
                            <span className="text-[8px] font-mono text-zinc-500 shrink-0 self-end">
                              {new Date(n.createdAt).toLocaleTimeString("ar-EG", { hour: '2-digit', minute: '2-digit' })}
                            </span>
                            <div className="flex gap-1.5 items-start justify-end flex-1 pl-4">
                              <div className="flex flex-col text-right">
                                <span className={`font-sans leading-snug font-bold ${
                                  n.priority === "high" || n.priority === "critical" ? "text-rose-400" : ""
                                }`}>
                                  {n.title}
                                </span>
                                <p className="text-[9.5px] text-zinc-400 mt-0.5 leading-relaxed">
                                  {n.message}
                                </p>
                              </div>
                              <span className={`w-1.5 h-1.5 rounded-full mt-1.5 shrink-0 ${
                                n.type === "inventory" 
                                  ? "bg-amber-500" 
                                  : n.type === "financial" 
                                    ? "bg-emerald-500" 
                                    : n.type === "production" 
                                      ? "bg-blue-500" 
                                      : "bg-purple-500"
                              }`}></span>
                            </div>
                          </div>
                        </div>
                      ))
                    )}
                  </div>

                  {notifications.length > 0 && (
                    <div className="pt-2 border-t border-zinc-900 flex justify-between items-center text-[8.5px] text-zinc-500">
                      <span>
                        تحديث تلقائي مستمر
                      </span>
                      <span className="font-mono">
                        عرض آخر {notifications.length} أحداث نشطة
                      </span>
                    </div>
                  )}
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* 🛒 Quick New Order Shortcut Button in Header Bar */}
          <button
            onClick={() => {
              setSelectedCustomerIdForOrder("");
              setShowAddOrder(true);
            }}
            className="hidden sm:flex items-center gap-1.5 px-3 py-1 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white rounded-lg text-xs font-bold transition-all shadow-md hover:shadow-emerald-950/50 cursor-pointer border border-emerald-400/30"
            title="فتح نموذج إنشاء طلب جديد للعميل مباشرة دون الانتقال لقائمة الطلبات"
          >
            <PlusCircle className="w-3.5 h-3.5 text-white" />
            <span>طلب جديد لعميل ⚡</span>
          </button>

          {/* 📱 Quick Social Contact Toolbar Buttons */}
          <div className="hidden lg:flex items-center gap-1 bg-zinc-900/80 border border-zinc-800 px-2 py-0.5 rounded-lg text-[10px] font-mono shadow-sm">
            <span className="text-[9px] text-zinc-500 font-bold ml-1">تواصل الورشة:</span>
            
            {/* WhatsApp */}
            <a
              href={`https://wa.me/${(companySettings?.whatsapp || companySettings?.phone || "").replace(/[^0-9+]/g, '')}`}
              target="_blank"
              rel="noopener noreferrer"
              className="p-1 hover:bg-emerald-500/20 text-emerald-400 rounded transition-colors"
              title={`واتساب المبيعات: ${companySettings?.whatsapp || companySettings?.phone || "غير محدد"}`}
            >
              <MessageCircle className="w-3.5 h-3.5" />
            </a>

            {/* Instagram */}
            <a
              href={companySettings?.instagram ? (companySettings.instagram.startsWith("http") ? companySettings.instagram : `https://instagram.com/${companySettings.instagram.replace('@', '')}`) : "https://instagram.com"}
              target="_blank"
              rel="noopener noreferrer"
              className="p-1 hover:bg-pink-500/20 text-pink-400 rounded transition-colors"
              title={`إنستغرام الورشة: ${companySettings?.instagram || "غير محدد"}`}
            >
              <Instagram className="w-3.5 h-3.5" />
            </a>

            {/* Email */}
            <a
              href={`mailto:${companySettings?.email || "contact@axislab.com"}`}
              className="p-1 hover:bg-blue-500/20 text-blue-400 rounded transition-colors"
              title={`البريد الرسمي: ${companySettings?.email || "contact@axislab.com"}`}
            >
              <Mail className="w-3.5 h-3.5" />
            </a>
          </div>

          {/* Quick Rate display & Interactive Currency Converter Launcher */}
          <button
            onClick={() => setIsCurrencyConverterOpen(true)}
            className="flex items-center gap-1.5 bg-zinc-900/60 hover:bg-zinc-850 border border-zinc-800 hover:border-[#c59257]/50 px-2.5 py-1 rounded-lg text-[10px] font-mono text-zinc-300 transition-all cursor-pointer shadow-sm group"
            title="انقر لفتح محول العملات المزدوج وسعر الصرف حسب السوق (USD ⇌ SYP)"
          >
            <Coins className="w-3.5 h-3.5 text-[#c59257] group-hover:scale-110 transition-transform" />
            <span className="hidden sm:inline text-zinc-400">1$ = </span>
            <span className="font-bold text-[#c59257]">{exchangeRate.toLocaleString()} ل.س</span>
          </button>

          {/* 💡 Help & Shortcuts Center Button */}
          <button
            onClick={() => setIsHelpGuideOpen(true)}
            className="w-8 h-8 rounded-lg bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 flex items-center justify-center transition-all text-zinc-400 hover:text-zinc-200 cursor-pointer"
            title="دليل التشغيل السريع واختصارات النظام (Alt + H)"
          >
            <HelpCircle className="w-4 h-4 text-[#c59257]" />
          </button>

          {/* Adaptive Theme Toggle */}
          <button
            onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
            className="w-8 h-8 rounded-lg bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 flex items-center justify-center transition-all text-zinc-400 hover:text-zinc-200 cursor-pointer"
            title={theme === "dark" ? "التحويل للوضع المضيء" : "التحويل للوضع المظلم"}
          >
            {theme === "dark" ? (
              <Sun className="w-4 h-4 text-amber-400 animate-pulse" />
            ) : (
              <Moon className="w-4 h-4 text-indigo-500" />
            )}
          </button>

          <div className="h-4 w-[1px] bg-zinc-850"></div>

          {/* Connected User Badge / Dropdown */}
          <div className="relative">
            <button
              onClick={() => {
                setIsProfileOpen(!isProfileOpen);
                setIsNotificationsOpen(false);
              }}
              className="flex items-center gap-2 hover:bg-zinc-900/60 p-1 rounded-lg border border-transparent hover:border-zinc-850 transition-all cursor-pointer text-right"
              title="خيارات الحساب والجلسة"
            >
              <div className="hidden sm:block">
                <span className="text-[11px] block font-semibold text-zinc-100 leading-none">{currentUser.fullName}</span>
                <span className="text-[8.5px] block font-mono text-indigo-400 uppercase tracking-wider mt-0.5">{currentUser.role}</span>
              </div>
              <div className="w-7 h-7 rounded-full bg-[#c59257]/10 border border-[#c59257]/30 text-xs text-[#c59257] hover:text-[#ffd166] font-bold flex items-center justify-center transition-colors">
                {currentUser.fullName ? currentUser.fullName.split(" ").map(w => w[0]).join("") : "MK"}
              </div>
            </button>

            {/* Profile Dropdown Menu */}
            <AnimatePresence>
              {isProfileOpen && (
                <motion.div
                  initial={{ opacity: 0, y: 10, scale: 0.95 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: 10, scale: 0.95 }}
                  className="absolute left-0 mt-2 w-48 bg-zinc-950 border border-zinc-800 rounded-xl shadow-2xl z-50 p-2 space-y-1 text-right"
                >
                  <div className="p-2 border-b border-zinc-900">
                    <span className="text-[10px] text-zinc-500 font-sans block">تسجيل الدخول الحالي:</span>
                    <span className="text-xs font-bold text-zinc-100 block mt-0.5">{currentUser.email}</span>
                  </div>

                  <button
                    onClick={() => {
                      setActiveView("settings");
                      setIsProfileOpen(false);
                    }}
                    className="w-full text-right p-2 rounded-lg text-xs hover:bg-zinc-900/60 text-zinc-300 hover:text-white transition-all cursor-pointer flex items-center justify-start gap-2"
                  >
                    <Settings className="w-3.5 h-3.5 text-zinc-500" />
                    <span>إعدادات النظام والأمان</span>
                  </button>

                  <button
                    onClick={() => {
                      addTerminalLog("SYSTEM", `تم تصفية البيانات والتحقق من سلامة الجداول.`);
                      setIsProfileOpen(false);
                    }}
                    className="w-full text-right p-2 rounded-lg text-xs hover:bg-zinc-900/60 text-zinc-300 hover:text-white transition-all cursor-pointer flex items-center justify-start gap-2"
                  >
                    <Cpu className="w-3.5 h-3.5 text-emerald-500" />
                    <span>التحقق من الاتصال بالماكينة</span>
                  </button>

                  <div className="h-[1px] bg-zinc-900 my-1"></div>

                  <button
                    onClick={() => {
                      handleLogout(false);
                    }}
                    className="w-full text-right p-2 rounded-lg text-xs hover:bg-zinc-900/60 text-rose-400 hover:bg-rose-950/20 hover:text-rose-300 transition-all cursor-pointer flex items-center justify-start gap-2"
                  >
                    <LogOut className="w-3.5 h-3.5" />
                    <span>تسجيل الخروج الآمن</span>
                  </button>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

        </div>
      </header>

      {/* Main Framework split layout */}
      <main className="flex flex-1 overflow-hidden">
        {/* RIGHT SIDEBAR (collapsible) */}
        <motion.aside 
          initial={false}
          animate={{ width: isSidebarExpanded ? 256 : 64 }}
          transition={{ type: "spring", stiffness: 300, damping: 28 }}
          className="border-l border-zinc-800 bg-zinc-950 flex flex-col justify-between shrink-0 relative select-none z-10 overflow-hidden"
        >
          {/* Top section: view lists */}
          <div className="flex flex-col p-2 space-y-1 overflow-y-auto overflow-x-hidden flex-1">
            {/* Collapse/Expand mini toggle for advanced feel */}
            <div className="px-2 py-1.5 flex items-center justify-between mb-2">
              <AnimatePresence mode="wait" initial={false}>
                {isSidebarExpanded ? (
                  <motion.span 
                    key="title-expanded"
                    initial={{ opacity: 0, width: 0 }}
                    animate={{ opacity: 1, width: "auto" }}
                    exit={{ opacity: 0, width: 0 }}
                    transition={{ duration: 0.15 }}
                    className="text-[10px] text-zinc-500 font-mono tracking-wider font-bold whitespace-nowrap overflow-hidden"
                  >
                    القائمة التشغيلية
                  </motion.span>
                ) : (
                  <motion.span 
                    key="title-collapsed"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 0.4 }}
                    exit={{ opacity: 0 }}
                    className="text-[9px] text-zinc-500 font-mono font-bold"
                  >
                    AXIS
                  </motion.span>
                )}
              </AnimatePresence>
              <button 
                onClick={toggleSidebar}
                className="p-1 rounded bg-zinc-900/60 hover:bg-zinc-800 border border-zinc-850/80 text-zinc-400 hover:text-zinc-200 transition-all cursor-pointer shrink-0"
                title={isSidebarExpanded ? "طي القائمة" : "توسيع القائمة"}
              >
                <ChevronLeft className={`w-3.5 h-3.5 transform transition-transform duration-300 ${isSidebarExpanded ? "rotate-0" : "rotate-180"}`} />
              </button>
            </div>

            {/* Nav Items */}
            {(() => {
              const role = currentUser?.role || "admin";
              let navItems = [];
              
              if (role === "admin") {
                navItems = [
                  { id: "dashboard", label: "الرئيسية", icon: <Cpu className="w-4 h-4 text-indigo-400" />, desc: "لوحة تحكم الورشة والمهام" },
                  { id: "database", label: "الطلبات والعملاء", icon: <Database className="w-4 h-4 text-[#c59257]" />, desc: "متابعة الطلبات والعملاء" },
                  { id: "production", label: "الإنتاج والتشغيل", icon: <Activity className="w-4 h-4 text-indigo-400" />, desc: "الماكينات وجدولة مهام القص" },
                  { id: "inventory", label: "المخزون والمواد", icon: <Layers className="w-4 h-4 text-emerald-400" />, desc: "مراقبة المواد الأولية والبقايا" },
                  { id: "products_catalog", label: "مكتبة المنتجات", icon: <PlusCircle className="w-4 h-4 text-amber-500" />, desc: "إدارة المنتجات والمكونات" },
                  { id: "accounting", label: "الحسابات والمالية", icon: <Wallet className="w-4 h-4 text-[#c59257]" />, desc: "الفواتير، المصاريف والعمليات" },
                  { id: "reports", label: "التقارير والكشوفات", icon: <BarChart2 className="w-4 h-4 text-indigo-400" />, desc: "تحليل الأداء المالي والإنتاجي" },
                  { id: "ai_hub", label: "مساعد AXIS AI", icon: <Brain className="w-4 h-4 text-indigo-400 animate-pulse" />, desc: "الذكاء الاصطناعي للورشة" },
                  { id: "gcode", label: "مترجم G-Code", icon: <Scissors className="w-4 h-4 text-indigo-400" />, desc: "معالجة مسارات خطوط الليزر" },
                  { id: "settings", label: "الإعدادات والمستخدمين", icon: <Settings className="w-4 h-4 text-[#c59257]" />, desc: "صيانة وضبط صلاحيات النظام" },
                  { id: "help", label: "دليل المساعدة", icon: <BookOpen className="w-4 h-4 text-[#c59257]" />, desc: "شرح المهام ومحاكي الليزر" }
                ];
              } else if (role === "employee") {
                navItems = [
                  { id: "dashboard", label: "الرئيسية", icon: <Cpu className="w-4 h-4 text-indigo-400" />, desc: "رؤية المهام المكلف بها" },
                  { id: "database", label: "الطلبات والعملاء", icon: <Database className="w-4 h-4 text-[#c59257]" />, desc: "إنشاء وتعديل الطلبات والعملاء" },
                  { id: "production", label: "الإنتاج والتشغيل", icon: <Activity className="w-4 h-4 text-indigo-400" />, desc: "تشغيل المهام وتحديث الحالات" },
                  { id: "inventory", label: "التحقق من المخزون", icon: <Layers className="w-4 h-4 text-emerald-400" />, desc: "التحقق من توفر المواد والخامات" },
                  { id: "products_catalog", label: "كتالوج المنتجات", icon: <PlusCircle className="w-4 h-4 text-amber-500" />, desc: "استخدام المنتجات في الطلبات" },
                  { id: "reports", label: "التقارير والإنتاج", icon: <BarChart2 className="w-4 h-4 text-indigo-400" />, desc: "تقارير إنتاجية مبسطة" },
                  { id: "ai_hub", label: "مساعد AXIS AI", icon: <Brain className="w-4 h-4 text-indigo-400 animate-pulse" />, desc: "الذكاء الاصطناعي للورشة" },
                  { id: "gcode", label: "مترجم G-Code", icon: <Scissors className="w-4 h-4 text-indigo-400" />, desc: "تجهيز خطوط الحفر والقص" },
                  { id: "help", label: "دليل المساعدة", icon: <BookOpen className="w-4 h-4 text-[#c59257]" />, desc: "شرح المهام ومحاكي الليزر" }
                ];
              } else {
                // accountant
                navItems = [
                  { id: "dashboard", label: "الرئيسية", icon: <Cpu className="w-4 h-4 text-indigo-400" />, desc: "رؤية الذمم والإيرادات اليومية" },
                  { id: "accounting", label: "المحاسبة والمالية", icon: <Wallet className="w-4 h-4 text-[#c59257]" />, desc: "الوصول المالي الشامل" },
                  { id: "accounting_invoices", label: "إدارة الفواتير", icon: <FileText className="w-4 h-4 text-sky-400" />, desc: "إنشاء وتعديل فواتير العملاء" },
                  { id: "accounting_payments", label: "تسجيل الدفعات", icon: <Coins className="w-4 h-4 text-emerald-400" />, desc: "متابعة أرصدة وسندات العملاء" },
                  { id: "accounting_expenses", label: "تسجيل المصروفات", icon: <ArrowUp className="w-4 h-4 text-rose-400" />, desc: "رواتب ومصاريف الورشة العامة" },
                  { id: "database_customers", label: "بيانات العملاء", icon: <Users className="w-4 h-4 text-amber-500" />, desc: "الوصول لبيانات وحسابات العملاء" },
                  { id: "reports", label: "التقارير المالية", icon: <BarChart2 className="w-4 h-4 text-indigo-400" />, desc: "الأرباح، المبيعات وكشوفات الحساب" },
                  { id: "database_orders", label: "مراجع الطلبات والذمم", icon: <Database className="w-4 h-4 text-teal-400" />, desc: "التحقق من تفاصيل الطلبات والفواتير" },
                  { id: "help", label: "دليل المساعدة", icon: <BookOpen className="w-4 h-4 text-[#c59257]" />, desc: "شرح المهام ومحاكي الليزر" }
                ];
              }

              return navItems;
            })().map((item) => {
              const role = currentUser?.role || "admin";
              const isActive = (() => {
                if (item.id === "products_catalog") {
                  return activeView === "products" && activeProductSubTab === "products";
                }
                if (item.id === "inventory") {
                  return activeView === "products" && (activeProductSubTab === "materials" || activeProductSubTab === "remnants");
                }
                if (item.id === "accounting_invoices") {
                  return activeView === "accounting" && accountingTab === "invoices";
                }
                if (item.id === "accounting_payments") {
                  return activeView === "accounting" && accountingTab === "customers_balances";
                }
                if (item.id === "accounting_expenses") {
                  return activeView === "accounting" && accountingTab === "expenses";
                }
                if (item.id === "database_customers" || item.id === "database_orders") {
                  return activeView === "database";
                }
                return activeView === item.id;
              })();
              const isEmployee = role === "employee";
              const isSpecialItem = isEmployee && (item.id === "production" || item.id === "gcode");

              let displayIcon = item.icon;
              let displayLabel = item.label;
              let displayDesc = item.desc;

              if (isSpecialItem) {
                if (item.id === "production") {
                  displayIcon = <Activity className="w-5.5 h-5.5 text-amber-400 drop-shadow-[0_0_8px_rgba(245,158,11,0.65)] animate-pulse" />;
                  displayLabel = "الإنتاج والتشغيل اليدوي";
                  displayDesc = "التحكم في ماكينات الورشة وطلبات القص";
                } else if (item.id === "gcode") {
                  displayIcon = <Scissors className="w-5.5 h-5.5 text-indigo-400 drop-shadow-[0_0_8px_rgba(129,140,248,0.65)]" />;
                  displayLabel = "مترجم G-Code الذكي";
                  displayDesc = "مسارات الليزر وتجهيز خطوط الحفر والقص";
                }
              }

              return (
                <button
                  key={item.id}
                  onClick={() => {
                    if (item.id === "products_catalog") {
                      setActiveView("products");
                      setActiveProductSubTab("products");
                    } else if (item.id === "inventory") {
                      setActiveView("products");
                      setActiveProductSubTab("materials");
                    } else if (item.id === "accounting_invoices") {
                      setActiveView("accounting");
                      setAccountingTab("invoices");
                    } else if (item.id === "accounting_payments") {
                      setActiveView("accounting");
                      setAccountingTab("customers_balances");
                    } else if (item.id === "accounting_expenses") {
                      setActiveView("accounting");
                      setAccountingTab("expenses");
                    } else if (item.id === "database_customers" || item.id === "database_orders") {
                      setActiveView("database");
                    } else if (item.id === "accounting") {
                      setActiveView("accounting");
                      setAccountingTab("dashboard");
                    } else {
                      setActiveView(item.id);
                    }
                    setIsNotificationsOpen(false);
                    setIsProfileOpen(false);
                  }}
                  className={`w-full text-right rounded-lg transition-all flex items-center gap-3 relative cursor-pointer group ${
                    isSpecialItem
                      ? "p-3.5 my-1.5 border border-[#c59257]/20 bg-zinc-900/60 shadow-md"
                      : "p-2.5"
                  } ${
                    isActive 
                      ? "bg-[#c59257]/10 text-white border-r-4 border-[#c59257]" 
                      : "text-zinc-400 hover:text-zinc-100 hover:bg-zinc-900/40 border-r-4 border-transparent"
                  }`}
                  title={!isSidebarExpanded ? displayLabel : ""}
                >
                  <div className={`shrink-0 transition-transform group-hover:scale-110 flex items-center justify-center ${
                    isSpecialItem
                      ? "w-10 h-10 rounded-lg bg-zinc-950 border border-[#c59257]/30 shadow-inner"
                      : `p-1 rounded-md ${isActive ? "bg-[#c59257]/20" : "bg-zinc-900/30"}`
                  }`}>
                    {displayIcon}
                  </div>
                  <AnimatePresence initial={false}>
                    {isSidebarExpanded && (
                      <motion.div
                        initial={{ opacity: 0, width: 0, x: 15 }}
                        animate={{ opacity: 1, width: "auto", x: 0 }}
                        exit={{ opacity: 0, width: 0, x: 15 }}
                        transition={{ duration: 0.2 }}
                        className="flex flex-col text-right leading-none min-w-0 whitespace-nowrap overflow-hidden flex-1"
                      >
                        <span className={`tracking-tight ${isSpecialItem ? "text-[12.5px] font-black text-amber-400" : "text-[11.5px] font-bold"}`}>{displayLabel}</span>
                        <span className={`font-sans mt-0.5 truncate ${isSpecialItem ? "text-[9.5px] text-zinc-300 font-medium" : "text-[9px] text-zinc-500"}`}>{displayDesc}</span>
                      </motion.div>
                    )}
                  </AnimatePresence>
                  
                  {/* Subtle active glow */}
                  {isActive && (
                    <span className="absolute left-2 w-1.5 h-1.5 rounded-full bg-[#c59257] shadow-[0_0_8px_#c59257]"></span>
                  )}
                </button>
              );
            })}
          </div>

          {/* Bottom section: quick details/system stat or lock */}
          <div className="border-t border-zinc-900 bg-zinc-950/80">
            <AnimatePresence mode="wait" initial={false}>
              {isSidebarExpanded ? (
                <motion.div 
                  key="stats-expanded"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 10 }}
                  transition={{ duration: 0.15 }}
                  className="p-3 space-y-2 font-sans text-right"
                >
                  <div className="flex items-center justify-between text-[9px] text-zinc-500">
                    <span>المستخدم:</span>
                    <span className="font-mono text-[#c59257] font-bold">{currentUser.fullName}</span>
                  </div>
                  <div className="flex items-center justify-between text-[9px] text-zinc-500">
                    <span>الصلاحية:</span>
                    <span className="font-mono text-indigo-400 uppercase font-bold text-[8.5px] bg-indigo-950/60 px-1 rounded">{currentUser.role}</span>
                  </div>
                  <div className="flex items-center justify-between text-[9px] text-zinc-500">
                    <span>صرف الليرة:</span>
                    <span className="font-mono text-emerald-400 font-bold">{exchangeRate.toLocaleString()} ل.س</span>
                  </div>
                </motion.div>
              ) : (
                <motion.div 
                  key="stats-collapsed"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="p-3 text-center"
                >
                  <span className="w-2 h-2 rounded-full bg-emerald-500 inline-block animate-pulse shadow-[0_0_6px_#10b981]"></span>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </motion.aside>

        {/* VIEW CHANGER FRAME CONTAINER */}
        <section className="flex-1 flex flex-col bg-[#0c0c0e] overflow-hidden">
          
          <div className="flex-1 overflow-y-auto">
            <AnimatePresence mode="wait">
              {activeView === "dashboard" && (
                <DashboardPage
                  {...{ activeOrderFiltersCount, activeView, calculateOrderProgress, currentUser, remnants, productionJobs, theme, setActiveProductSubTab, setIsCurrencyConverterOpen, custAddress, custCategory, custCompany, custName, custNotes, custPhone, customerCategoryFilter, customers, exchangeRate, fastLocalDashboardTrends, fastLocalInventoryPredictions, fastLocalProductionScheduling, filteredOrders, getSevenDaysChartData, handleAddCustomer, handleExportCustomersCSV, handleOpenEditCustomer, handleUpdateOrderStatus: orderHandleStatus, laserMachines, laserUtilizationPercent, lowStockCount, orderFilterCustomer, orderFilterEndDate, orderFilterPriority, orderFilterSearch, orderFilterStartDate, orderFilterStatus, orders, pageTransition, pageVariants, pendingOrders, resetOrderFilters, runningLasersCount, setActiveView, setCustAddress, setCustCategory, setCustCompany, setCustName, setCustNotes, setCustPhone, setCustomerCategoryFilter, setDeleteConfirmTarget, setEditOrderItems, setEditingOrder, setOrderDetailsTab, setOrderFilterCustomer, setOrderFilterEndDate, setOrderFilterPriority, setOrderFilterSearch, setOrderFilterStartDate, setOrderFilterStatus, setOrderGcodeResult, setProgressModalOrder, setSelectedCustomerFiles, setSelectedCustomerIdForOrder, setSelectedOrder, setShowAddCustomer, setShowAddOrder, showAddCustomer, updateRate }}
                />
              )}              {activeView === "database" && (
                <DatabasePage
                  {...{ USERS: users, activeView, addTerminalLog, archiveDaysThreshold, calculateOrderProgress, currentUser, customers, databaseTab, exchangeRate, executeTerminalCommand, fetchCustomers, fetchLogs, fetchOrders, getOrderStatusBadge, productionJobs, handleArchiveOrder: orderHandleArchive, handleExportCustomersCSV, handleOpenEditCustomer, handleRestoreOrder: orderHandleRestore, handleRunAutoArchive: orderHandleAutoArchive, logs, orderTabFilter, orders, pageTransition, pageVariants, products, setArchiveDaysThreshold, setDatabaseTab, setOrderTabFilter, setSelectedCustomerIdForOrder, setShowAddOrder }}
                />
              )}              {(activeView === "products" || activeView === "gcode") && (
                <InventoryPage
                  {...{
                    pageVariants, pageTransition, activeView, currentUser, activeProductSubTab, setActiveProductSubTab, materials, setMaterials,
                    draggedMaterialId, setDraggedMaterialId, dragOverMaterialId, setDragOverMaterialId, materialCategories, remnants, setRemnants,
                    suppliers, setSuppliers, supplyOrders, setSupplyOrders, materialStats, setMaterialStats, supplyOrdersFilterStatus,
                    setSupplyOrdersFilterStatus, supplyOrdersSearch, setSupplyOrdersSearch, materialSortBy, setMaterialSortBy, materialQualityFilter,
                    setMaterialQualityFilter, showSmartSupplyModal, setShowSmartSupplyModal, smartSupplyItems, setSmartSupplyItems,
                    isSubmittingSmartSupply, setIsSubmittingSmartSupply, showAddMaterial, setShowAddMaterial, matName, setMatName, matCategory,
                    setMatCategory, matSubCategory, setMatSubCategory, matThickness, setMatThickness, matColor, setMatColor, matWidth, setMatWidth,
                    matHeight, setMatHeight, matUnit, setMatUnit, matPrice, setMatPrice, matMinStock, setMatMinStock, matSupplierId, setMatSupplierId,
                    matNotes, setMatNotes, matLocation, setMatLocation, matQualityStatus, setMatQualityStatus, editingMaterial, setEditingMaterial,
                    isAiClassifying, setIsAiClassifying, aiClassificationResult, setAiClassificationResult, showAdjustStock, setShowAdjustStock,
                    adjustQty, setAdjustQty, adjustType, setAdjustType, adjustReason, setAdjustReason, priceComparisonMaterial, setPriceComparisonMaterial,
                    isCurrencyConverterOpen, setIsCurrencyConverterOpen, selectedDashboardSupplierId, setSelectedDashboardSupplierId, newSupplyMaterialId,
                    setNewSupplyMaterialId, newSupplyQty, setNewSupplyQty, newSupplyPrice, setNewSupplyPrice, newSupplyExpectedDate, setNewSupplyExpectedDate,
                    newSupplyNotes, setNewSupplyNotes, isSubmittingSupplyOrder, setIsSubmittingSupplyOrder, showAddRemnant, setShowAddRemnant, remMatId,
                    setRemMatId, remWidth, setRemWidth, remHeight, setRemHeight, remQty, setRemQty, remLocation, setRemLocation, findSuitableMatId,
                    setFindSuitableMatId, findSuitableW, setFindSuitableW, findSuitableH, setFindSuitableH, suitableRemnantResult, setSuitableRemnantResult,
                    searchQuery, setSearchQuery, selectedProductFiles, setSelectedProductFiles, selectedMaterialFiles, setSelectedMaterialFiles,
                    deleteConfirmTarget, setDeleteConfirmTarget, showAddProduct, setShowAddProduct, editingProduct, setEditingProduct,
                    prodName, setProdName, prodCode, setProdCode, prodCategory, setProdCategory, prodPrice, setProdPrice,
                    prodDescription, setProdDescription, prodStock, setProdStock, products, productSearch, setProductSearch, productFilter, setProductFilter,
                    orders, productionJobs, exchangeRate,
                    refreshInventoryData, addTerminalLog, handleAiClassifyMaterial, handleCompileGCode, handleConsumeRemnant, handleCreateSupplyOrder,
                    handleDeleteMaterial, handleDuplicateSupplyOrder, handleExportMaterialsCSV, handleFindSuitableRemnantSubmit, handleOpenSmartSupplyModal: smartHandleOpen,
                    handleQuickSupplyRequest, handleReorderMaterials, handleUpdateMaterialQualityStatus, handleUpdateSupplyOrderStatus, handleWasteRemnant,
                    isCompilingGCode, gcodeTabMode, setGcodeTabMode, gcodePrompt, setGcodePrompt, gcodeMaterial, setGcodeMaterial, gcodePower, setGcodePower,
                    gcodeSpeed, setGcodeSpeed, gcodeResult, setGcodeResult
                  }}
                />
              )}              {activeView === "production" && (
                <ProductionPage
                  pageVariants={pageVariants}
                  pageTransition={pageTransition}
                  currentUser={currentUser}
                  setShowAddJob={setShowAddJob}
                  setShowAddMachine={setShowAddMachine}
                  activeProductionSubTab={activeProductionSubTab}
                  setActiveProductionSubTab={setActiveProductionSubTab}
                  newMachineName={newMachineName}
                  setNewMachineName={setNewMachineName}
                  newMachineType={newMachineType}
                  setNewMachineType={setNewMachineType}
                  newMachineHours={newMachineHours}
                  setNewMachineHours={setNewMachineHours}
                  machineSearchQuery={machineSearchQuery}
                  setMachineSearchQuery={setMachineSearchQuery}
                  machineStatusFilter={machineStatusFilter}
                  setMachineStatusFilter={setMachineStatusFilter}
                  machineLayout={machineLayout}
                  setMachineLayout={setMachineLayout}
                  newJobItemName={newJobItemName}
                  setNewJobItemName={setNewJobItemName}
                  newJobMaterialId={newJobMaterialId}
                  setNewJobMaterialId={setNewJobMaterialId}
                  newJobLaserPower={newJobLaserPower}
                  setNewJobLaserPower={setNewJobLaserPower}
                  newJobLaserSpeed={newJobLaserSpeed}
                  setNewJobLaserSpeed={setNewJobLaserSpeed}
                  newJobEstTime={newJobEstTime}
                  setNewJobEstTime={setNewJobEstTime}
                  newJobOrderId={newJobOrderId}
                  setNewJobOrderId={setNewJobOrderId}
                  activeRunningJob={activeRunningJob}
                  laserX={laserX}
                  laserY={laserY}
                  liveLogLines={liveLogLines}
                  machines={machines}
                  productionJobs={productionJobs}
                  materials={materials}
                  remnants={remnants}
                  orders={orders}
                  exchangeRate={exchangeRate}
                  addTerminalLog={addTerminalLog}
                  handleAddMachine={handleAddMachine}
                  handleChangeMachineMaintenance={handleChangeMachineMaintenance}
                  handleCreateProductionJob={handleCreateProductionJob}
                  handleDeleteMachine={handleDeleteMachine}
                  handleDirectCompleteJob={handleDirectCompleteJob}
                  handlePauseProductionJob={handlePauseProductionJob}
                  handleReorderProductionJobs={handleReorderProductionJobs}
                  handleStartProductionJob={handleStartProductionJob}
                  handleUpdateMachineCalibration={handleUpdateMachineCalibration}
                  handleUpdateOrderStatus={orderHandleStatus}
                  handleUpdateProductionJob={handleUpdateProductionJob}
                />
              )}              {/* FINANCIAL & ACCOUNTING CONTROL PANEL */}
              {activeView === "accounting" && (
                <motion.div
                  key="accounting"
                  variants={pageVariants}
                  initial="initial"
                  animate="animate"
                  exit="exit"
                  transition={pageTransition}
                  className="flex-1 overflow-y-auto p-6 bg-zinc-950/20"
                >
                  <AccountingPage
                    customers={customers}
                    onRefreshOrders={fetchOrders}
                    currentUserRole={currentUser?.role}
                    initialTab={accountingTab}
                    companySettings={companySettings}
                  />
                </motion.div>
              )}

              {/* SETTINGS & BACKUP VIEW */}
              {activeView === "settings" && (
                currentUser?.role !== "admin" ? (
                  <div className="flex flex-col justify-center items-center text-center p-12 min-h-[400px]">
                    <Lock className="w-16 h-16 text-[#c59257] mb-4" />
                    <h3 className="text-lg font-bold text-zinc-100">إعدادات النظام محمية</h3>
                    <p className="text-sm text-zinc-500 mt-2 max-w-md leading-relaxed">لوحة التحكم وإعدادات النظام الحساسة متاحة فقط لمدير النظام (Admin).</p>
                  </div>
                ) : (
                  <SettingsPage {...{ showTerminalLogs, setShowTerminalLogs, showJwtHud, setShowJwtHud, virtualFiles, selectedFileId, setSelectedFileId, pageVariants, pageTransition, currentUserRole: currentUser?.role }} />
                )
              )}
              {/* 🤖 AXIS LAB AI HUB - INTELLIGENT AI COMPANION & DEEPBRAIN WORKSPACE */}
              {activeView === "ai_hub" && (
                <AIHubPage
                  {...{ activeAiTab, activeView, aiMemoryLayers, aiSearchQuery, aiSearchResults, calcAutoWaste, calcCutLengthCm, calcElectricityRate, calcEngraveAreaCm2, calcLaserPowerWatts, calcLengthCm, calcMachineId, calcMatId, calcOperatorRate, calcQuantity, calcResult, calcSetupFeeUSD, calcTargetProfitMargin, calcThicknessMm, calcTubeCostUSD, calcTubeLifespanHours, calcWasteOverridePercent, calcWidthCm, calcWorkType, chatInput, chatMessages, currentUser, machines, materials, fastResponseMode, fetchAiMemory, handleAiSearch, handleRunFastCalculator, handleRunFastParser, handleSelectCalcMachine, handleSelectCalcMaterial, handleSendChatMessage, isCalculatingFast, isLoadingAiMemory, isParsingFast, isSearchingAi, isSendingChatMessage, lastResponseLatencyMs, orders, pageTransition, pageVariants, parserInputText, parserResult, selectedMemoryLayer, setActiveAiTab, setAiSearchQuery, setCalcAutoWaste, setCalcCutLengthCm, setCalcElectricityRate, setCalcEngraveAreaCm2, setCalcLaserPowerWatts, setCalcLengthCm, setCalcOperatorRate, setCalcQuantity, setCalcSetupFeeUSD, setCalcTargetProfitMargin, setCalcThicknessMm, setCalcTubeCostUSD, setCalcTubeLifespanHours, setCalcWasteOverridePercent, setCalcWidthCm, setCalcWorkType, setChatInput, setFastResponseMode, setParserInputText, setSelectedMemoryLayer, setShowAddOrder, terminalLogs }}
                />
              )}              {activeView === "reports" && (
                <ReportsPage isEmployee={currentUser?.role === "employee"} pageVariants={pageVariants} pageTransition={pageTransition} />
              )}
              {activeView === "help" && (
                <HelpPage pageVariants={pageVariants} pageTransition={pageTransition} />
              )}
            </AnimatePresence>
          </div>

          {/* Bottom terminal logs rail */}
          {showTerminalLogs && (
            <div className="h-44 border-t border-zinc-800 bg-black p-3 font-mono text-[11px] overflow-hidden shrink-0 flex flex-col justify-between">
              <div className="flex items-center justify-between mb-1.5 border-b border-zinc-900 pb-1.5 text-[10px]">
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                  <span className="text-emerald-500 font-bold uppercase tracking-wider">● AXIS LAB LOCAL LOGS ACTIVE</span>
                </div>
                <span className="text-zinc-600">SESSION: JWT_PROD_A0</span>
              </div>

              <div className="flex-1 overflow-y-auto space-y-1 text-zinc-500 pr-2">
                {terminalLogs.map((lg, i) => (
                  <div key={i} className="flex gap-3 leading-relaxed items-start">
                    <span className="text-zinc-700">[{lg.time}]</span>
                    <span className={`uppercase min-w-[50px] shrink-0 font-bold ${
                      lg.type === "SUCCESS" || lg.type === "DB" ? "text-emerald-400" :
                      lg.type === "ERROR" ? "text-rose-500" :
                      lg.type === "JWT" ? "text-indigo-400 underline" : "text-zinc-500"
                    }`}>{lg.type}</span>
                    <span className="text-zinc-300">{lg.msg}</span>
                  </div>
                ))}
                <div ref={terminalBottomRef} />
              </div>

              {/* Manual command submit form */}
              <form onSubmit={handleTerminalSubmit} className="flex items-center gap-2 border-t border-zinc-900 pt-1.5">
                <span className="text-indigo-500 font-bold select-none">$</span>
                <input
                  type="text"
                  value={commandInput}
                  onChange={(e) => setCommandInput(e.target.value)}
                  placeholder="Type terminal command (e.g. status, npx prisma generate, clear)..."
                  className="flex-1 bg-transparent text-zinc-200 outline-none placeholder-zinc-800 text-[11px]"
                />
              </form>
            </div>
          )}

        </section>

        {/* Right HUD: JWT Inspector and decryption visualizer */}
        {showJwtHud && (
          <aside className="w-72 border-l border-zinc-800 bg-zinc-950 p-4 shrink-0 flex flex-col justify-between overflow-y-auto">
            <div className="space-y-6">
              <div className="flex items-center gap-2 border-b border-zinc-900 pb-2.5">
                <Key className="w-4 h-4 text-indigo-400" />
                <h3 className="text-xs font-bold text-zinc-200 uppercase tracking-widest font-mono">JWT Session HUD</h3>
              </div>

              {/* Token payload inspector info */}
              {inspectToken ? (
                <div className="space-y-4">
                  <div className="flex items-center gap-2 text-emerald-400 text-xs font-semibold">
                    <Unlock className="w-3.5 h-3.5" />
                    <span>Session active & decrypted</span>
                  </div>

                  <div className="bg-zinc-900/60 border border-zinc-850 p-3 rounded-lg font-mono text-[10px] space-y-2.5">
                    <div>
                      <span className="text-zinc-600 uppercase block font-semibold mb-0.5">JWT Token Header</span>
                      <pre className="text-zinc-300 leading-normal">{JSON.stringify(inspectToken.header, null, 2)}</pre>
                    </div>
                    <div className="border-t border-zinc-850/80 pt-2">
                      <span className="text-indigo-400 uppercase block font-semibold mb-0.5">JWT Token Payload</span>
                      <pre className="text-zinc-300 leading-normal whitespace-pre-wrap">{JSON.stringify(inspectToken.payload, null, 2)}</pre>
                    </div>
                    <div className="border-t border-zinc-850/80 pt-2">
                      <span className="text-rose-400 uppercase block font-semibold mb-0.5">Signature Key Hash</span>
                      <span className="text-zinc-500 block truncate">{inspectToken.signature}</span>
                    </div>
                  </div>

                  <div className="p-3 bg-zinc-900/20 border border-zinc-900 rounded-lg text-xs leading-normal font-sans text-zinc-500">
                    تم توقيع الرمز رقمياً باستخدام الخوارزمية القياسية الموضحة بالترويسة لضمان أمان الاتصالات بين Electron و React.
                  </div>
                </div>
              ) : (
                <div className="space-y-3 font-sans">
                  <div className="flex items-center gap-2 text-amber-500 text-xs font-semibold">
                    <Lock className="w-3.5 h-3.5" />
                    <span>لم يتم العثور على ترمز JWT نشط</span>
                  </div>
                  <p className="text-[11px] text-zinc-500 leading-normal">يرجى تسجيل الدخول للحصول على ترمز الجلسة وفك التشفير مرئياً.</p>
                </div>
              )}
            </div>

            <div className="pt-4 border-t border-zinc-900">
              <span className="text-[9px] text-zinc-600 block text-center font-mono uppercase tracking-widest mb-1.5">workshop system logs</span>
              <div className="bg-zinc-900/40 p-2 border border-zinc-900 rounded text-center text-[10px] text-zinc-500 font-mono">
                ROLE_ACC_CHECKED: PASS
              </div>
            </div>
          </aside>
        )}
      <GlobalDialogs
        {...{ USERS: users, activeView, addTerminalLog, appendEditOrderDraftItem, calculateOrderProgress, companySettings, currentUser, customers, deleteConfirmTarget, deliveryBlockedOrder, editCustAddress, editCustCategory, editCustCompany, editCustEmail, editCustName, editCustNotes, editCustPhone, editCustWhatsapp, editFocusedItemIdx, editOrderDiscountAmountVal, editOrderItems, editOrderRemaining, editOrderSubtotal, editOrderTaxAmount, editOrderTaxPercentVal, editOrderTotalPrice, editingCustomer, editingOrder, editingProduct, adjustQty, adjustReason, adjustType, aiClassificationResult, editingMaterial, getPaymentStatusBadge, isAiClassifying, isCurrencyConverterOpen, isSubmittingSmartSupply, jobRemHeight, jobRemLocation, jobRemWidth, matCategory, matColor, matHeight, matLocation, matMinStock, matNotes, matPrice, matSubCategory, matSupplierId, matThickness, matUnit, matWidth, materials, newJobEstTime, newJobItemName, newJobLaserPower, newJobLaserSpeed, newJobMaterialId, newJobOrderId, priceComparisonMaterial, productionJobs, setAdjustQty, setAdjustReason, setAdjustType, setAiClassificationResult, setEditingMaterial, setIsCurrencyConverterOpen, setJobRemHeight, setJobRemLocation, setJobRemWidth, setMatCategory, setMatColor, setMatHeight, setMatLocation, setMatMinStock, setMatName, setMatNotes, setMatPrice, setMatSubCategory, setMatSupplierId, setMatThickness, setMatUnit, setMatWidth, setNewJobEstTime, setNewJobItemName, setNewJobLaserPower, setNewJobLaserSpeed, setNewJobMaterialId, setNewJobOrderId, setPriceComparisonMaterial, setShowAddJob, setShowAddMaterial, setShowAdjustStock, setShowRemnantRegister, setShowSmartSupplyModal, setSmartSupplyItems, showAddJob, showAddMaterial, showAdjustStock, showRemnantRegister, showSmartSupplyModal, smartSupplyItems, suppliers, exchangeRate, fetchCustomers, fetchLogs, fetchOrders, handleAdjustStockSubmit, handleAiClassifyMaterial, handleAssignOrderWorkers, handleCompileOrderGCode, handleCopyText, handleCreateDirectSupplyOrder, handleCreateMaterial, handleCreateProduct, handleCreateProductionJob, handleCreateRemnant, handleDeleteCustomer, handleDeletePayment, handleDeleteProduct, handleDirectCompleteJob, handleEditOrderSubmit, handleRateOrder, handleExecuteSmartSupplyOrders: smartHandleExecute, handleRecordPaymentSubmit, handleRegisterRemnantOnJobComplete, handleSaveEditCustomer, handleSendEmailShare, handleSettleRemainingAndDeliver, handleUpdateItemProgress, handleUpdateMaterial, handleUpdateProduct, isCompilingOrderGcode, isHelpGuideOpen, isProcessingQuickFullPay, isQuickActionsOpen, isSearchPaletteOpen, isSearching, isSharingEmail, matName, newPaymentAmount, newPaymentNotes, newPaymentSYPAmount, orderDetailsTab, orderGcodeResult, orders, pageTransition, pageVariants, paymentInputCurrency, printTicketOrder, prodCategory, prodCode, prodDescription, prodName, prodPrice, prodStock, products, progressModalOrder, refreshInventoryData, remHeight, remLocation, remMatId, remQty, remWidth, removeEditOrderDraftItem, renderCutProgressInteractiveTable, searchQuery, searchResults, selectedCustomerFiles, selectedCustomerIdForOrder, selectedMaterialFiles, selectedOrder, selectedPaymentMethod, selectedPaymentReceipt, selectedProductFiles, setActiveView, setDeleteConfirmTarget, setDeliveryBlockedOrder, setEditCustAddress, setEditCustCategory, setEditCustCompany, setEditCustEmail, setEditCustName, setEditCustNotes, setEditCustPhone, setEditCustWhatsapp, setEditFocusedItemIdx, setEditOrderItems, setEditingCustomer, setEditingOrder, setEditingProduct, setIsHelpGuideOpen, setIsQuickActionsOpen, setIsSearchPaletteOpen, setNewPaymentAmount, setNewPaymentNotes, setNewPaymentSYPAmount, setOrderDetailsTab, setPaymentInputCurrency, setPrintTicketOrder, setProdCategory, setProdCode, setProdDescription, setProdName, setProdPrice, setProdStock, setProgressModalOrder, setRemHeight, setRemLocation, setRemMatId, setRemQty, setRemWidth, setSearchQuery, setSearchResults, setSelectedCustomerFiles, setSelectedCustomerIdForOrder, setSelectedMaterialFiles, setSelectedOrder, setSelectedPaymentMethod, setSelectedPaymentReceipt, setSelectedProductFiles, setShareBody, setShareEmail, setShareEmailSuccess, setShareMethod, setShareSubject, setShowAddOrder, setShowAddProduct, setShowAddRemnant, setShowHelpModal, setShowShareModal, shareBody, shareEmail, shareEmailSuccess, shareMethod, shareMsgCopied, sharePdfCopied, shareSubject, showAddOrder, showAddProduct, showAddRemnant, showHelpModal, showShareModal, updateEditOrderDraftItem, updateRate }}
      />
      <EmployeeStatsModal isOpen={showEmployeeStats} onClose={() => setShowEmployeeStats(false)} />
      </main>

    </div>
  );
}
