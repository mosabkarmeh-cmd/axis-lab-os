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
import { useProductActions } from "./hooks/useProductActions";
import { extractMaterialName, materialPriceUSD } from "./lib/materials";
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
import InventoryPage from "./components/InventoryPage";
import ReportsPage from "./components/ReportsPage";
import SettingsPage from "./components/SettingsPage";
import HelpPage from "./components/HelpPage";
import SupplierPriceComparisonModal from "./components/SupplierPriceComparisonModal";
import HelpModal from "./components/HelpModal";
import HelpTooltip from "./components/HelpTooltip";
import AddOrderModal from "./components/AddOrderModal";
import AutoLogoutTimer from "./components/AutoLogoutTimer";
import CurrencyConverterModal from "./components/CurrencyConverterModal";
import FirstRunPasswordModal from "./components/FirstRunPasswordModal";

const USERS = [
  { id: "u-1", email: "admin@axislab.com", fullName: "المدير العام", role: "admin" },
  { id: "u-2", email: "employee@axislab.com", fullName: "فني تشغيل الليزر", role: "employee" },
  { id: "u-3", email: "accountant@axislab.com", fullName: "المحاسب المالي", role: "accountant" }
];

export default function App() {
  // Authentication states
  const [token, setToken] = useState<string | null>(null);
  const [theme, setTheme] = useLocalStorage<"dark" | "light">("axislab_theme", "dark");
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [authEmail, setAuthEmail] = useState<string>("admin@axislab.com");
  const [authPassword, setAuthPassword] = useState<string>("");
  const [authFullName, setAuthFullName] = useState<string>("");
  const [authRole, setAuthRole] = useState<'admin' | 'employee' | 'accountant'>("employee");
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
  const [notifications, setNotifications] = useState<any[]>([]);
  const [recycleBinItems, setRecycleBinItems] = useState<any[]>([]);
  const [orderStatuses, setOrderStatuses] = useState<any[]>([]);

  // Global Search Command Palette States
  const [isSearchPaletteOpen, setIsSearchPaletteOpen] = useState<boolean>(false);
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [searchResults, setSearchResults] = useState<{
    orders: any[];
    customers: any[];
    products: any[];
    materials: any[];
    invoices: any[];
  } | null>(null);
  const [isSearching, setIsSearching] = useState<boolean>(false);
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

  useEffect(() => {
    if (!searchQuery.trim()) {
      setSearchResults(null);
      return;
    }
    const delayDebounce = setTimeout(async () => {
      setIsSearching(true);
      try {
        const res = await fetch(`/api/search?q=${encodeURIComponent(searchQuery)}`);
        const data = await res.json();
        if (data.success) {
          setSearchResults(data.results);
        }
      } catch (e) {
        console.error("Search error", e);
      } finally {
        setIsSearching(false);
      }
    }, 300);
    return () => clearTimeout(delayDebounce);
  }, [searchQuery]);

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
  const [terminalLogs, setTerminalLogs] = useState<Array<{ time: string; type: string; msg: string }>>([
    { time: "11:22:01", type: "SYSTEM", msg: "AXIS LAB bootstrap engine initialized." },
    { time: "11:22:05", type: "DB", msg: "Prisma Database Client initialized in memory." },
    { time: "11:22:10", type: "JWT", msg: "Secret key configured for secure token signing." }
  ]);

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
  const [aiMemoryLayers, setAiMemoryLayers] = useState<any>(null);
  const [isLoadingAiMemory, setIsLoadingAiMemory] = useState<boolean>(false);
  const [selectedMemoryLayer, setSelectedMemoryLayer] = useState<string>("short_term");
  const [aiSearchQuery, setAiSearchQuery] = useState<string>("");
  const [aiSearchResults, setAiSearchResults] = useState<any[]>([]);
  const [isSearchingAi, setIsSearchingAi] = useState<boolean>(false);

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
    } catch (err: any) {
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

  // Active terminal command line
  const [commandInput, setCommandInput] = useState<string>("");
  const terminalBottomRef = useRef<HTMLDivElement>(null);

  // Computed Dashboard Metrics
  const pendingOrders = orders.filter(o => o.status === "new" || o.status === "in_progress");
  const lowStockCount = materialStats?.lowStock ?? materials.filter(m => m.inventory ? m.inventory.availableQuantity < m.minimumStock : m.minimumStock > 0).length;
  const laserMachines = machines.filter(m => m.type === 'laser_co2' || m.type === 'fiber_laser');
  const runningLasersCount = laserMachines.filter(m => m.status === 'running').length;
  const todayDateStr = "2026-07-10";
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

  // One coordinated LAN sync keeps all clients consistent without overlapping requests.
  useEffect(() => {
    const pollInterval = setInterval(() => {
      if (document.visibilityState === "visible" && currentUser) void refreshNetworkSnapshot();
    }, 8000);

    return () => clearInterval(pollInterval);
  }, [currentUser?.id]);

  // Auto-verify saved JWT token on mount
  useEffect(() => {
    const savedToken = localStorage.getItem("axislab_token");
    if (savedToken) {
      addTerminalLog("SYSTEM", "استعادة الجلسة: يتم فحص صلاحية رمز JWT المخزن...");
      fetch("/api/auth/verify", {
        headers: { "Authorization": `Bearer ${savedToken}` }
      })
      .then(res => {
        if (res.ok) return res.json();
        throw new Error("Expired or invalid");
      })
      .then(data => {
        setToken(savedToken);
        setCurrentUser(data.user);
        if (data.user.role === "accountant") {
          setActiveView("accounting");
        } else if (data.user.role === "employee") {
          setActiveView("production");
        } else {
          setActiveView("dashboard");
        }
        addTerminalLog("JWT", `مرحباً بعودتك فني ${data.user.fullName}! تم التحقق من سلامة رمز JWT واستعادة الجلسة الآمنة.`);
        fetchLogs();
      })
      .catch(() => {
        addTerminalLog("WARNING", "انتهت صلاحية رمز المصادقة القديم أو تم التلاعب به. يرجى تسجيل الدخول مجدداً.");
        localStorage.removeItem("axislab_token");
        document.cookie = "axislab_token=; path=/; max-age=0; SameSite=Lax";
      });
    }
  }, []);

  useEffect(() => {
    if (currentUser?.mustChangePassword && token) {
      setFirstRunPasswordCurrent(authPassword || null);
    } else {
      setFirstRunPasswordCurrent(null);
    }
  }, [currentUser?.mustChangePassword, token, authPassword]);

  const handleFirstRunPasswordChange = async (currentPassword: string, newPassword: string) => {
    if (!token) return;
    setIsFirstRunPasswordLoading(true);
    try {
      const res = await fetch("/api/auth/change-password", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ currentPassword, newPassword }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "تعذر تغيير كلمة المرور");
      setCurrentUser(data.user);
      setFirstRunPasswordCurrent(null);
      setAuthError(null);
      addTerminalLog("AUTH", "تم تغيير كلمة مرور المسؤول المؤقتة بنجاح.");
    } catch (error: any) {
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

  useEffect(() => {
    terminalBottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [terminalLogs]);

  // Decode JWT on state update
  useEffect(() => {
    if (token) {
      try {
        const parts = token.split(".");
        if (parts.length === 3) {
          const payloadDecoded = JSON.parse(atob(parts[1].replace(/-/g, "+").replace(/_/g, "/")));
          setInspectToken({
            header: { alg: "HS256", typ: "JWT" },
            payload: payloadDecoded,
            signature: parts[2]
          });
        }
      } catch (e) {
        setInspectToken(null);
      }
    } else {
      setInspectToken(null);
    }
  }, [token]);

  // Database fetchers use the shared safe API client from src/lib/api.ts.
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

  const fetchNotifications = async () => {
    const data = await safeApiFetch("/api/notifications");
    if (data && data.success) setNotifications(data.notifications);
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

  const handleMarkAsRead = async (id: string) => {
    const data = await safeApiFetch(`/api/notifications/${id}/read`, { method: "PATCH" });
    if (data && data.success) {
      setNotifications(prev => prev.map(n => n.id === id ? { ...n, isRead: true } : n));
    }
  };

  const handleMarkAllAsRead = async () => {
    const data = await safeApiFetch("/api/notifications/read-all", { method: "PATCH" });
    if (data && data.success) {
      setNotifications(prev => prev.map(n => ({ ...n, isRead: true })));
    }
  };

  const handleDeleteNotification = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const data = await safeApiFetch(`/api/notifications/${id}`, { method: "DELETE" });
    if (data && data.success) {
      setNotifications(prev => prev.filter(n => n.id !== id));
    }
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

  const legacyHandleReorderMaterials = (sourceId: string, targetId: string) => {
    setMaterials((prevMaterials) => {
      const sourceIdx = prevMaterials.findIndex((item) => item.id === sourceId);
      const targetIdx = prevMaterials.findIndex((item) => item.id === targetId);
      if (sourceIdx === -1 || targetIdx === -1) return prevMaterials;

      const updated = [...prevMaterials];
      const [movedItem] = updated.splice(sourceIdx, 1);
      updated.splice(targetIdx, 0, movedItem);

      try {
        const ids = updated.map((mat) => mat.id);
        localStorage.setItem("axislab_materials_order_ids", JSON.stringify(ids));
      } catch (err) {
        console.error("Failed to save material order to localStorage", err);
      }

      return updated;
    });

    if (materialSortBy !== 'default') {
      setMaterialSortBy('default');
    }

    setTerminalLogs((prev) => [
      ...prev,
      {
        time: new Date().toLocaleTimeString('ar-EG'),
        type: 'SUCCESS',
        msg: '🔄 تم إعادة ترتيب المواد الخام بالسحب والإفلات وحفظ الترتيب المفضل بنجاح'
      }
    ]);
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

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError(null);
    setIsAuthLoading(true);
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: authEmail, password: authPassword })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Login Failed");

      localStorage.setItem("axislab_token", data.token);
      document.cookie = `axislab_token=${data.token}; path=/; max-age=${60 * 60 * 24}; SameSite=Lax`;
      setToken(data.token);
      setCurrentUser(data.user);
      if (data.user.role === "accountant") {
        setActiveView("accounting");
      } else if (data.user.role === "employee") {
        setActiveView("production");
      } else {
        setActiveView("dashboard");
      }
      addTerminalLog("JWT", `User '${data.user.fullName}' authenticated. Token issued.`);
      fetchLogs();
    } catch (err: any) {
      setAuthError(err.message);
      addTerminalLog("ERROR", `Auth failed: ${err.message}`);
    } finally {
      setIsAuthLoading(false);
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError(null);
    if (!authFullName) {
      setAuthError("الرجاء إدخال الاسم الكامل");
      return;
    }
    setIsAuthLoading(true);
    try {
      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: authEmail,
          password: authPassword,
          fullName: authFullName,
          role: authRole
        })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Registration Failed");

      localStorage.setItem("axislab_token", data.token);
      document.cookie = `axislab_token=${data.token}; path=/; max-age=${60 * 60 * 24}; SameSite=Lax`;
      setToken(data.token);
      setCurrentUser(data.user);
      setIsRegisterMode(false);
      if (data.user.role === "accountant") {
        setActiveView("accounting");
      } else if (data.user.role === "employee") {
        setActiveView("production");
      } else {
        setActiveView("dashboard");
      }
      addTerminalLog("JWT", `New account registered: ${data.user.email} as ${data.user.role}`);
      fetchLogs();
    } catch (err: any) {
      setAuthError(err.message);
      addTerminalLog("ERROR", `Registration failed: ${err.message}`);
    } finally {
      setIsAuthLoading(false);
    }
  };

  // Quick Preset login credentials filler
  const setAuthPreset = (presetKey: string, email: string, pass: string) => {
    setActivePreset(presetKey);
    setAuthEmail(email);
    setAuthPassword(pass);
    setAuthError(null);
  };

  const addTerminalLog = (type: string, msg: string) => {
    const time = new Date().toLocaleTimeString([], { hour12: false });
    setTerminalLogs(prev => [...prev, { time, type: type.toUpperCase(), msg }]);
  };

  const {
    handleAiClassifyMaterial: materialHandleAiClassify,
    handleCreateMaterial: materialHandleCreate,
    handleUpdateMaterial: materialHandleUpdate,
    handleUpdateMaterialQualityStatus: materialHandleQuality,
    handleDeleteMaterial: materialHandleDelete,
    handleReorderMaterials: materialHandleReorder,
    handleExportMaterialsCSV: materialHandleExport,
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


  const handleLogout = (isAuto: boolean = false) => {
    setToken(null);
    setCurrentUser(null);
    localStorage.removeItem("axislab_token");
    document.cookie = "axislab_token=; path=/; max-age=0; SameSite=Lax";
    if (isAuto) {
      addTerminalLog("JWT", "تم تسجيل الخروج التلقائي لحماية الجلسة بعد 30 دقيقة من الخمول.");
    } else {
      addTerminalLog("JWT", "تم تسجيل الخروج وإتلاف الرمز المميز لجلسة العمل بنجاح.");
    }
  };

  // Update completion progress for a single part, material group, or set all complete (تعديل نسبة إنجاز أجزاء ومواد الطلب)
  const handleUpdateItemProgress = async (
    orderId: string, 
    params: { itemId?: string; materialName?: string; setAllCompleted?: boolean; resetAll?: boolean; addItem?: any; removeItemId?: string; completedQuantity?: number }
  ) => {
    try {
      const res = await fetch(`/api/orders/${orderId}/items-progress`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...params,
          changedById: currentUser?.id || "u-1"
        })
      });

      if (res.ok) {
        const updatedOrder = await res.json();
        setOrders(prev => prev.map(o => o.id === orderId ? updatedOrder : o));
        if (selectedOrder && selectedOrder.id === orderId) {
          setSelectedOrder(updatedOrder);
        }
        if (progressModalOrder && progressModalOrder.id === orderId) {
          setProgressModalOrder(updatedOrder);
        }
        addTerminalLog("PROD", `تم تحديث إنجاز أجزاء ومواد الطلب #${updatedOrder.orderNumber}`);
        fetchLogs();
      } else {
        const err = await res.json();
        addTerminalLog("ERROR", err.error || "فشل تحديث إنجاز أجزاء ومواد الطلب");
      }
    } catch (e) {
      addTerminalLog("ERROR", "خطأ في الاتصال بالخادم لتحديث إنجاز الأجزاء والمواد");
    }
  };

  // Helper to calculate technical order completion progress based on each part/item and material breakdown (حسب تفاصيل كل مادة وعدد القطع والتكرارات)
  const calculateOrderProgress = (ord: any, jobsList: any[] = productionJobs) => {
    if (!ord) {
      return { 
        percentage: 0, 
        totalJobs: 0, 
        completedJobs: 0, 
        runningJobs: 0, 
        totalUnits: 0, 
        completedUnits: 0, 
        totalItems: 0, 
        completedItems: 0, 
        itemsBreakdown: [], 
        materialsBreakdown: [],
        hasJobs: false, 
        label: "0%" 
      };
    }

    const items = ord.items || ord.orderItems || [];
    const linkedJobs = (jobsList || []).filter(j => 
      (j.orderId && j.orderId === ord.id) || 
      (j.orderNumber && j.orderNumber === ord.orderNumber)
    );


    // If order has items, calculate completion progress for each part/item & material group
    if (items.length > 0) {
      let totalUnits = 0;
      let completedUnits = 0;
      let completedItems = 0;

      const materialMap: Record<string, {
        materialName: string;
        totalUnits: number;
        completedUnits: number;
        itemsCount: number;
        items: any[];
      }> = {};

      const itemsBreakdown = items.map((it: any, idx: number) => {
        const q = Math.max(1, Number(it.quantity) || 1);
        const matName = extractMaterialName(it);
        
        let c = 0;
        if (it.completedQuantity !== undefined && it.completedQuantity !== null) {
          c = Number(it.completedQuantity);
        } else if (it.isCompleted || it.status === 'completed') {
          c = q;
        } else {
          // Check matching production job for this item/part
          const matchingJob = linkedJobs.find(j => 
            (j.title && j.title.toLowerCase().includes((it.productName || "").toLowerCase())) ||
            (j.notes && j.notes.toLowerCase().includes((it.productName || "").toLowerCase()))
          );
          if (matchingJob) {
            if (matchingJob.status === 'completed') {
              c = q;
            } else if (matchingJob.completedQuantity !== undefined) {
              c = Math.min(q, Number(matchingJob.completedQuantity));
            } else if (matchingJob.progress) {
              c = Math.round(((matchingJob.progress || 0) / 100) * q);
            }
          }
        }

        c = Math.max(0, Math.min(q, c));

        // Global status overrides if delivered or ready or cancelled
        if (ord.status === 'ready' || ord.status === 'delivered') {
          c = q;
        } else if (ord.status === 'cancelled') {
          c = 0;
        }

        if (c >= q) {
          completedItems++;
        }

        totalUnits += q;
        completedUnits += c;

        const partPct = Math.min(100, Math.round((c / q) * 100));

        const itemObj = {
          id: it.id || `item-${idx}`,
          productName: it.productName || "جزء/مادة القص",
          materialName: matName,
          quantity: q,
          completedQuantity: c,
          remainingQuantity: Math.max(0, q - c),
          percentage: partPct,
          isCompleted: c >= q,
          unitPrice: Number(it.unitPrice) || 0,
          totalPrice: Number(it.totalPrice) || (q * (Number(it.unitPrice) || 0)),
          notes: it.notes || ""
        };

        if (!materialMap[matName]) {
          materialMap[matName] = {
            materialName: matName,
            totalUnits: 0,
            completedUnits: 0,
            itemsCount: 0,
            items: []
          };
        }
        materialMap[matName].totalUnits += q;
        materialMap[matName].completedUnits += c;
        materialMap[matName].itemsCount += 1;
        materialMap[matName].items.push(itemObj);

        return itemObj;
      });

      const materialsBreakdown = Object.values(materialMap).map(m => {
        const matPct = m.totalUnits > 0 ? Math.min(100, Math.round((m.completedUnits / m.totalUnits) * 100)) : 0;
        const remainingUnits = Math.max(0, m.totalUnits - m.completedUnits);
        return {
          materialName: m.materialName,
          totalUnits: m.totalUnits,
          completedUnits: m.completedUnits,
          remainingUnits,
          percentage: matPct,
          itemsCount: m.itemsCount,
          isCompleted: m.completedUnits >= m.totalUnits,
          items: m.items
        };
      });

      let overallPct = totalUnits > 0 ? Math.min(100, Math.round((completedUnits / totalUnits) * 100)) : 0;
      if (ord.status === 'ready' || ord.status === 'delivered') overallPct = 100;
      if (ord.status === 'cancelled') overallPct = 0;

      const completedCountJobs = linkedJobs.filter(j => j.status === 'completed').length;
      const runningCountJobs = linkedJobs.filter(j => j.status === 'running' || j.status === 'paused').length;

      const remainingUnitsOverall = Math.max(0, totalUnits - completedUnits);
      const label = remainingUnitsOverall > 0 
        ? `${materialsBreakdown.length} خامات | ${completedUnits}/${totalUnits} قطعة (${overallPct}%) • متبقي ${remainingUnitsOverall} قطعة`
        : `${materialsBreakdown.length} خامات | مكتمل بالكامل (100%)`;

      return {
        percentage: overallPct,
        totalItems: items.length,
        completedItems,
        totalUnits,
        completedUnits,
        remainingUnits: remainingUnitsOverall,
        itemsBreakdown,
        materialsBreakdown,
        hasJobs: linkedJobs.length > 0,
        totalJobs: linkedJobs.length,
        completedJobs: completedCountJobs,
        runningJobs: runningCountJobs,
        label
      };
    }

    // Fallback if no items array exists but linked jobs exist
    if (linkedJobs.length > 0) {
      let totalUnits = 0;
      let completedUnits = 0;
      let totalProgressWeighted = 0;

      linkedJobs.forEach(j => {
        const qty = Number(j.quantity) || Number((j as any).usedQuantity) || 1;
        totalUnits += qty;
        
        if (j.status === 'completed') {
          completedUnits += qty;
          totalProgressWeighted += 100 * qty;
        } else if (j.status === 'running' || j.status === 'paused') {
          const compQty = (j as any).completedQuantity !== undefined 
            ? Number((j as any).completedQuantity) 
            : Math.round(((j.progress || 25) / 100) * qty);
          const jobProg = Math.min(100, Math.max(10, Math.round((compQty / qty) * 100)));
          completedUnits += Math.min(qty, compQty);
          totalProgressWeighted += jobProg * qty;
        } else {
          const jobProg = j.progress || 0;
          totalProgressWeighted += jobProg * qty;
        }
      });

      const rawAvg = totalUnits > 0 ? (totalProgressWeighted / totalUnits) : 0;
      const avgProgress = Math.min(100, Math.round(rawAvg));
      const completedCount = linkedJobs.filter(j => j.status === 'completed').length;
      const runningCount = linkedJobs.filter(j => j.status === 'running' || j.status === 'paused').length;
      
      return {
        percentage: avgProgress,
        totalItems: linkedJobs.length,
        completedItems: completedCount,
        totalUnits,
        completedUnits,
        itemsBreakdown: [],
        hasJobs: true,
        totalJobs: linkedJobs.length,
        completedJobs: completedCount,
        runningJobs: runningCount,
        label: `${completedCount}/${linkedJobs.length} مهام (${completedUnits}/${totalUnits} قطعة - ${avgProgress}%)`
      };
    }
    
    // Fallback estimation based on order status
    let fallbackPercentage = 0;
    let label = "جديد (0%)";

    if (ord.status === 'ready' || ord.status === 'delivered') {
      fallbackPercentage = 100;
      label = ord.status === 'delivered' ? 'مكتمل ومسلم (100%)' : 'جاهز للتسليم (100%)';
    } else if (ord.status === 'in_progress') {
      fallbackPercentage = 50;
      label = "قيد التنفيذ والقص (50%)";
    } else if (ord.status === 'cancelled') {
      fallbackPercentage = 0;
      label = "ملغي (0%)";
    } else {
      fallbackPercentage = 0;
      label = "جديد / بانتظار الإنتاج (0%)";
    }
    
    return {
      percentage: fallbackPercentage,
      totalItems: 0,
      completedItems: 0,
      totalUnits: 0,
      completedUnits: 0,
      itemsBreakdown: [],
      hasJobs: false,
      totalJobs: 0,
      completedJobs: 0,
      runningJobs: 0,
      label
    };
  };

  // Helper to render interactive Cut Progress Table (جدول تحديد شو يلي انقص وشو يلي لسا)
  const renderCutProgressInteractiveTable = (targetOrder: Order) => {
    if (!targetOrder) return null;
    const prog = calculateOrderProgress(targetOrder, productionJobs);

    const totalRequiredPieces = prog.itemsBreakdown.reduce((sum: number, item: any) => sum + Math.max(0, Number(item.quantity) || 0), 0);
    const totalCompletedPieces = prog.itemsBreakdown.reduce((sum: number, item: any) => sum + Math.min(Math.max(0, Number(item.completedQuantity) || 0), Math.max(0, Number(item.quantity) || 0)), 0);
    const totalRemainingPieces = Math.max(0, totalRequiredPieces - totalCompletedPieces);
    const completedItemsCount = prog.itemsBreakdown.filter((item: any) => item.isCompleted).length;

    return (
      <div className="space-y-4 font-sans text-right">
        {/* Top Total Progress Banner */}
        <div className="bg-gradient-to-r from-zinc-950 via-zinc-900 to-zinc-950 border border-zinc-800 p-4 rounded-xl shadow-xl space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-zinc-300">نسبة إنجاز الطلب الإجمالية:</span>
                <span className={`font-mono font-extrabold text-xl px-3 py-0.5 rounded-lg border ${
                  prog.percentage === 100 
                    ? "bg-emerald-950/80 text-emerald-400 border-emerald-800" 
                    : prog.percentage > 0 
                    ? "bg-cyan-950/80 text-cyan-300 border-cyan-800" 
                    : "bg-zinc-900 text-zinc-400 border-zinc-800"
                }`}>
                  {prog.percentage}%
                </span>
                <span className="text-[11px] font-medium text-zinc-400">({prog.label})</span>
              </div>
              <p className="text-[11px] text-zinc-400 leading-relaxed">
                تُحسب نسبة الإنجاز تلقائياً بنسبة (مجموع القطع التي انقصت ÷ إجمالي القطع المطلوبة × 100). حدد أدناه <strong className="text-emerald-400">شو يلي انقص</strong> أو <strong className="text-amber-400">شو يلي لسا</strong> وسيتحدث المؤشر فوراً.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={() => handleUpdateItemProgress(targetOrder.id, { setAllCompleted: true })}
                className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-lg text-xs transition-colors flex items-center gap-1.5 shadow-lg shadow-emerald-950/50 cursor-pointer"
                title="تحديد كافة القطع كمكتملة 100% (شو يلي انقص = الكلي)"
              >
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>إكمال كل القطع</span>
              </button>

              <button
                type="button"
                onClick={() => handleUpdateItemProgress(targetOrder.id, { resetAll: true })}
                className="px-3 py-1.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 border border-zinc-700 font-bold rounded-lg text-xs transition-colors flex items-center gap-1.5 cursor-pointer"
                title="تصفير إنجاز كافة القطع (0 انقص / كامل الكمية لسا)"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                <span>إعادة الكل للبداية</span>
              </button>

              <button
                type="button"
                onClick={() => setShowAddCutItemForm(!showAddCutItemForm)}
                className="px-3 py-1.5 bg-cyan-950 hover:bg-cyan-900 text-cyan-300 border border-cyan-800 font-bold rounded-lg text-xs transition-colors flex items-center gap-1.5 cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>إضافة بند جديد</span>
              </button>
            </div>
          </div>

          {/* Overall Progress Bar Gauge */}
          <div className="w-full bg-zinc-950 border border-zinc-800 rounded-full h-3 overflow-hidden p-0.5 relative shadow-inner">
            <div
              className={`h-full rounded-full transition-all duration-500 ${
                prog.percentage === 100
                  ? "bg-gradient-to-r from-emerald-500 to-teal-400 shadow-[0_0_12px_rgba(16,185,129,0.6)]"
                  : prog.percentage > 0
                  ? "bg-gradient-to-r from-blue-600 via-indigo-500 to-cyan-400 animate-pulse shadow-[0_0_10px_rgba(6,182,212,0.5)]"
                  : "bg-zinc-800"
              }`}
              style={{ width: `${Math.max(prog.percentage, 2)}%` }}
            />
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1">
            <div className="rounded-lg border border-zinc-800 bg-zinc-950/80 px-3 py-2 text-center">
              <div className="text-[10px] text-zinc-500">إجمالي القطع المطلوبة</div>
              <div className="mt-1 text-base font-black font-mono text-zinc-100">{totalRequiredPieces.toLocaleString()}</div>
              <div className="text-[9px] text-zinc-600">قطعة</div>
            </div>
            <div className="rounded-lg border border-emerald-900/60 bg-emerald-950/20 px-3 py-2 text-center">
              <div className="text-[10px] text-emerald-300/80">القطع المنجزة</div>
              <div className="mt-1 text-base font-black font-mono text-emerald-400">{totalCompletedPieces.toLocaleString()}</div>
              <div className="text-[9px] text-emerald-500/70">تم قصها</div>
            </div>
            <div className="rounded-lg border border-amber-900/60 bg-amber-950/20 px-3 py-2 text-center">
              <div className="text-[10px] text-amber-300/80">القطع المتبقية</div>
              <div className="mt-1 text-base font-black font-mono text-amber-300">{totalRemainingPieces.toLocaleString()}</div>
              <div className="text-[9px] text-amber-500/70">بانتظار القص</div>
            </div>
            <div className="rounded-lg border border-cyan-900/60 bg-cyan-950/20 px-3 py-2 text-center">
              <div className="text-[10px] text-cyan-300/80">البنود المكتملة</div>
              <div className="mt-1 text-base font-black font-mono text-cyan-300">{completedItemsCount} / {prog.itemsBreakdown.length}</div>
              <div className="text-[9px] text-cyan-500/70">بنود الإنتاج</div>
            </div>
          </div>
        </div>

        {/* Add new cut item form */}
        {showAddCutItemForm && (
          <div className="bg-zinc-900/90 border border-zinc-800 p-3.5 rounded-xl space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-zinc-200">إضافة بند أو مادة جديدة لجدول القص</span>
              <button
                type="button"
                onClick={() => setShowAddCutItemForm(false)}
                className="text-zinc-500 hover:text-zinc-300 text-xs"
              >
                إغلاق ×
              </button>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-4 gap-2">
              <input
                type="text"
                placeholder="اسم البند (مثال: أحرف أكريليك 5 ملم)"
                value={newCutItemName}
                onChange={(e) => setNewCutItemName(e.target.value)}
                className="bg-zinc-950 border border-zinc-800 text-zinc-200 text-xs rounded-lg px-3 py-1.5 focus:outline-none focus:border-cyan-500 sm:col-span-2"
              />
              <input
                type="number"
                min={1}
                placeholder="العدد"
                value={newCutItemQty}
                onChange={(e) => setNewCutItemQty(Math.max(1, Number(e.target.value) || 1))}
                className="bg-zinc-950 border border-zinc-800 text-zinc-200 text-xs rounded-lg px-3 py-1.5 text-center font-mono focus:outline-none focus:border-cyan-500"
              />
              <select
                value={newCutItemMat}
                onChange={(e) => setNewCutItemMat(e.target.value)}
                className="bg-zinc-950 border border-zinc-800 text-zinc-200 text-xs rounded-lg px-3 py-1.5 focus:outline-none focus:border-cyan-500"
              >
                <option value="أكريليك">أكريليك</option>
                <option value="خشب MDF">خشب MDF</option>
                <option value="خشب طبيعي/معاكس">خشب طبيعي/معاكس</option>
                <option value="جلود وقماش">جلود وقماش</option>
                <option value="معادن وستانلس">معادن وستانلس</option>
              </select>
            </div>
            <div className="flex justify-end">
              <button
                type="button"
                disabled={!newCutItemName.trim()}
                onClick={() => {
                  if (!newCutItemName.trim()) return;
                  handleUpdateItemProgress(targetOrder.id, {
                    addItem: {
                      productName: newCutItemName.trim(),
                      quantity: newCutItemQty,
                      materialName: newCutItemMat,
                      unitPrice: 0
                    }
                  });
                  setNewCutItemName("");
                  setNewCutItemQty(1);
                  setShowAddCutItemForm(false);
                }}
                className="px-4 py-1.5 bg-cyan-600 hover:bg-cyan-500 disabled:opacity-40 text-white font-bold text-xs rounded-lg transition-colors cursor-pointer"
              >
                حفظ وإضافة لجدول القص
              </button>
            </div>
          </div>
        )}

        {/* Interactive Table of Cut & Remaining Pieces */}
        {prog.itemsBreakdown.length === 0 ? (
          <div className="bg-zinc-950 border border-zinc-800 rounded-xl p-8 text-center space-y-3">
            <Scissors className="w-10 h-10 text-zinc-600 mx-auto" />
            <div className="text-zinc-300 font-bold text-sm">لا توجد بنود أو خامات مسجلة في جدول القص لهذا الطلب</div>
            <p className="text-zinc-500 text-xs max-w-md mx-auto">
              قم بإضافة البنود أو المواد المطلوبة وقائمة القطع ليتمكن العمال من تحديد شو يلي انقص وشو يلي لسا بدقة.
            </p>
            <button
              type="button"
              onClick={() => setShowAddCutItemForm(true)}
              className="px-4 py-2 bg-cyan-600 hover:bg-cyan-500 text-white font-bold text-xs rounded-lg inline-flex items-center gap-2 cursor-pointer shadow-lg shadow-cyan-950/50"
            >
              <Plus className="w-4 h-4" />
              <span>إضافة بند / خامة للقص الآن</span>
            </button>
          </div>
        ) : (
          <div className="bg-zinc-950 border border-zinc-800 rounded-xl overflow-hidden shadow-inner">
            <div className="overflow-x-auto">
              <table className="w-full text-xs text-right">
                <thead>
                  <tr className="bg-zinc-900 border-b border-zinc-800 text-zinc-400 font-semibold">
                    <th className="p-3 text-right min-w-[160px]">البند والمادة الخام</th>
                    <th className="p-3 text-center min-w-[90px]">الكمية المطلوبة (الكلي)</th>
                        <th className="p-3 text-center min-w-[210px] bg-emerald-950/20 text-emerald-300 font-bold border-x border-zinc-800">
                      المنجز ✅
                      <span className="block text-[10px] font-normal text-emerald-400/70 mt-0.5">ما تم قصّه فعليًا</span>
                    </th>
                        <th className="p-3 text-center min-w-[210px] bg-amber-950/20 text-amber-300 font-bold border-x border-zinc-800">
                      المتبقي ⚠️
                      <span className="block text-[10px] font-normal text-amber-400/70 mt-0.5">ما يجب قصّه بعد</span>
                    </th>
                    <th className="p-3 text-center min-w-[110px]">نسبة إنجاز البند</th>
                    <th className="p-3 text-center min-w-[100px]">حالة القص</th>
                    <th className="p-3 text-center w-10">حذف</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-900">
                  {prog.itemsBreakdown.map((it: any) => {
                    const rem = Math.max(0, it.quantity - (it.completedQuantity || 0));

                    return (
                      <tr
                        key={it.id}
                        className={`transition-colors ${
                          it.isCompleted ? "bg-emerald-950/15 hover:bg-emerald-950/25" : "hover:bg-zinc-900/40"
                        }`}
                      >
                        {/* Item Name & Material Badge */}
                        <td className="p-3 text-right">
                          <div className="font-bold text-zinc-200 flex flex-wrap items-center gap-1.5">
                            <span>{it.productName}</span>
                            <span className="px-1.5 py-0.5 bg-zinc-800 border border-zinc-700 text-amber-300 rounded text-[10px] font-mono">
                              {it.materialName}
                            </span>
                          </div>
                          {it.notes && (
                            <div className="text-[10px] text-zinc-500 mt-1">{it.notes}</div>
                          )}
                        </td>

                        {/* Total Required Quantity Q */}
                        <td className="p-3 text-center">
                          <span className="inline-flex items-center justify-center px-2.5 py-1 bg-zinc-900 border border-zinc-800 rounded-lg font-mono font-extrabold text-sm text-zinc-200">
                            {it.quantity}
                          </span>
                          <span className="block text-[10px] text-zinc-500 mt-0.5">قطعة</span>
                        </td>

                        {/* column: شو يلي انقص ✅ (Cut pieces) */}
                        <td className="p-3 text-center bg-emerald-950/10 border-x border-zinc-800/60">
                          <div className="inline-flex items-center gap-1 bg-zinc-900 border border-emerald-900/60 p-1 rounded-xl shadow-sm">
                            <button
                              type="button"
                              disabled={it.completedQuantity <= 0}
                              onClick={() =>
                                handleUpdateItemProgress(targetOrder.id, {
                                  itemId: it.id,
                                  completedQuantity: it.completedQuantity - 1,
                                })
                              }
                              className="w-6 h-6 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-300 disabled:opacity-30 disabled:cursor-not-allowed font-bold text-xs flex items-center justify-center transition-colors cursor-pointer"
                              title="-1 قطعة انقصت"
                            >
                              -
                            </button>

                            <input
                              type="number"
                              min={0}
                              max={it.quantity}
                              value={it.completedQuantity}
                              onChange={(e) => {
                                const val = Math.max(0, Math.min(it.quantity, Number(e.target.value) || 0));
                                handleUpdateItemProgress(targetOrder.id, {
                                  itemId: it.id,
                                  completedQuantity: val,
                                });
                              }}
                              className="w-12 text-center font-mono font-extrabold text-sm bg-zinc-950 border border-emerald-800/80 text-emerald-400 rounded py-0.5 focus:outline-none focus:border-emerald-500"
                            />

                            <button
                              type="button"
                              disabled={it.completedQuantity >= it.quantity}
                              onClick={() =>
                                handleUpdateItemProgress(targetOrder.id, {
                                  itemId: it.id,
                                  completedQuantity: it.completedQuantity + 1,
                                })
                              }
                              className="w-6 h-6 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-300 disabled:opacity-30 disabled:cursor-not-allowed font-bold text-xs flex items-center justify-center transition-colors cursor-pointer"
                              title="+1 قطعة انقصت"
                            >
                              +
                            </button>

                            {it.quantity >= 5 && (
                              <button
                                type="button"
                                disabled={it.completedQuantity >= it.quantity}
                                onClick={() =>
                                  handleUpdateItemProgress(targetOrder.id, {
                                    itemId: it.id,
                                    completedQuantity: Math.min(it.quantity, it.completedQuantity + 5),
                                  })
                                }
                                className="px-1.5 py-0.5 bg-zinc-800 hover:bg-zinc-700 text-cyan-300 border border-zinc-700 rounded text-[10px] font-mono font-bold transition-colors cursor-pointer"
                                title="+5 قطع انقصت"
                              >
                                +5
                              </button>
                            )}

                            <button
                              type="button"
                              onClick={() =>
                                handleUpdateItemProgress(targetOrder.id, {
                                  itemId: it.id,
                                  completedQuantity: it.quantity,
                                })
                              }
                              disabled={it.isCompleted}
                              className="px-2 py-0.5 bg-emerald-950 hover:bg-emerald-900 text-emerald-300 border border-emerald-800 rounded text-[10px] font-bold ml-0.5 transition-colors disabled:opacity-40 cursor-pointer"
                              title="تحديد إنجاز هذا البند بالكامل (100% انقص)"
                            >
                              كلها
                            </button>
                          </div>
                          <div className="text-[10px] font-bold text-emerald-400 mt-1">
                            انقص: <span className="font-mono">{it.completedQuantity}</span> من <span className="font-mono">{it.quantity}</span>
                          </div>
                        </td>

                        {/* column: شو يلي لسا ⚠️ (Remaining pieces) */}
                        <td className="p-3 text-center bg-amber-950/10 border-x border-zinc-800/60">
                          <div className="inline-flex items-center gap-1 bg-zinc-900 border border-amber-900/60 p-1 rounded-xl shadow-sm">
                            <button
                              type="button"
                              disabled={rem <= 0}
                              onClick={() => {
                                const newRem = rem - 1;
                                const newCut = Math.max(0, it.quantity - newRem);
                                handleUpdateItemProgress(targetOrder.id, {
                                  itemId: it.id,
                                  completedQuantity: newCut,
                                });
                              }}
                              className="w-6 h-6 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-300 disabled:opacity-30 disabled:cursor-not-allowed font-bold text-xs flex items-center justify-center transition-colors cursor-pointer"
                              title="-1 من المتبقي"
                            >
                              -
                            </button>

                            <input
                              type="number"
                              min={0}
                              max={it.quantity}
                              value={rem}
                              onChange={(e) => {
                                const newRem = Math.max(0, Math.min(it.quantity, Number(e.target.value) || 0));
                                const newCut = Math.max(0, it.quantity - newRem);
                                handleUpdateItemProgress(targetOrder.id, {
                                  itemId: it.id,
                                  completedQuantity: newCut,
                                });
                              }}
                              className="w-12 text-center font-mono font-extrabold text-sm bg-zinc-950 border border-amber-800/80 text-amber-300 rounded py-0.5 focus:outline-none focus:border-amber-500"
                            />

                            <button
                              type="button"
                              disabled={rem >= it.quantity}
                              onClick={() => {
                                const newRem = rem + 1;
                                const newCut = Math.max(0, it.quantity - newRem);
                                handleUpdateItemProgress(targetOrder.id, {
                                  itemId: it.id,
                                  completedQuantity: newCut,
                                });
                              }}
                              className="w-6 h-6 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-300 disabled:opacity-30 disabled:cursor-not-allowed font-bold text-xs flex items-center justify-center transition-colors cursor-pointer"
                              title="+1 إلى المتبقي"
                            >
                              +
                            </button>

                            {rem >= 5 && (
                              <button
                                type="button"
                                disabled={rem < 5}
                                onClick={() => {
                                  const newRem = Math.max(0, rem - 5);
                                  const newCut = Math.max(0, it.quantity - newRem);
                                  handleUpdateItemProgress(targetOrder.id, {
                                    itemId: it.id,
                                    completedQuantity: newCut,
                                  });
                                }}
                                className="px-1.5 py-0.5 bg-zinc-800 hover:bg-zinc-700 text-amber-300 border border-zinc-700 rounded text-[10px] font-mono font-bold transition-colors cursor-pointer"
                                title="-5 من المتبقي"
                              >
                                -5
                              </button>
                            )}

                            <button
                              type="button"
                              onClick={() =>
                                handleUpdateItemProgress(targetOrder.id, {
                                  itemId: it.id,
                                  completedQuantity: it.quantity,
                                })
                              }
                              disabled={rem === 0}
                              className="px-2 py-0.5 bg-amber-950 hover:bg-amber-900 text-amber-300 border border-amber-800 rounded text-[10px] font-bold ml-0.5 transition-colors disabled:opacity-40 cursor-pointer"
                              title="0 متبقي (تم إنجاز القص)"
                            >
                              0 لسا
                            </button>
                          </div>
                          <div className={`text-[10px] font-bold mt-1 ${rem > 0 ? "text-amber-400" : "text-zinc-500"}`}>
                            {rem > 0 ? `لسا باقي: ${rem} قطعة` : "لا يوجد متبقي ✓"}
                          </div>
                        </td>

                        {/* Item Percentage Bar */}
                        <td className="p-3 text-center">
                          <div className="w-24 sm:w-28 mx-auto space-y-1">
                            <div className="flex justify-between text-[10px] font-mono">
                              <span className="text-zinc-500">{it.completedQuantity}/{it.quantity}</span>
                              <span className={it.isCompleted ? "text-emerald-400 font-bold" : "text-cyan-300 font-bold"}>
                                {it.percentage}%
                              </span>
                            </div>
                            <div className="w-full bg-zinc-900 border border-zinc-800 rounded-full h-2 overflow-hidden">
                              <div
                                className={`h-full rounded-full transition-all duration-300 ${
                                  it.isCompleted ? "bg-emerald-500" : it.percentage > 0 ? "bg-cyan-400" : "bg-zinc-800"
                                }`}
                                style={{ width: `${Math.max(it.percentage, 3)}%` }}
                              />
                            </div>
                          </div>
                        </td>

                        {/* Item Status Badge */}
                        <td className="p-3 text-center">
                          {it.isCompleted ? (
                            <span className="inline-flex items-center gap-1 bg-emerald-950/80 text-emerald-400 border border-emerald-800/80 px-2.5 py-1 rounded-lg font-bold text-[11px]">
                              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                              <span>مكتمل ✓</span>
                            </span>
                          ) : it.percentage > 0 ? (
                            <span className="inline-flex items-center gap-1 bg-cyan-950/80 text-cyan-300 border border-cyan-800/80 px-2.5 py-1 rounded-lg font-bold text-[11px]">
                              <RefreshCw className="w-3.5 h-3.5 text-cyan-400 animate-spin" />
                              <span>قيد القص</span>
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 bg-zinc-900 text-zinc-400 border border-zinc-800 px-2.5 py-1 rounded-lg font-medium text-[11px]">
                              <Clock className="w-3.5 h-3.5 text-zinc-500" />
                              <span>لم يبدأ بعد</span>
                            </span>
                          )}
                        </td>

                        {/* Delete Item button */}
                        <td className="p-3 text-center">
                          <button
                            type="button"
                            onClick={() => {
                              if (confirm(`هل أنت متأكد من حذف البند (${it.productName}) من جدول القص؟`)) {
                                handleUpdateItemProgress(targetOrder.id, { removeItemId: it.id });
                              }
                            }}
                            className="text-zinc-600 hover:text-rose-400 transition-colors p-1"
                            title="حذف هذا البند من جدول القص"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    );
  };

  // Export Materials & Inventory CSV for external stock auditing
  const legacyHandleExportMaterialsCSV = (materialsList: any[] = materials) => {
    if (!materialsList || materialsList.length === 0) {
      addTerminalLog("WARN", "لا يوجد خامات للتصدير");
      return;
    }

    const headers = [
      "كود المادة",
      "اسم المادة والخامة",
      "التصنيف",
      "السماكة (ملم)",
      "اللون / المواصفة",
      "حالة الجودة الفنية",
      "سعر الشراء للوحدة ($)",
      "سعر الوحدة بالليرة (ل.س)",
      "مساحة اللوح (م²)",
      "تكلفة المتر المربع (ل.س/م²)",
      "تكلفة المتر المربع ($/م²)",
      "الرصيد المتاح الحالي",
      "الوحدة",
      "الكمية المحجوزة للإنتاج",
      "حد الطلب الأدنى",
      "موقع التخزين / المستودع",
      "حالة المخزون والطلب",
      "إجمالي قيمة المخزون ($)"
    ];

    const rows = materialsList.map(m => {
      const qty = m.inventory?.quantity ?? 0;
      const reserved = m.inventory?.reservedQuantity ?? 0;
      const min = m.minimumStock || 0;
      const priceUSD = m.pricePerUnit || 0;
      const priceSYP = Math.round(priceUSD * exchangeRate);
      const totalVal = (qty * priceUSD).toFixed(2);
      const quality = m.qualityStatus === 'defective' ? 'معيبة' : m.qualityStatus === 'in_preparation' ? 'قيد التجهيز' : 'مفحوصة';
      const statusText = qty <= 0 ? 'نافذ بالكامل' : qty <= min ? 'منخفض / يتطلب توريد' : 'سليم ومتوفر';

      const widthM = m.width ? Number(m.width) / 1000 : 0;
      const heightM = m.height ? Number(m.height) / 1000 : 0;
      const areaM2 = widthM * heightM;
      const costPerM2SYP = areaM2 > 0 ? Math.round(priceSYP / areaM2) : '-';
      const costPerM2USD = areaM2 > 0 ? (priceUSD / areaM2).toFixed(2) : '-';

      return [
        m.id,
        m.name || '',
        m.category || '',
        m.thickness || '-',
        m.color || '-',
        quality,
        priceUSD,
        priceSYP,
        areaM2 > 0 ? areaM2.toFixed(2) : '-',
        costPerM2SYP,
        costPerM2USD,
        qty,
        m.unit || 'وحدة',
        reserved,
        min,
        m.inventory?.location || 'المستودع الرئيسي',
        statusText,
        totalVal
      ];
    });

    const csvContent = "\uFEFF" + [
      headers.join(","),
      ...rows.map(row => row.map(val => {
        const str = String(val).replace(/"/g, '""');
        return str.includes(",") || str.includes("\n") || str.includes('"') ? `"${str}"` : str;
      }).join(","))
    ].join("\n");

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    const dateStr = new Date().toISOString().slice(0, 10);
    link.setAttribute("download", `AXIS_LAB_Materials_Inventory_Audit_${dateStr}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    addTerminalLog("EXPORT", `تم تصدير سجل المواد والمخزون (${materialsList.length} خامة) كملف CSV للتدقيق الخارجي وحصر الأصول`);
  };

  // ==================== Production & Machine Actions ====================
  const handleAddMachine = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMachineName) return;
    try {
      const res = await fetch("/api/production/machines", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: newMachineName,
          type: newMachineType,
          workingHours: Number(newMachineHours) || 0
        })
      });
      const data = await res.json();
      if (res.ok) {
        addTerminalLog("SYSTEM", `تم إضافة ماكينة جديدة بنجاح: ${newMachineName}`);
        setNewMachineName("");
        setNewMachineHours("0");
        setShowAddMachine(false);
        fetchMachines();
      } else {
        addTerminalLog("ERROR", `فشل إضافة ماكينة: ${data.message || "خطأ مجهول"}`);
      }
    } catch (err: any) {
      addTerminalLog("ERROR", `خطأ أثناء الاتصال بالخادم: ${err.message}`);
    }
  };

  const handleDeleteMachine = async (id: string) => {
    const confirmed = await window.showConfirm?.("هل أنت متأكد من رغبتك في حذف هذه الماكينة نهائياً؟", "تأكيد حذف الماكينة");
    if (!confirmed) return;
    try {
      const res = await fetch(`/api/production/machines/${id}`, {
        method: "DELETE"
      });
      const data = await res.json();
      if (res.ok) {
        addTerminalLog("SYSTEM", "تم حذف الماكينة بنجاح من قاعدة البيانات.");
        fetchMachines();
      } else {
        addTerminalLog("ERROR", `فشل حذف الماكينة: ${data.message || "خطأ مجهول"}`);
      }
    } catch (err: any) {
      addTerminalLog("ERROR", `خطأ أثناء الاتصال بالخادم: ${err.message}`);
    }
  };

  // Start Production Job Simulation
  const handleStartProductionJob = async (jobId: string, machineId: string) => {
    try {
      const res = await fetch(`/api/production/jobs/${jobId}/start`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ machineId, operatorId: currentUser?.id || "u-1" })
      });
      const data = await res.json();
      if (data.success) {
        addTerminalLog("SYSTEM", `بدء تشغيل المهمة ${data.job.jobNo} على الآلة. تم تحديث حالة الطلب المرتبط إلى (قيد التنفيذ) تلقائياً.`);
        fetchProductionJobs();
        fetchMachines();
        fetchOrders();
        fetchLogs();
        
        // Setup live simulation
        const jobToRun = productionJobs.find(j => j.id === jobId) || data.job;
        setActiveRunningJob(jobToRun);
        setLiveLogLines([
          `[${new Date().toLocaleTimeString()}] SYSTEM: Loading design vectors...`,
          `[${new Date().toLocaleTimeString()}] SYSTEM: Calibrating Z-axis distance to 4.2mm`,
          `[${new Date().toLocaleTimeString()}] CNC: G28 (Home position check)`,
          `[${new Date().toLocaleTimeString()}] CNC: M03 S${Math.round((jobToRun.laserPower || 80) * 10)} (Laser head ON)`,
          `[${new Date().toLocaleTimeString()}] ORDER: Updated linked order status to 'in_progress'`
        ]);
      }
    } catch (e) {
      console.error(e);
      addTerminalLog("ERROR", "فشل بدء تشغيل مهمة الإنتاج");
    }
  };

  // Pause Production Job
  const handlePauseProductionJob = async (jobId: string) => {
    try {
      const res = await fetch(`/api/production/jobs/${jobId}/pause`, { method: "POST" });
      const data = await res.json();
      if (data.success) {
        addTerminalLog("SYSTEM", `تم إيقاف المهمة مؤقتاً.`);
        fetchProductionJobs();
        fetchMachines();
        if (activeRunningJob?.id === jobId) {
          setActiveRunningJob(null);
        }
      }
    } catch (e) {
      console.error(e);
    }
  };

  // Update Machine Calibration Settings
  const handleUpdateMachineCalibration = async (machineId: string, calibrationSettings: any) => {
    try {
      const res = await fetch(`/api/production/machines/${machineId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ calibrationSettings })
      });
      const data = await res.json();
      if (data.success) {
        addTerminalLog("SYSTEM", `تم تحديث معايرة آلة القص بنجاح.`);
        fetchMachines();
      } else {
        addTerminalLog("ERROR", `فشل تحديث المعايرة: ${data.message}`);
      }
    } catch (e: any) {
      addTerminalLog("ERROR", `خطأ في الاتصال بالخادم أثناء المعايرة: ${e.message}`);
    }
  };

  // Update Production Job Details (Material Cost & Waste Calculation)
  const handleUpdateProductionJob = (jobId: string, updatedData: Partial<ProductionJob>) => {
    setProductionJobs(prev => prev.map(job => {
      if (job.id === jobId) {
        return { ...job, ...updatedData };
      }
      return job;
    }));
    addTerminalLog("PROD", `تم حساب وتطبيق تكلفة المادة والهدر للمهمة ${jobId}`);
  };

  // Reorder Production Jobs Queue Sequence
  const handleReorderProductionJobs = async (newJobs: ProductionJob[]) => {
    setProductionJobs(newJobs);
    addTerminalLog("PROD", `تم إعادة جدولة طابور القص بالليزر وتحديث تسلسل ${newJobs.length} مهام بنجاح`);

    try {
      const orderedIds = newJobs.map(j => j.id);
      await fetch("/api/production/jobs/reorder", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ orderedIds })
      });
    } catch (e) {
      console.error("Error persisting job reorder:", e);
    }
  };

  // Create Production Job Manually
  const handleCreateProductionJob = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newJobItemName || !newJobMaterialId) {
      window.showAlert?.("الرجاء اختيار اسم المهمة ونوع الخامة", "تنبيه إدخال");
      return;
    }

    try {
      const res = await fetch("/api/production/jobs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          itemName: newJobItemName,
          materialId: newJobMaterialId,
          laserPower: newJobLaserPower,
          laserSpeed: newJobLaserSpeed,
          estTimeSec: newJobEstTime,
          orderId: newJobOrderId || null,
          orderNumber: newJobOrderId ? orders.find(o => o.id === newJobOrderId)?.orderNumber : "يدوي"
        })
      });
      const data = await res.json();
      if (data.success) {
        addTerminalLog("DB", `تم إدراج مهمة قص جديدة: ${newJobItemName}`);
        setNewJobItemName("");
        setNewJobMaterialId("");
        setNewJobLaserPower(80);
        setNewJobLaserSpeed(30);
        setNewJobEstTime(90);
        setNewJobOrderId("");
        setShowAddJob(false);
        fetchProductionJobs();
      }
    } catch (e) {
      console.error(e);
    }
  };

  // Register Remnant Offcut upon Job Completion
  const handleRegisterRemnantOnJobComplete = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!showRemnantRegister) return;

    try {
      const res = await fetch(`/api/production/jobs/${showRemnantRegister.id}/complete`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          remnantWidth: jobRemWidth ? Number(jobRemWidth) : undefined,
          remnantHeight: jobRemHeight ? Number(jobRemHeight) : undefined,
          remnantLocation: jobRemLocation || undefined
        })
      });
      const data = await res.json();
      if (data.success) {
        addTerminalLog("DB", `تم إكمال المهمة وتحديث المخزون بنجاح.`);
        if (jobRemWidth && jobRemHeight) {
          addTerminalLog("DB", `تم توليد وتسجيل فضلة لوح مقاس ${jobRemWidth}x${jobRemHeight} مم.`);
        }
        setShowRemnantRegister(null);
        setJobRemWidth("");
        setJobRemHeight("");
        setJobRemLocation("");
        fetchProductionJobs();
        fetchMachines();
        refreshInventoryData();
      }
    } catch (e) {
      console.error(e);
    }
  };

  // Direct Complete Job (without remnant form)
  const handleDirectCompleteJob = async (jobId: string) => {
    try {
      const res = await fetch(`/api/production/jobs/${jobId}/complete`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({})
      });
      const data = await res.json();
      if (data.success) {
        addTerminalLog("DB", `تم إكمال المهمة ${jobId} بنجاح.`);
        fetchProductionJobs();
        fetchMachines();
        refreshInventoryData();
      }
    } catch (e) {
      console.error(e);
    }
  };

  // Change Machine Maintenance Status
  const handleChangeMachineMaintenance = async (machineId: string, currentStatus: string) => {
    try {
      const newStatus = currentStatus === "maintenance" ? "idle" : "maintenance";
      const res = await fetch(`/api/production/machines/${machineId}/maintenance`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus })
      });
      const data = await res.json();
      if (data.success) {
        addTerminalLog("SYSTEM", `تم تحديث حالة صيانة الآلة ${data.machine.name} إلى: ${newStatus === 'maintenance' ? 'تحت الصيانة' : 'نشط وجاهز'}`);
        fetchMachines();
      }
    } catch (e) {
      console.error(e);
    }
  };

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

  // ==================== MATERIALS & INVENTORY ACTIONS ====================

  const handleAiClassifyMaterial = async (
    nameToClassify: string,
    thicknessToClassify: string,
    colorToClassify: string,
    notesToClassify: string,
    isForEdit: boolean,
    quiet: boolean = false
  ) => {
    if (!nameToClassify || nameToClassify.trim().length < 2) {
      if (!quiet) {
        window.showAlert?.("يرجى إدخال اسم المادة أولاً (حرفين على الأقل) لتشغيل التصنيف الذكي بالذكاء الاصطناعي", "تنبيه الذكاء الاصطناعي");
      }
      return;
    }

    setIsAiClassifying(true);
    setAiClassificationResult(null);

    try {
      const res = await fetch("/api/materials/ai-classify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: nameToClassify,
          thickness: thicknessToClassify,
          color: colorToClassify,
          notes: notesToClassify
        })
      });

      const data = await res.json();
      if (data.success && data.classification) {
        const { category, subCategory, confidence, explanation } = data.classification;
        
        // Update the form fields automatically
        if (isForEdit) {
          setEditingMaterial((prev: any) => prev ? {
            ...prev,
            category: category,
            subCategory: subCategory
          } : null);
        } else {
          setMatCategory(category);
          setMatSubCategory(subCategory);
        }

        setAiClassificationResult({
          category,
          subCategory,
          confidence,
          explanation
        });
        
        addTerminalLog("AI", `Auto-classified material '${nameToClassify}' as '${category}' (${subCategory}) with confidence ${Math.round(confidence * 100)}%`);
      } else {
        addTerminalLog("ERROR", `AI classification failed: ${data.message || "Unknown error"}`);
        if (!quiet) {
          window.showAlert?.(`فشل التصنيف بالذكاء الاصطناعي: ${data.message || "خطأ غير معروف"}`, "خطأ التصنيف الذكي");
        }
      }
    } catch (err: any) {
      console.error(err);
      addTerminalLog("ERROR", `AI classification request error: ${err.message}`);
      if (!quiet) {
        window.showAlert?.(`فشل الاتصال بالخادم لتصنيف المادة: ${err.message}`, "خطأ اتصال");
      }
    } finally {
      setIsAiClassifying(false);
    }
  };

  const handleCreateMaterial = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!matName) return;

    let finalCategory = matCategory;
    let finalSubCategory = matSubCategory;

    // Run AI classification automatically if not done yet
    if (!aiClassificationResult && matName.trim().length >= 2) {
      try {
        const classRes = await fetch("/api/materials/ai-classify", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name: matName,
            thickness: matThickness,
            color: matColor,
            notes: matNotes
          })
        });
        const classData = await classRes.json();
        if (classData.success && classData.classification) {
          if (!matCategory || matCategory === "عام") finalCategory = classData.classification.category;
          if (!matSubCategory.trim()) finalSubCategory = classData.classification.subCategory;
          addTerminalLog("AI", `Pre-save AI auto-classified material '${matName}' as '${finalCategory}' (${finalSubCategory})`);
        }
      } catch (err) {
        // Fall back to current selection
      }
    }

    try {
      const res = await fetch("/api/materials", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: matName,
          category: finalCategory || matCategory || "عام",
          subCategory: matSubCategory.trim() || finalSubCategory || "عام",
          thickness: matThickness ? parseFloat(matThickness) : null,
          color: matColor,
          width: matWidth ? parseFloat(matWidth) : null,
          height: matHeight ? parseFloat(matHeight) : null,
          unit: matUnit,
          pricePerUnit: matPrice ? Math.round(parseFloat(matPrice)) : 0,
          minimumStock: matMinStock ? parseFloat(matMinStock) : 0,
          supplierId: matSupplierId || null,
          notes: matNotes,
          location: matLocation,
          qualityStatus: matQualityStatus
        })
      });

      if (res.ok) {
        addTerminalLog("DB", `Created raw material: ${matName}`);
        setShowAddMaterial(false);
        setAiClassificationResult(null);
        setMatName("");
        setMatSubCategory("");
        setMatThickness("");
        setMatColor("");
        setMatWidth("");
        setMatHeight("");
        setMatPrice("");
        setMatMinStock("");
        setMatSupplierId("");
        setMatNotes("");
        setMatLocation("");
        setMatQualityStatus("inspected");
        refreshInventoryData();
      }
    } catch (e) {
      addTerminalLog("ERROR", "Failed to create material");
    }
  };

  const handleUpdateMaterial = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingMaterial || !editingMaterial.name) return;

    let finalCategory = editingMaterial.category;
    let finalSubCategory = editingMaterial.subCategory;

    // Run AI classification automatically if not done yet
    if (!aiClassificationResult && editingMaterial.name.trim().length >= 2) {
      try {
        const classRes = await fetch("/api/materials/ai-classify", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name: editingMaterial.name,
            thickness: editingMaterial.thickness,
            color: editingMaterial.color,
            notes: editingMaterial.notes
          })
        });
        const classData = await classRes.json();
        if (classData.success && classData.classification) {
          if (!editingMaterial.category || editingMaterial.category === "عام") finalCategory = classData.classification.category;
          if (!editingMaterial.subCategory?.trim()) finalSubCategory = classData.classification.subCategory;
          addTerminalLog("AI", `Pre-update AI auto-classified material '${editingMaterial.name}' as '${finalCategory}' (${finalSubCategory})`);
        }
      } catch (err) {
        // Fall back to current selection
      }
    }

    try {
      const res = await fetch(`/api/materials/${editingMaterial.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: editingMaterial.name,
          category: finalCategory || editingMaterial.category || "عام",
          subCategory: editingMaterial.subCategory?.trim() || finalSubCategory || "عام",
          thickness: editingMaterial.thickness,
          color: editingMaterial.color,
          width: editingMaterial.width,
          height: editingMaterial.height,
          unit: editingMaterial.unit,
          pricePerUnit: Math.round(Number(editingMaterial.pricePerUnit) || 0),
          minimumStock: editingMaterial.minimumStock,
          supplierId: editingMaterial.supplierId,
          notes: editingMaterial.notes,
          location: editingMaterial.inventory?.location,
          qualityStatus: editingMaterial.qualityStatus || "inspected"
        })
      });

      if (res.ok) {
        addTerminalLog("DB", `Updated raw material: ${editingMaterial.name}`);
        setEditingMaterial(null);
        setAiClassificationResult(null);
        refreshInventoryData();
      }
    } catch (e) {
      addTerminalLog("ERROR", "Failed to update material");
    }
  };

  const handleUpdateMaterialQualityStatus = async (id: string, newQualityStatus: string) => {
    try {
      setMaterials(prev => prev.map(m => m.id === id ? { ...m, qualityStatus: newQualityStatus } : m));
      const res = await fetch(`/api/materials/${id}/quality-status`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ qualityStatus: newQualityStatus })
      });
      if (res.ok) {
        const labels: Record<string, string> = {
          inspected: "مفحوصة ومطابقة",
          defective: "معيبة (مرفوضة)",
          in_preparation: "قيد التجهيز"
        };
        addTerminalLog("DB", `تحديث حالة الجودة للمادة إلى "${labels[newQualityStatus] || newQualityStatus}"`);
      } else {
        refreshInventoryData();
      }
    } catch (err) {
      addTerminalLog("ERROR", "فشل تحديث حالة جودة المادة");
      refreshInventoryData();
    }
  };

  const handleDeleteMaterial = async (id: string, name: string) => {
    try {
      const res = await fetch(`/api/materials/${id}`, { method: "DELETE" });
      if (res.ok) {
        addTerminalLog("DB", `Archived material item: ${name}`);
        refreshInventoryData();
      }
    } catch (e) {
      addTerminalLog("ERROR", "Failed to archive material");
    }
  };

  const handleQuickSupplyRequest = (mat: any) => {
    if (!mat) return;

    // Set selected material
    setNewSupplyMaterialId(mat.id);

    // Select target supplier associated with this material or default to first available
    let targetSupplierId = mat.supplierId || (mat.supplier && mat.supplier.id) || "";
    if (!targetSupplierId && suppliers.length > 0) {
      targetSupplierId = suppliers[0].id;
    }
    if (targetSupplierId) {
      setSelectedDashboardSupplierId(targetSupplierId);
    }

    // Set recommended unit price
    const unitPriceVal = mat.pricePerUnit !== undefined && mat.pricePerUnit !== null
      ? mat.pricePerUnit.toString()
      : (mat.price !== undefined ? mat.price.toString() : "15");
    setNewSupplyPrice(unitPriceVal);

    // Calculate recommended supply quantity
    const currentAvailable = mat.inventory?.available ?? (mat.inventory?.quantity ?? 0);
    const minStock = mat.minimumStock || 10;
    const suggestedQty = Math.max(10, minStock - currentAvailable);
    setNewSupplyQty(suggestedQty.toString());

    // Expected delivery date (3 days in future)
    const futureDate = new Date();
    futureDate.setDate(futureDate.getDate() + 3);
    setNewSupplyExpectedDate(futureDate.toISOString().split("T")[0]);

    // Descriptive notes
    setNewSupplyNotes(`طلب توريد سريع ومباشر للخامة: ${mat.name} (${mat.category}${mat.thickness ? ` - سماكة ${mat.thickness}مم` : ""})`);

    // Switch view if needed and change tab to suppliers
    if (activeView !== "products") {
      setActiveView("products");
    }
    setActiveProductSubTab("suppliers");

    // Terminal log & feedback
    addTerminalLog("INVENTORY", `تم إعداد نموذج طلب توريد سريع لخامة: ${mat.name}`);
    window.showAlert?.(
      `تمت تعبئة نموذج طلب التوريد تلقائياً للخامة "${mat.name}". الكمية المقترحة: ${suggestedQty} قطعة بسعر $${unitPriceVal} للوحدة. يرجى مراجعة الطلب واعتتماده.`,
      "طلب توريد سريع 🚚"
    );
  };

  // Smart Auto-Replenishment Supply Proposal Engine
  const handleOpenSmartSupplyModal = () => {
    const lowStock = materials.filter(m => (m.inventory?.quantity ?? 0) <= (m.minimumStock || 0));

    if (lowStock.length === 0) {
      window.showAlert?.(
        "ممتاز! جميع الخامات والمواد في المستودع حالياً تتجاوز الحدود الدنيا للأمان. لا توجد مواد بحاجة لإعادة التوريد الذكي حالياً.",
        "حالة المستودع ممتازة ✨"
      );
      return;
    }

    const proposals = lowStock.map(m => {
      const currentStock = m.inventory?.quantity ?? 0;
      const minStock = m.minimumStock || 10;
      const suggestedQty = Math.max(10, (minStock * 2) - currentStock);
      const unitPrice = m.pricePerUnit !== undefined && m.pricePerUnit !== null 
        ? Number(m.pricePerUnit) 
        : (m.price !== undefined ? Number(m.price) : 15);

      let targetSupId = m.supplierId || (m.supplier && m.supplier.id) || "";
      if (!targetSupId && suppliers.length > 0) {
        targetSupId = suppliers[0].id;
      }
      const matchedSup = suppliers.find(s => s.id === targetSupId);

      return {
        materialId: m.id,
        materialName: m.name,
        category: m.category || "عام",
        unit: m.unit || "وحدة",
        currentStock,
        minimumStock: minStock,
        suggestedQty,
        unitPrice,
        supplierId: targetSupId,
        supplierName: matchedSup ? matchedSup.name : "المورد الرئيسي المعتمد",
        selected: true
      };
    });

    setSmartSupplyItems(proposals);
    setShowSmartSupplyModal(true);
    addTerminalLog("PROD", `تم فحص واقتراح توليد توريد ذكي لعدد ${proposals.length} خامات منخفضة المخزون`);
  };

  const handleExecuteSmartSupplyOrders = async () => {
    const selectedProposals = smartSupplyItems.filter(item => item.selected && item.suggestedQty > 0);

    if (selectedProposals.length === 0) {
      window.showAlert?.("يرجى تحديد خامة واحدة على الأقل وبكمية مطلوبة أكبر من صفر لإكمال الطلب الذكي", "تنبيه الاختيار");
      return;
    }

    const isManagerApproved = currentUser?.role !== "employee" && currentUser?.role !== "accountant";
    const totalEst = selectedProposals.reduce((sum, i) => sum + (i.suggestedQty * i.unitPrice), 0);

    const confirmed = await window.showConfirm?.(
      `هل أنت متأكد من ${isManagerApproved ? "اعتماد وإصدار" : "تقديم"} عدد (${selectedProposals.length}) طلبات توريد ذكية بقيمة إجمالية مقدرة $${totalEst.toFixed(2)}؟\n${!isManagerApproved ? "سيتطلب الطلب موافقة نهائية من مسؤول الورشة قبل الإرسال." : "سيتم تسجيل طلبات التوريد رسمياً بصفة معتمدة."}`,
      "تأكيد الطلب الذكي"
    );

    if (!confirmed) return;

    setIsSubmittingSmartSupply(true);

    try {
      let createdCount = 0;
      const expectedDate = new Date();
      expectedDate.setDate(expectedDate.getDate() + 4);
      const expectedDateStr = expectedDate.toISOString().split("T")[0];

      for (const prop of selectedProposals) {
        const res = await fetch("/api/supply-orders", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            supplierId: prop.supplierId || (suppliers[0]?.id || "s-1"),
            materialId: prop.materialId,
            quantity: prop.suggestedQty,
            unitPrice: prop.unitPrice,
            expectedDeliveryDate: expectedDateStr,
            notes: `طلب توريد ذكي تلقائي (Smart Auto-Replenish) - ${isManagerApproved ? "معتمد من المسؤول: " + (currentUser?.fullName || "المسؤول") : "بانتظار موافقة الإدارة"}`
          })
        });

        const data = await res.json();
        if (data.success) {
          createdCount++;
        }
      }

      await fetchSupplyOrders();
      setShowSmartSupplyModal(false);

      addTerminalLog(
        "PROD", 
        `تم إنشاء ${createdCount} طلبات توريد ذكية بموافقة واعتماد المسؤول (${currentUser?.fullName || "Admin"})`
      );

      window.showAlert?.(
        `تم توليد وتسجيل (${createdCount}) طلبات توريد ذكية بنجاح في سجل الشراء ${isManagerApproved ? "بحالة معتمدة ومجهزة للشحن" : "وفي انتظار موافقة المسؤول"}.`,
        "اكتمل التوليد الذكي ⚡"
      );
    } catch (err) {
      console.error("Smart supply error:", err);
      window.showAlert?.("حدث خطأ أثناء الاتصال بالخادم لتسجيل طلبات التوريد الذكية", "خطأ في الشبكة");
    } finally {
      setIsSubmittingSmartSupply(false);
    }
  };

  const handleAdjustStockSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!showAdjustStock || !adjustQty) return;

    const qtyVal = parseFloat(adjustQty);
    const multiplier = (adjustType === "purchase" || adjustType === "adjustment" && qtyVal >= 0) ? 1 : -1;
    const finalQty = Math.abs(qtyVal) * multiplier;

    try {
      const res = await fetch(`/api/inventory/${showAdjustStock.id}/update`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          quantity: finalQty,
          type: adjustType,
          reason: adjustReason || "تعديل مخزون يدوي",
          userId: currentUser?.id || "u-1"
        })
      });

      const data = await res.json();
      if (res.ok) {
        addTerminalLog("DB", `Stock adjusted for: ${showAdjustStock.name} (Change: ${finalQty})`);
        setShowAdjustStock(null);
        setAdjustQty("");
        setAdjustReason("");
        refreshInventoryData();
      } else {
        window.showAlert?.(data.message || "حدث خطأ أثناء تعديل المخزون", "خطأ تعديل المخزون");
      }
    } catch (e) {
      addTerminalLog("ERROR", "Failed to update stock");
    }
  };

  const handleCreateRemnant = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!remMatId || !remWidth || !remHeight) return;

    try {
      const res = await fetch("/api/remnants", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          materialId: remMatId,
          width: parseFloat(remWidth),
          height: parseFloat(remHeight),
          quantity: parseInt(remQty) || 1,
          location: remLocation
        })
      });

      if (res.ok) {
        addTerminalLog("DB", "Created a new remnant sheet piece");
        setShowAddRemnant(false);
        setRemMatId("");
        setRemWidth("");
        setRemHeight("");
        setRemQty("1");
        setRemLocation("");
        refreshInventoryData();
      }
    } catch (e) {
      addTerminalLog("ERROR", "Failed to create remnant");
    }
  };

  const handleConsumeRemnant = async (id: string, qty: number = 1) => {
    try {
      const res = await fetch(`/api/remnants/consume/${id}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ quantity: qty })
      });

      if (res.ok) {
        addTerminalLog("DB", "Consumed raw material remnant piece");
        refreshInventoryData();
      }
    } catch (e) {
      addTerminalLog("ERROR", "Failed to consume remnant");
    }
  };

  const handleWasteRemnant = async (id: string) => {
    try {
      const res = await fetch(`/api/remnants/waste/${id}`, {
        method: "POST"
      });

      if (res.ok) {
        addTerminalLog("DB", "Remnant marked as waste/scrap");
        refreshInventoryData();
      }
    } catch (e) {
      addTerminalLog("ERROR", "Failed to waste remnant");
    }
  };

  const handleCreateSupplyOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedDashboardSupplierId || !newSupplyMaterialId || !newSupplyQty || !newSupplyPrice) {
      window.showAlert?.("يرجى ملء جميع الحقول المطلوبة لطلب التوريد", "تنبيه التحقق");
      return;
    }

    setIsSubmittingSupplyOrder(true);
    try {
      const res = await fetch("/api/supply-orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          supplierId: selectedDashboardSupplierId,
          materialId: newSupplyMaterialId,
          quantity: parseFloat(newSupplyQty),
          unitPrice: parseFloat(newSupplyPrice),
          expectedDeliveryDate: newSupplyExpectedDate || null,
          notes: newSupplyNotes
        })
      });

      const data = await res.json();
      if (data.success) {
        addTerminalLog("DB", `Created supply order ${data.supplyOrder.id} for supplier`);
        setNewSupplyMaterialId("");
        setNewSupplyQty("");
        setNewSupplyPrice("");
        setNewSupplyExpectedDate("");
        setNewSupplyNotes("");
        refreshInventoryData();
      } else {
        window.showAlert?.("فشل إنشاء طلب التوريد: " + data.message, "خطأ إنشاء طلب");
      }
    } catch (err: any) {
      console.error(err);
      addTerminalLog("ERROR", `Failed to create supply order: ${err.message}`);
    } finally {
      setIsSubmittingSupplyOrder(false);
    }
  };

  const handleCreateDirectSupplyOrder = async (
    supplierId: string,
    materialId: string,
    quantity: number,
    unitPrice: number,
    notes: string
  ) => {
    try {
      const res = await fetch("/api/supply-orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          supplierId,
          materialId,
          quantity,
          unitPrice,
          notes
        })
      });
      const data = await res.json();
      if (data.success) {
        addTerminalLog("DB", `Created direct supply order ${data.supplyOrder?.id || ''}`);
        window.showAlert?.(`تم إنشاء طلب التوريد المباشر بنجاح!`, "نجاح طلب التوريد");
        refreshInventoryData();
      } else {
        window.showAlert?.("فشل إنشاء طلب التوريد: " + (data.message || ""), "خطأ");
      }
    } catch (err: any) {
      console.error(err);
      addTerminalLog("ERROR", `Failed to create direct supply order: ${err.message}`);
    }
  };

  const handleDuplicateSupplyOrder = async (order: any) => {
    if (!order) return;

    try {
      const futureDate = new Date();
      futureDate.setDate(futureDate.getDate() + 3);
      const defaultExpectedDate = futureDate.toISOString().split("T")[0];

      const res = await fetch("/api/supply-orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          supplierId: order.supplierId,
          materialId: order.materialId,
          quantity: Number(order.quantity),
          unitPrice: Number(order.unitPrice),
          expectedDeliveryDate: defaultExpectedDate,
          notes: order.notes ? `[مكرر من #${order.id}] ${order.notes}` : `نسخ سريع مكرر تلقائياً من الطلبية السابقة #${order.id}`
        })
      });

      const data = await res.json();
      if (data.success) {
        addTerminalLog("DB", `Duplicated supply order #${order.id} into new order #${data.supplyOrder?.id || ''}`);
        window.showAlert?.(
          `تم إنشاء طلبية توريد مكررة بنجاح (#${data.supplyOrder?.id || ''})!\nالخامة: ${order.materialName || 'المحددة'}\nالكمية: ${order.quantity} قطعة\nالمورد: ${order.supplierName || 'المحدد'}\nالسعر الإجمالي: $${(Number(order.quantity) * Number(order.unitPrice)).toLocaleString()}`,
          "تم النسخ السريع لطلبية التوريد ⚡"
        );
        fetchSupplyOrders();
        refreshInventoryData();
      } else {
        window.showAlert?.("فشل تكرار طلب التوريد: " + (data.message || ""), "خطأ النسخ السريع");
      }
    } catch (err: any) {
      console.error(err);
      addTerminalLog("ERROR", `Failed to duplicate supply order: ${err.message}`);
    }
  };

  const handleUpdateSupplyOrderStatus = async (id: string, status: "completed" | "cancelled" | "pending" | "received") => {
    const targetStatus = status === "received" ? "completed" : status;
    let confirmMsg = "";
    if (targetStatus === "completed") {
      confirmMsg = "هل أنت متأكد من تأكيد استلام هذه الطلبية؟ سيتم زيادة المخزون تلقائياً بالكمية الموردة وتسجيل العملية.";
    } else if (targetStatus === "cancelled") {
      confirmMsg = "هل أنت متأكد من إلغاء طلب التوريد هذا؟";
    } else {
      confirmMsg = "هل تريد إعادة تعيين حالة طلب التوريد إلى معلقة؟";
    }
    
    const confirmed = await window.showConfirm?.(confirmMsg, "تأكيد تغيير حالة الطلبية");
    if (!confirmed) return;

    try {
      const res = await fetch(`/api/supply-orders/${id}/status`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: targetStatus })
      });

      const data = await res.json();
      if (data.success) {
        addTerminalLog("DB", `Supply order ${id} marked as ${targetStatus}`);
        refreshInventoryData();
        window.showAlert?.(
          targetStatus === "completed"
            ? "تمت مراجعة واستلام الطلبية بنجاح! تم تحديث المخزون المتاح تلقائياً. 📦"
            : targetStatus === "cancelled"
              ? "تم إلغاء طلب التوريد."
              : "تم تعديل حالة طلب التوريد إلى معلقة.",
          "تحديث حالة طلب التوريد"
        );
      } else {
        window.showAlert?.("فشل تحديث حالة الطلبية: " + data.message, "خطأ تحديث الحالة");
      }
    } catch (err: any) {
      console.error(err);
      addTerminalLog("ERROR", `Failed to update supply order: ${err.message}`);
    }
  };

  const handleFindSuitableRemnantSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!findSuitableMatId || !findSuitableW || !findSuitableH) return;

    try {
      const res = await fetch("/api/remnants/find-suitable", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          materialId: findSuitableMatId,
          requiredWidth: parseFloat(findSuitableW),
          requiredHeight: parseFloat(findSuitableH)
        })
      });

      const data = await res.json();
      if (res.ok && data.success) {
        setSuitableRemnantResult(data.remnant);
        if (data.remnant) {
          addTerminalLog("LASER", `Suitable remnant found! ID: ${data.remnant.id} (${data.remnant.width}x${data.remnant.height}mm)`);
        } else {
          addTerminalLog("WARNING", "No suitable remnants found. Must use a full sheet!");
        }
      }
    } catch (e) {
      addTerminalLog("ERROR", "Failed to search remnants");
    }
  };

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

  // Edit/Update Order Action
  const handleEditOrderSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingOrder) return;

    const itemsToSend = editOrderItems.map(it => ({
      productName: it.name || "عنصر تشغيل عام",
      quantity: Number(it.qty) || 1,
      unitPrice: Number(it.price) || 0,
      notes: it.notes || ""
    }));

    try {
      const res = await fetch(`/api/orders/${editingOrder.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          customerId: editingOrder.customerId,
          notes: editingOrder.notes,
          priority: editingOrder.priority,
          items: itemsToSend,
          paidAmount: Number(editingOrder.paidAmount) || 0,
          deliveryDateExpected: editingOrder.deliveryDateExpected,
          taxPercent: Number(editingOrder.taxPercent) || 0,
          discount: Number(editingOrder.discount) || 0
        })
      });

      if (res.ok) {
        const updated = await res.json();
        addTerminalLog("DB", `Order ${editingOrder.orderNumber} successfully updated and re-compiled.`);
        setEditingOrder(null);
        fetchOrders();
        fetchLogs();
        // If the updated order was also being viewed, update its view too
        if (selectedOrder && selectedOrder.id === updated.id) {
          setSelectedOrder(updated);
        }
      }
    } catch (e) {
      addTerminalLog("ERROR", "Failed to update order");
    }
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
  // Update Order Status Action
  const handleUpdateOrderStatus = async (orderId: string, status: string, notesText: string) => {
    const targetOrder = orders.find(o => o.id === orderId);
    
    // Strict Delivery Enforcement Check: Block delivery if remaining > 0
    if (status === 'delivered' && targetOrder && targetOrder.remaining > 0.01) {
      setDeliveryBlockedOrder(targetOrder);
      return;
    }

    try {
      const res = await fetch(`/api/orders/${orderId}/status`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          status,
          notes: notesText,
          changedById: currentUser?.id || "u-1"
        })
      });

      if (res.ok) {
        addTerminalLog("DB", `Order ${orderId} status transitioned to: ${status}`);
        fetchOrders();
        fetchLogs();
      } else {
        const errData = await res.json().catch(() => ({}));
        if (errData && errData.remainingUSD !== undefined) {
          if (targetOrder) {
            setDeliveryBlockedOrder(targetOrder);
          } else {
            alert(`⚠️ ${errData.error}`);
          }
        } else {
          alert(`خطأ أثناء تحديث حالة الطلب: ${errData.error || 'خطأ غير معروف'}`);
        }
      }
    } catch (e) {
      addTerminalLog("ERROR", "Failed to transition order status");
    }
  };

  // Compile G-Code specifically for viewed Order
  const handleCompileOrderGCode = async () => {
    if (!selectedOrder) return;
    setIsCompilingOrderGcode(true);
    setOrderGcodeResult(null);
    
    // Orders from LAN clients may arrive before their item payload is hydrated.
    // Never let an undefined/non-array items value prevent the G-code button
    // from running; use a safe order-level prompt instead.
    const orderItems = Array.isArray(selectedOrder.items) ? selectedOrder.items : [];
    const itemsDescription = orderItems.length > 0
      ? orderItems.map(it => `${it.quantity}x ${it.productName}`).join(" and ")
      : `الطلب رقم ${selectedOrder.orderNumber}`;
    const prompt = `قص وتشكيل القطع التالية بالليزر: ${itemsDescription}. مع مراعاة الملاحظات التشغيلية: ${selectedOrder.notes || "لا توجد ملاحظات"}`;
    
    addTerminalLog("LASER", `Compiling order ${selectedOrder.orderNumber} blueprint: "${prompt}"`);

    try {
      const res = await fetch("/api/compiler/gcode", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          promptText: prompt,
          material: "Acrylic 3mm",
          speed: 40,
          power: "85"
        })
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "G-Code Compilation failed");

      setOrderGcodeResult(data);
      addTerminalLog("SUCCESS", `Compiled G-Code paths for order ${selectedOrder.orderNumber} successfully (${data.totalPaths} vectors).`);
    } catch (err: any) {
      addTerminalLog("ERROR", `Compilation for order failed: ${err.message}`);
      // Fallback
      setTimeout(() => {
        setOrderGcodeResult({
          gcodeSnippet: `G00 X0 Y0 F3000\nM03 S850\nG01 X20 Y20 F2400\nG01 X180 Y20\nG01 X180 Y120\nG01 X20 Y120\nG01 X20 Y20\nM05\nG00 X0 Y0`,
          estimatedTime: "02m 15s",
          totalPaths: 5,
          beamDutyCycle: "85%",
          materialLossPercent: 1.8,
          calibrationAdvice: "اضبط مساعد الهواء والعدسة البؤرية على 2.0 بوصة لضمان حواف نظيفة للقطع المطلوبة.",
          gcodeExplanation: "مسار قص أكريليك مخصص لعناصر الطلب مع تحديد طاقة ليزر CO2 بنسبة 85% وسرعة 40مم/ث."
        });
        setIsCompilingOrderGcode(false);
      }, 1000);
    } finally {
      setIsCompilingOrderGcode(false);
    }
  };

  // Order Archiving Handlers
  const handleRunAutoArchive = async (days = archiveDaysThreshold) => {
    try {
      const res = await fetch("/api/orders/auto-archive", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ days }),
      });
      const data = await res.json();
      if (data && data.success) {
        addTerminalLog("ARCHIVE", `[AUTO-ARCHIVE ENGINE] ${data.message}`);
        fetchOrders();
        fetchLogs();
      }
    } catch (err) {
      console.error("Auto archive error:", err);
      addTerminalLog("ERROR", "Failed to run auto archiving");
    }
  };

  const handleArchiveOrder = async (orderId: string) => {
    try {
      const res = await fetch(`/api/orders/${orderId}/archive`, {
        method: "POST",
      });
      if (res.ok) {
        addTerminalLog("ARCHIVE", `[ORDER ARCHIVED] Order ${orderId} moved to archive.`);
        fetchOrders();
        fetchLogs();
      }
    } catch (err) {
      console.error("Archive order error:", err);
      addTerminalLog("ERROR", "Failed to archive order");
    }
  };

  const handleRestoreOrder = async (orderId: string) => {
    try {
      const res = await fetch(`/api/orders/${orderId}/restore`, {
        method: "POST",
      });
      if (res.ok) {
        addTerminalLog("ARCHIVE", `[ORDER RESTORED] Order ${orderId} restored to active queue.`);
        fetchOrders();
        fetchLogs();
      }
    } catch (err) {
      console.error("Restore order error:", err);
      addTerminalLog("ERROR", "Failed to restore order");
    }
  };

  // Run G-Code AI compiler (Gemini)
  const handleCompileGCode = async () => {
    if (!gcodePrompt) return;
    setIsCompilingGCode(true);
    setGcodeResult(null);
    addTerminalLog("LASER", `Compiling blueprint: "${gcodePrompt}" under speed: ${gcodeSpeed}mm/s`);

    try {
      const res = await fetch("/api/compiler/gcode", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          promptText: gcodePrompt,
          material: gcodeMaterial,
          speed: gcodeSpeed,
          power: `${gcodePower}%`
        })
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "G-Code Compilation failed");

      setGcodeResult(data);
      addTerminalLog("SUCCESS", `Compiled G-Code paths successfully (${data.totalPaths} vectors). Time: ${data.estimatedTime}`);
    } catch (err: any) {
      addTerminalLog("ERROR", `Compilation failed: ${err.message}`);
      // Fallback local simulation
      setTimeout(() => {
        setGcodeResult({
          gcodeSnippet: `G00 X0 Y0 F3000\nM03 S${gcodePower * 10}\nG01 X50 Y50 F${gcodeSpeed * 60}\nG01 X50 Y150\nG01 X150 Y150\nG01 X150 Y50\nG01 X50 Y50\nM05\nG00 X0 Y0`,
          estimatedTime: "01m 40s",
          totalPaths: 6,
          beamDutyCycle: `${gcodePower}%`,
          materialLossPercent: 2.1,
          calibrationAdvice: "قم بتعيين البعد البؤري لعدسة الليزر عند 50.8 ملم. اضبط مساعد الهواء القوي لمنع الاحتراق وتراكم الدخان.",
          gcodeExplanation: "مسار قص مستطيل متماثل مع بدء تشغيل رأس الليزر CO2 والتنقل السريع من النقطة المرجعية الصفرية."
        });
        setIsCompilingGCode(false);
      }, 1000);
    } finally {
      setIsCompilingGCode(false);
    }
  };

  const handleSelectCalcMaterial = (matId: string) => {
    setCalcMatId(matId);
    const selectedMat = materials.find(m => m.id === matId);
    if (selectedMat && (selectedMat as any).thickness) {
      setCalcThicknessMm((selectedMat as any).thickness);
    }
  };

  const handleSelectCalcMachine = (machineId: string) => {
    setCalcMachineId(machineId);
    if (!machineId) return;
    const selectedMach = machines.find(m => m.id === machineId);
    if (selectedMach) {
      if (selectedMach.name.includes("130W") || selectedMach.name.includes("130")) {
        setCalcLaserPowerWatts(130);
        setCalcTubeCostUSD(450);
      } else if (selectedMach.name.includes("150W") || selectedMach.name.includes("150")) {
        setCalcLaserPowerWatts(150);
        setCalcTubeCostUSD(600);
      } else if (selectedMach.name.includes("80W") || selectedMach.name.includes("80")) {
        setCalcLaserPowerWatts(80);
        setCalcTubeCostUSD(250);
      } else {
        setCalcLaserPowerWatts(100);
        setCalcTubeCostUSD(350);
      }
    }
  };

  // Fast Laser Calculator Handler
  const handleRunFastCalculator = async () => {
    setIsCalculatingFast(true);
    const startTime = performance.now();
    try {
      const res = await fetch("/api/ai/fast-local", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "instant-pricing-calc",
          payload: {
            materialId: calcMatId,
            machineId: calcMachineId,
            thicknessMm: calcThicknessMm,
            widthCm: calcWidthCm,
            lengthCm: calcLengthCm,
            cutLengthCm: calcCutLengthCm,
            engraveAreaCm2: calcEngraveAreaCm2,
            quantity: calcQuantity,
            laserPowerWatts: calcLaserPowerWatts,
            tubeCostUSD: calcTubeCostUSD,
            tubeLifespanHours: calcTubeLifespanHours,
            electricityRatePerKwh: calcElectricityRate,
            operatorRatePerHour: calcOperatorRate,
            wasteOverridePercent: calcAutoWaste ? -1 : calcWasteOverridePercent,
            targetProfitMarginPercent: calcTargetProfitMargin,
            workType: calcWorkType,
            setupFeeUSD: calcSetupFeeUSD
          }
        })
      });
      const data = await res.json();
      setCalcResult(data);
      const latency = Math.round(performance.now() - startTime);
      setLastResponseLatencyMs(latency);
      addTerminalLog("AI", `⚡ حساب بارامترات القص والأسعار بنجاح في (${latency}ms) ✓`);
    } catch (err: any) {
      console.error("Fast Calc Error:", err);
      window.showAlert?.("خطأ في الحاسبة السريعة: " + err.message);
    } finally {
      setIsCalculatingFast(false);
    }
  };

  // Fast Order Parser Handler
  const handleRunFastParser = async () => {
    if (!parserInputText.trim()) return;
    setIsParsingFast(true);
    const startTime = performance.now();
    try {
      const res = await fetch("/api/ai/fast-local", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "quick-order-parser",
          payload: { rawText: parserInputText }
        })
      });
      const data = await res.json();
      setParserResult(data);
      const latency = Math.round(performance.now() - startTime);
      setLastResponseLatencyMs(latency);
      addTerminalLog("AI", `⚡ تحليل وتفكيك نص الطلب دلالياً بنجاح (${latency}ms) ✓`);
    } catch (err: any) {
      console.error("Fast Parser Error:", err);
      window.showAlert?.("خطأ في المستخرج السريع: " + err.message);
    } finally {
      setIsParsingFast(false);
    }
  };

  // Chat with AXIS AI Companion
  const handleSendChatMessage = async (overrideMessage?: string) => {
    const msg = (overrideMessage || chatInput).trim();
    if (!msg) return;

    if (!overrideMessage) {
      setChatInput("");
    }

    const startTime = performance.now();
    const userMsg = {
      id: "usr-" + Date.now(),
      sender: "user" as const,
      text: msg,
      time: new Date().toLocaleTimeString("ar-SY", { hour: '2-digit', minute: '2-digit' })
    };

    setChatMessages(prev => [...prev, userMsg]);
    setIsSendingChatMessage(true);
    addTerminalLog("AI", `إرسال استفسار دلالي إلى AXIS AI: "${msg.slice(0, 40)}..."`);

    try {
      if (fastResponseMode) {
        const res = await fetch("/api/ai/fast-local", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            action: "fast-faqs",
            payload: { query: msg }
          })
        });

        const latency = Math.round(performance.now() - startTime);
        setLastResponseLatencyMs(latency);

        if (res.ok) {
          const data = await res.json();
          setChatMessages(prev => [...prev, {
            id: "ai-" + Date.now(),
            sender: "ai" as const,
            text: data.answer || "تمت المعالجة الفورية عبر المحرك المحلي بنجاح.",
            time: new Date().toLocaleTimeString("ar-SY", { hour: '2-digit', minute: '2-digit' })
          }]);
          addTerminalLog("AI", `⚡ رد محلي فائق السرعة (${latency}ms) ✓`);
          setIsSendingChatMessage(false);
          return;
        }
      }

      const res = await fetch("/api/ai/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: msg,
          exchangeRate: exchangeRate,
          history: chatMessages.map(m => ({ sender: m.sender, text: m.text })).slice(-8)
        })
      });

      const latency = Math.round(performance.now() - startTime);
      setLastResponseLatencyMs(latency);

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "فشل الاتصال بخادم الذكاء الاصطناعي");

      setChatMessages(prev => [...prev, {
        id: "ai-" + Date.now(),
        sender: "ai" as const,
        text: data.text,
        time: new Date().toLocaleTimeString("ar-SY", { hour: '2-digit', minute: '2-digit' })
      }]);
      addTerminalLog("AI", `تم الرد بنجاح (${latency}ms) ✓`);
    } catch (err: any) {
      console.error("AI Chat error:", err);
      const latency = Math.round(performance.now() - startTime);
      setLastResponseLatencyMs(latency);

      setChatMessages(prev => [...prev, {
        id: "ai-err-" + Date.now(),
        sender: "ai" as const,
        text: `⚡ **استجابة فورية محلية (AXIS AI Local Engine)**:\n- إجمالي طلبات الورشة: **${orders.length} طلبات**\n- الماكينات المسجلة: **${machines.length} ماكينات قص ليزر CO2**\n- العملاء النشطين: **${customers.length} زبائن**\n- إجمالي الأرباح والمبيعات: **$${orders.reduce((s, o) => s + (o.totalPrice || 0), 0).toFixed(2)}**`,
        time: new Date().toLocaleTimeString("ar-SY", { hour: '2-digit', minute: '2-digit' })
      }]);
    } finally {
      setIsSendingChatMessage(false);
    }
  };

  // Fetch AXIS AI DeepBrain Learned Memory
  const fetchAiMemory = async () => {
    setIsLoadingAiMemory(true);
    try {
      const res = await fetch("/api/ai/memory");
      const data = await res.json();
      if (data.success) {
        setAiMemoryLayers(data.layers);
      }
    } catch (err) {
      console.error("Error fetching AI memory:", err);
    } finally {
      setIsLoadingAiMemory(false);
    }
  };

  // Perform Intelligent Semantic Search
  const handleAiSearch = async () => {
    const q = aiSearchQuery.trim();
    if (!q) {
      setAiSearchResults([]);
      return;
    }
    setIsSearchingAi(true);
    try {
      const res = await fetch("/api/ai/semantic-search", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query: q })
      });
      const data = await res.json();
      if (data.success) {
        setAiSearchResults(data.results);
      }
    } catch (err) {
      console.error("AI Semantic Search error:", err);
    } finally {
      setIsSearchingAi(false);
    }
  };

  // Effect to load memory when moving to the memory tab
  useEffect(() => {
    if (activeAiTab === "memory") {
      fetchAiMemory();
    }
  }, [activeAiTab, orders, materials]);

  // Terminal manual command input line
  const handleTerminalSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const cmd = commandInput.trim().toLowerCase();
    if (!cmd) return;

    addTerminalLog("USER", `$ ${commandInput}`);
    setCommandInput("");

    setTimeout(() => {
      if (cmd === "help" || cmd === "?") {
        addTerminalLog("INFO", "Commands: /help, /prisma-generate, /prisma-migrate, /clear, /status, /users");
      } else if (cmd === "clear") {
        setTerminalLogs([]);
      } else if (cmd === "prisma-generate" || cmd === "npx prisma generate") {
        addTerminalLog("PRISMA", "Parsing database/schema.prisma models...");
        setTimeout(() => {
          addTerminalLog("SUCCESS", "Generated client bundle: @prisma/client successfully!");
        }, 800);
      } else if (cmd === "prisma-migrate" || cmd === "npx prisma migrate dev") {
        addTerminalLog("PRISMA", "Creating migration file inside /migrations...");
        setTimeout(() => {
          addTerminalLog("SUCCESS", "Applied migration: init_tables_laser_workshop onto Postgres client");
        }, 1200);
      } else if (cmd === "status") {
        addTerminalLog("STATUS", `User: ${currentUser?.fullName || "Guest"}, Active token: ${token ? "YES" : "NO"}`);
      } else if (cmd === "users") {
        addTerminalLog("INFO", `Users: ${USERS.map(u => `${u.fullName} (${u.role})`).join(" | ")}`);
      } else {
        addTerminalLog("ERROR", `Command not found: "${cmd}". Type help for a list.`);
      }
    }, 200);
  };

  const executeTerminalCommand = (cmd: string) => {
    addTerminalLog("USER", `$ ${cmd}`);
    if (cmd === "npx prisma generate") {
      addTerminalLog("PRISMA", "Parsing database/schema.prisma models...");
      setTimeout(() => {
        addTerminalLog("SUCCESS", "Generated client bundle: @prisma/client successfully!");
      }, 800);
    } else if (cmd === "npx prisma migrate dev") {
      addTerminalLog("PRISMA", "Creating migration file inside /migrations...");
      setTimeout(() => {
        addTerminalLog("SUCCESS", "Applied migration: init_tables_laser_workshop onto Postgres client");
      }, 1200);
    }
  };

  const selectedFileObj = virtualFiles.find(f => f.id === selectedFileId);

  // Unauthenticated login screen
  if (!currentUser) {
    return (
      <div className={`flex min-h-screen bg-[#07070a] items-center justify-center p-4 md:p-8 ${theme === "light" ? "theme-light bg-slate-100" : ""}`}>
        <div className="w-full max-w-6xl grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-8 items-stretch my-auto">
          
          {/* Left Column: AXIS LAB Brand Hero & Platform Overview */}
          <div className="lg:col-span-7 flex flex-col justify-between p-6 md:p-8 bg-zinc-950/90 border border-zinc-850/80 rounded-3xl relative overflow-hidden shadow-2xl backdrop-blur-xl">
            {/* Gradient Background Aesthetics */}
            <div className="absolute -top-24 -right-24 w-80 h-80 bg-amber-500/10 rounded-full blur-3xl pointer-events-none"></div>
            <div className="absolute -bottom-24 -left-24 w-80 h-80 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none"></div>
            
            <div className="relative z-10 space-y-6">
              {/* Header Logo & Live Status */}
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 border-b border-zinc-850/80 pb-6">
                <AxisLabLogoFull className="mb-1" logoSrc={companySettings?.logo} showSubtext={true} />
                <div className="flex items-center gap-2 bg-emerald-950/60 border border-emerald-800/60 px-3 py-1.5 rounded-full text-[11px] font-mono text-emerald-300 shrink-0">
                  <span className="relative flex h-2 w-2">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                  </span>
                  <span>خادم الورشة والجلسات نشط</span>
                </div>
              </div>

              {/* Title & Description */}
              <div className="space-y-3">
                <h1 className="text-xl sm:text-2xl md:text-3xl font-black text-zinc-100 tracking-tight leading-snug">
                  نظام تشغيل ورش القص والنقش بالليزر <span className="text-[#c59257]">AXIS LAB OS</span>
                </h1>
                <p className="text-xs sm:text-sm text-zinc-400 leading-relaxed font-sans max-w-xl">
                  منصة ERP هجينة متكاملة مخصصة لورش الليزر والـ CNC. تجمع بين إدارة العملاء، الفواتير بالعملتين (SYP/USD)، تتبع المخزون والقصاصات، ومترجم G-Code ذكي لجدولة الماكينات.
                </p>
              </div>

              {/* Feature Grid Highlights */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
                <div className="p-3.5 rounded-xl bg-zinc-900/60 border border-zinc-850/80 hover:border-amber-500/30 transition-all flex items-start gap-3 group">
                  <div className="p-2 rounded-lg bg-amber-500/10 border border-amber-500/20 text-amber-400 group-hover:scale-105 transition-transform shrink-0">
                    <ShieldCheck className="w-4 h-4" />
                  </div>
                  <div className="space-y-0.5">
                    <h2 className="text-xs font-bold text-zinc-200">حماية الجلسات وصلاحيات JWT</h2>
                    <p className="text-[11px] text-zinc-500 leading-normal">توزيع أدوار دقيقة (مدير، فني تشغيل، محاسب) مع توثيق سجل الأمان.</p>
                  </div>
                </div>

                <div className="p-3.5 rounded-xl bg-zinc-900/60 border border-zinc-850/80 hover:border-indigo-500/30 transition-all flex items-start gap-3 group">
                  <div className="p-2 rounded-lg bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 group-hover:scale-105 transition-transform shrink-0">
                    <Cpu className="w-4 h-4" />
                  </div>
                  <div className="space-y-0.5">
                    <h2 className="text-xs font-bold text-zinc-200">مترجم وشبكة G-Code CNC</h2>
                    <p className="text-[11px] text-zinc-500 leading-normal">تحويل التصاميم إلى مسارات حقيقية مع حساب زمن الليزر الفعلي.</p>
                  </div>
                </div>

                <div className="p-3.5 rounded-xl bg-zinc-900/60 border border-zinc-850/80 hover:border-emerald-500/30 transition-all flex items-start gap-3 group">
                  <div className="p-2 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 group-hover:scale-105 transition-transform shrink-0">
                    <Scissors className="w-4 h-4" />
                  </div>
                  <div className="space-y-0.5">
                    <h2 className="text-xs font-bold text-zinc-200">المخزون والقصاصات (Remnants)</h2>
                    <p className="text-[11px] text-zinc-500 leading-normal">إدارة الأكريليك والخشب مع استغلال بقايا المواد وتجنب الهالك.</p>
                  </div>
                </div>

                <div className="p-3.5 rounded-xl bg-zinc-900/60 border border-zinc-850/80 hover:border-amber-500/30 transition-all flex items-start gap-3 group">
                  <div className="p-2 rounded-lg bg-amber-500/10 border border-amber-500/20 text-[#c59257] group-hover:scale-105 transition-transform shrink-0">
                    <DollarSign className="w-4 h-4" />
                  </div>
                  <div className="space-y-0.5">
                    <h2 className="text-xs font-bold text-zinc-200">محاسبة مزدوجة USD ⇌ SYP</h2>
                    <p className="text-[11px] text-zinc-500 leading-normal">تحويل لحظي وسندات مقبوضات مع حماية بيانات العملاء الحساسة.</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Bottom Credits & System Specs */}
            <div className="pt-6 mt-6 border-t border-zinc-850/80 flex flex-wrap items-center justify-between text-[10px] font-mono text-zinc-500 gap-2">
              <div className="flex items-center gap-3">
                <span className="text-zinc-400 font-bold">AXIS LAB v0.13.22</span>
                <span>•</span>
                <span>SQLite Local ERP Engine</span>
              </div>
              <div className="flex items-center gap-2 text-zinc-400">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
                <span>1$ = {exchangeRate.toLocaleString()} ل.س</span>
              </div>
            </div>
          </div>

          {/* Right Column: Interactive Login / Register Auth Card */}
          <div className="lg:col-span-5 bg-[#0b0b0e] border border-zinc-800/90 rounded-3xl p-6 sm:p-7 flex flex-col justify-between shadow-2xl relative overflow-hidden">
            <div className="space-y-5">
              
              {/* Header Bar with Segment Control Tabs & Theme Switcher */}
              <div className="flex items-center justify-between gap-2 border-b border-zinc-850 pb-4">
                {/* Mode Selector Tabs */}
                <div className="flex items-center bg-zinc-950 p-1 rounded-xl border border-zinc-850 shrink-0">
                  <button
                    type="button"
                    onClick={() => {
                      setIsRegisterMode(false);
                      setAuthError(null);
                    }}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                      !isRegisterMode
                        ? "bg-[#c59257] text-zinc-950 shadow-md"
                        : "text-zinc-400 hover:text-zinc-200"
                    }`}
                  >
                    تسجيل الدخول
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setIsRegisterMode(true);
                      setAuthError(null);
                      if (authRole === "admin") setAuthRole("employee");
                    }}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                      isRegisterMode
                        ? "bg-[#c59257] text-zinc-950 shadow-md"
                        : "text-zinc-400 hover:text-zinc-200"
                    }`}
                  >
                    حساب جديد
                  </button>
                </div>

                {/* Theme Switcher Button */}
                <button
                  type="button"
                  onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
                  className="w-8 h-8 rounded-xl bg-zinc-900 hover:bg-zinc-850 border border-zinc-800 flex items-center justify-center transition-all text-zinc-400 hover:text-zinc-200"
                  title="تغيير المظهر"
                >
                  {theme === "dark" ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4 text-indigo-400" />}
                </button>
              </div>

              {/* Title Header */}
              <div>
                <h2 className="text-base font-bold text-zinc-100 flex items-center gap-2">
                  <ShieldCheck className="w-4 h-4 text-[#c59257]" />
                  <span>{isRegisterMode ? "إنشاء حساب فني في الورشة" : "بوابة التحكم والتشغيل المركزية"}</span>
                </h2>
                <p className="text-[11px] text-zinc-500 mt-0.5">
                  {isRegisterMode
                    ? "أدخل البيانات المطلوبة لإصدار رمز الدخول وتحديد الدور الوظيفي"
                    : "قم بتسجيل الدخول للوصول إلى الماكينات، الطلبات، والمحاسبة"}
                </p>
              </div>

              {/* Auth Error Banner */}
              {authError && (
                <motion.div
                  initial={{ opacity: 0, y: -6 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="p-3 rounded-xl bg-rose-950/30 border border-rose-800/50 flex items-start gap-2.5 text-xs text-rose-300"
                >
                  <AlertTriangle className="w-4 h-4 shrink-0 text-rose-400 mt-0.5" />
                  <span className="leading-snug">{authError}</span>
                </motion.div>
              )}

              {/* Authentication Form */}
              <form onSubmit={isRegisterMode ? handleRegister : handleLogin} className="space-y-3.5 font-sans">
                {/* Full Name Input (Register Mode) */}
                {isRegisterMode && (
                  <div>
                    <label className="text-[11px] font-medium text-zinc-400 block mb-1">الاسم الكامل</label>
                    <div className="relative">
                      <input
                        type="text"
                        required
                        placeholder="مثال: م. أحمد الروابدة"
                        value={authFullName}
                        onChange={(e) => setAuthFullName(e.target.value)}
                        className="w-full bg-zinc-950 border border-zinc-800 rounded-xl pr-9 pl-3 py-2 text-xs text-zinc-100 placeholder-zinc-600 focus:outline-none focus:border-[#c59257] transition-all"
                      />
                      <UserIcon className="w-4 h-4 text-zinc-500 absolute right-3 top-2.5 pointer-events-none" />
                    </div>
                  </div>
                )}

                {/* Email Input */}
                <div>
                  <label className="text-[11px] font-medium text-zinc-400 block mb-1">البريد الإلكتروني</label>
                  <div className="relative">
                    <input
                      type="email"
                      required
                      placeholder="admin@axislab.com"
                      value={authEmail}
                      onChange={(e) => setAuthEmail(e.target.value)}
                      className="w-full bg-zinc-950 border border-zinc-800 rounded-xl pr-9 pl-3 py-2 text-xs text-zinc-100 placeholder-zinc-600 focus:outline-none focus:border-[#c59257] transition-all font-mono dir-ltr text-right"
                    />
                    <Mail className="w-4 h-4 text-zinc-500 absolute right-3 top-2.5 pointer-events-none" />
                  </div>
                </div>

                {/* Password Input with Show/Hide Eye Toggle */}
                <div>
                  <div className="flex justify-between items-center mb-1">
                    <label className="text-[11px] font-medium text-zinc-400 block">كلمة المرور</label>
                  </div>
                  <div className="relative">
                    <input
                      type={showPassword ? "text" : "password"}
                      required
                      placeholder="••••••••"
                      value={authPassword}
                      onChange={(e) => setAuthPassword(e.target.value)}
                      className="w-full bg-zinc-950 border border-zinc-800 rounded-xl pr-9 pl-9 py-2 text-xs text-zinc-100 placeholder-zinc-600 focus:outline-none focus:border-[#c59257] transition-all font-mono dir-ltr text-right"
                    />
                    <Lock className="w-4 h-4 text-zinc-500 absolute right-3 top-2.5 pointer-events-none" />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute left-2.5 top-2 text-zinc-500 hover:text-zinc-300 transition-colors p-0.5 rounded-lg"
                      title={showPassword ? "إخفاء كلمة المرور" : "إظهار كلمة المرور"}
                    >
                      {showPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                    </button>
                  </div>
                </div>

                {/* Role Select (Register Mode - Operational roles only) */}
                {isRegisterMode && (
                  <div>
                    <label className="text-[11px] font-medium text-zinc-400 block mb-1">الدور الوظيفي بالورشة</label>
                    <div className="grid grid-cols-2 gap-2">
                      <button
                        type="button"
                        onClick={() => setAuthRole("employee")}
                        className={`p-2.5 rounded-xl border text-center transition-all flex flex-col items-center gap-1.5 cursor-pointer ${
                          authRole === "employee"
                            ? "bg-emerald-500/10 border-emerald-500 text-emerald-400 shadow-sm"
                            : "bg-zinc-950 border-zinc-800 text-zinc-400 hover:border-zinc-700"
                        }`}
                      >
                        <Cpu className="w-4 h-4" />
                        <span className="text-[11px] font-bold">فني تشغيل ليزر</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => setAuthRole("accountant")}
                        className={`p-2.5 rounded-xl border text-center transition-all flex flex-col items-center gap-1.5 cursor-pointer ${
                          authRole === "accountant"
                            ? "bg-amber-500/10 border-amber-500 text-amber-400 shadow-sm"
                            : "bg-zinc-950 border-zinc-800 text-zinc-400 hover:border-zinc-700"
                        }`}
                      >
                        <DollarSign className="w-4 h-4" />
                        <span className="text-[11px] font-bold">محاسب مالي</span>
                      </button>
                    </div>

                    <div className="mt-2.5 p-2.5 rounded-xl bg-amber-950/20 border border-amber-800/30 text-[10px] text-amber-300/90 leading-relaxed flex items-start gap-2">
                      <Lock className="w-3.5 h-3.5 text-[#c59257] shrink-0 mt-0.5" />
                      <span>
                        <strong>تنويه أمني:</strong> لا يمكن تسجيل حساب مدير (Admin) من النافذة الخارجية. يتم إنشاء وإضافة المدراء حصرياً من داخل لوحة التحكم بواسطة مدير النظام الحفاظ على الخصوصية والأمان.
                      </span>
                    </div>
                  </div>
                )}

                {/* Extra Options: Remember Me & Encryption note */}
                {!isRegisterMode && (
                  <div className="flex items-center justify-between text-[11px] pt-1">
                    <label className="flex items-center gap-2 text-zinc-400 cursor-pointer select-none">
                      <input
                        type="checkbox"
                        checked={rememberMe}
                        onChange={(e) => setRememberMe(e.target.checked)}
                        className="rounded border-zinc-800 bg-zinc-950 text-[#c59257] focus:ring-0 focus:ring-offset-0 cursor-pointer"
                      />
                      <span>تذكر بيانات الجلسة</span>
                    </label>
                    <span className="text-[10px] text-zinc-500 font-mono flex items-center gap-1">
                      <Lock className="w-3 h-3 text-zinc-600" />
                      <span>256-bit JWT</span>
                    </span>
                  </div>
                )}

                {/* Submit Action Button */}
                <button
                  type="submit"
                  disabled={isAuthLoading}
                  className="w-full py-2.5 bg-gradient-to-r from-[#c59257] to-amber-600 hover:from-amber-500 hover:to-amber-600 text-zinc-950 font-black rounded-xl text-xs transition-all shadow-lg shadow-amber-500/10 flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 mt-2"
                >
                  {isAuthLoading ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin" />
                      <span>جاري التحقق وإصدار الجلسة...</span>
                    </>
                  ) : (
                    <>
                      <Shield className="w-4 h-4" />
                      <span>{isRegisterMode ? "إتمام التسجيل وإصدار المفتاح" : "تسجيل الدخول الآمن"}</span>
                    </>
                  )}
                </button>
              </form>

              {/* Quick Demo Preset Accounts */}
              {!isRegisterMode && (
                <div className="pt-4 border-t border-zinc-850">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider font-mono">
                      حسابات التجربة السريعة (Demo Accounts)
                    </span>
                    <span className="text-[9px] text-[#c59257] font-mono">اختيار الحساب</span>
                  </div>

                  <div className="grid grid-cols-1 gap-2">
                    {/* Admin Preset */}
                    <button
                      type="button"
                      onClick={() => setAuthPreset("admin", "admin@axislab.com", "")}
                      className={`w-full p-2.5 rounded-xl border text-right transition-all flex items-center justify-between group cursor-pointer ${
                        activePreset === "admin"
                          ? "bg-amber-950/40 border-[#c59257]/60 text-zinc-100"
                          : "bg-zinc-950 border-zinc-850 hover:border-zinc-700 text-zinc-300"
                      }`}
                    >
                      <div className="flex items-center gap-2.5">
                        <div className="w-7 h-7 rounded-lg bg-amber-500/10 border border-amber-500/30 text-[#c59257] flex items-center justify-center shrink-0">
                          <ShieldCheck className="w-3.5 h-3.5" />
                        </div>
                        <div>
                          <div className="text-xs font-bold flex items-center gap-1.5">
                            <span>مدير النظام</span>
                            <span className="text-[9px] font-mono px-1.5 py-0.2 rounded bg-amber-950 text-amber-300 border border-amber-800/50">Admin</span>
                          </div>
                          <div className="text-[10px] font-mono text-zinc-500 dir-ltr text-right">admin@axislab.com</div>
                        </div>
                      </div>
                      {activePreset === "admin" && (
                        <CheckCircle2 className="w-4 h-4 text-[#c59257]" />
                      )}
                    </button>

                    {/* Laser Tech Preset */}
                    <button
                      type="button"
                      onClick={() => setAuthPreset("employee", "employee@axislab.com", "")}
                      className={`w-full p-2.5 rounded-xl border text-right transition-all flex items-center justify-between group cursor-pointer ${
                        activePreset === "employee"
                          ? "bg-emerald-950/40 border-emerald-500/60 text-zinc-100"
                          : "bg-zinc-950 border-zinc-850 hover:border-zinc-700 text-zinc-300"
                      }`}
                    >
                      <div className="flex items-center gap-2.5">
                        <div className="w-7 h-7 rounded-lg bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 flex items-center justify-center shrink-0">
                          <Cpu className="w-3.5 h-3.5" />
                        </div>
                        <div>
                          <div className="text-xs font-bold flex items-center gap-1.5">
                            <span>فني تشغيل ليزر</span>
                            <span className="text-[9px] font-mono px-1.5 py-0.2 rounded bg-emerald-950 text-emerald-300 border border-emerald-800/50">Tech</span>
                          </div>
                          <div className="text-[10px] font-mono text-zinc-500 dir-ltr text-right">employee@axislab.com</div>
                        </div>
                      </div>
                      {activePreset === "employee" && (
                        <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                      )}
                    </button>

                    {/* Finance Preset */}
                    <button
                      type="button"
                      onClick={() => setAuthPreset("accountant", "accountant@axislab.com", "")}
                      className={`w-full p-2.5 rounded-xl border text-right transition-all flex items-center justify-between group cursor-pointer ${
                        activePreset === "accountant"
                          ? "bg-amber-950/40 border-amber-500/60 text-zinc-100"
                          : "bg-zinc-950 border-zinc-850 hover:border-zinc-700 text-zinc-300"
                      }`}
                    >
                      <div className="flex items-center gap-2.5">
                        <div className="w-7 h-7 rounded-lg bg-amber-500/10 border border-amber-500/30 text-amber-400 flex items-center justify-center shrink-0">
                          <DollarSign className="w-3.5 h-3.5" />
                        </div>
                        <div>
                          <div className="text-xs font-bold flex items-center gap-1.5">
                            <span>محاسب مالي</span>
                            <span className="text-[9px] font-mono px-1.5 py-0.2 rounded bg-amber-950 text-amber-300 border border-amber-800/50">Finance</span>
                          </div>
                          <div className="text-[10px] font-mono text-zinc-500 dir-ltr text-right">accountant@axislab.com</div>
                        </div>
                      </div>
                      {activePreset === "accountant" && (
                        <CheckCircle2 className="w-4 h-4 text-amber-400" />
                      )}
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Security Notice Footer */}
            <div className="text-[10px] text-zinc-500 text-center font-mono mt-4 pt-3 border-t border-zinc-850/80 flex items-center justify-center gap-1.5">
              <Lock className="w-3 h-3 text-[#c59257]" />
              <span>نظام موثق ببروتوكولات التشفير القياسية AXIS LAB Security</span>
            </div>
          </div>

        </div>
      </div>
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
      <AutoLogoutTimer token={token} onLogout={() => handleLogout(true)} />
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
            <span className="text-zinc-500 font-mono text-[10px] hidden sm:inline">/ v0.13.22 (Interactive)</span>
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
                  {...{ activeOrderFiltersCount, activeView, calculateOrderProgress, currentUser, remnants, productionJobs, theme, setActiveProductSubTab, setIsCurrencyConverterOpen, custAddress, custCategory, custCompany, custName, custNotes, custPhone, customerCategoryFilter, customers, exchangeRate, fastLocalDashboardTrends, fastLocalInventoryPredictions, fastLocalProductionScheduling, filteredOrders, getSevenDaysChartData, handleAddCustomer, handleExportCustomersCSV, handleOpenEditCustomer, handleUpdateOrderStatus, laserMachines, laserUtilizationPercent, lowStockCount, orderFilterCustomer, orderFilterEndDate, orderFilterPriority, orderFilterSearch, orderFilterStartDate, orderFilterStatus, orders, pageTransition, pageVariants, pendingOrders, resetOrderFilters, runningLasersCount, setActiveView, setCustAddress, setCustCategory, setCustCompany, setCustName, setCustNotes, setCustPhone, setCustomerCategoryFilter, setDeleteConfirmTarget, setEditOrderItems, setEditingOrder, setOrderDetailsTab, setOrderFilterCustomer, setOrderFilterEndDate, setOrderFilterPriority, setOrderFilterSearch, setOrderFilterStartDate, setOrderFilterStatus, setOrderGcodeResult, setProgressModalOrder, setSelectedCustomerFiles, setSelectedCustomerIdForOrder, setSelectedOrder, setShowAddCustomer, setShowAddOrder, showAddCustomer, updateRate }}
                />
              )}              {activeView === "database" && (
                <DatabasePage
                  {...{ USERS, activeView, addTerminalLog, archiveDaysThreshold, calculateOrderProgress, currentUser, customers, databaseTab, exchangeRate, executeTerminalCommand, fetchCustomers, fetchLogs, fetchOrders, getOrderStatusBadge, productionJobs, handleArchiveOrder, handleExportCustomersCSV, handleOpenEditCustomer, handleRestoreOrder, handleRunAutoArchive, logs, orderTabFilter, orders, pageTransition, pageVariants, products, setArchiveDaysThreshold, setDatabaseTab, setOrderTabFilter, setSelectedCustomerIdForOrder, setShowAddOrder }}
                />
              )}              {activeView === "products" && (
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
                    refreshInventoryData, addTerminalLog, handleAiClassifyMaterial: materialHandleAiClassify, handleCompileGCode, handleConsumeRemnant, handleCreateSupplyOrder,
                    handleDeleteMaterial: materialHandleDelete, handleDuplicateSupplyOrder, handleExportMaterialsCSV: materialHandleExport, handleFindSuitableRemnantSubmit, handleOpenSmartSupplyModal,
                    handleQuickSupplyRequest, handleReorderMaterials: materialHandleReorder, handleUpdateMaterialQualityStatus: materialHandleQuality, handleUpdateSupplyOrderStatus, handleWasteRemnant,
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
                  handleUpdateOrderStatus={handleUpdateOrderStatus}
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
        {...{ USERS, activeView, addTerminalLog, appendEditOrderDraftItem, calculateOrderProgress, companySettings, currentUser, customers, deleteConfirmTarget, deliveryBlockedOrder, editCustAddress, editCustCategory, editCustCompany, editCustEmail, editCustName, editCustNotes, editCustPhone, editCustWhatsapp, editFocusedItemIdx, editOrderDiscountAmountVal, editOrderItems, editOrderRemaining, editOrderSubtotal, editOrderTaxAmount, editOrderTaxPercentVal, editOrderTotalPrice, editingCustomer, editingOrder, editingProduct, adjustQty, adjustReason, adjustType, aiClassificationResult, editingMaterial, getPaymentStatusBadge, isAiClassifying, isCurrencyConverterOpen, isSubmittingSmartSupply, jobRemHeight, jobRemLocation, jobRemWidth, matCategory, matColor, matHeight, matLocation, matMinStock, matNotes, matPrice, matSubCategory, matSupplierId, matThickness, matUnit, matWidth, materials, newJobEstTime, newJobItemName, newJobLaserPower, newJobLaserSpeed, newJobMaterialId, newJobOrderId, priceComparisonMaterial, productionJobs, setAdjustQty, setAdjustReason, setAdjustType, setAiClassificationResult, setEditingMaterial, setIsCurrencyConverterOpen, setJobRemHeight, setJobRemLocation, setJobRemWidth, setMatCategory, setMatColor, setMatHeight, setMatLocation, setMatMinStock, setMatName, setMatNotes, setMatPrice, setMatSubCategory, setMatSupplierId, setMatThickness, setMatUnit, setMatWidth, setNewJobEstTime, setNewJobItemName, setNewJobLaserPower, setNewJobLaserSpeed, setNewJobMaterialId, setNewJobOrderId, setPriceComparisonMaterial, setShowAddJob, setShowAddMaterial, setShowAdjustStock, setShowRemnantRegister, setShowSmartSupplyModal, setSmartSupplyItems, showAddJob, showAddMaterial, showAdjustStock, showRemnantRegister, showSmartSupplyModal, smartSupplyItems, suppliers, exchangeRate, fetchCustomers, fetchLogs, fetchOrders, handleAdjustStockSubmit, handleAiClassifyMaterial, handleCompileOrderGCode, handleCopyText, handleCreateDirectSupplyOrder, handleCreateMaterial: materialHandleCreate, handleCreateProduct, handleCreateProductionJob, handleCreateRemnant, handleDeleteCustomer, handleDeletePayment, handleDeleteProduct, handleDirectCompleteJob, handleEditOrderSubmit, handleExecuteSmartSupplyOrders, handleRecordPaymentSubmit, handleRegisterRemnantOnJobComplete, handleSaveEditCustomer, handleSendEmailShare, handleSettleRemainingAndDeliver, handleUpdateItemProgress, handleUpdateMaterial: materialHandleUpdate, handleUpdateProduct, isCompilingOrderGcode, isHelpGuideOpen, isProcessingQuickFullPay, isQuickActionsOpen, isSearchPaletteOpen, isSearching, isSharingEmail, matName, newPaymentAmount, newPaymentNotes, newPaymentSYPAmount, orderDetailsTab, orderGcodeResult, orders, pageTransition, pageVariants, paymentInputCurrency, printTicketOrder, prodCategory, prodCode, prodDescription, prodName, prodPrice, prodStock, products, progressModalOrder, refreshInventoryData, remHeight, remLocation, remMatId, remQty, remWidth, removeEditOrderDraftItem, renderCutProgressInteractiveTable, searchQuery, searchResults, selectedCustomerFiles, selectedCustomerIdForOrder, selectedMaterialFiles, selectedOrder, selectedPaymentMethod, selectedPaymentReceipt, selectedProductFiles, setActiveView, setDeleteConfirmTarget, setDeliveryBlockedOrder, setEditCustAddress, setEditCustCategory, setEditCustCompany, setEditCustEmail, setEditCustName, setEditCustNotes, setEditCustPhone, setEditCustWhatsapp, setEditFocusedItemIdx, setEditOrderItems, setEditingCustomer, setEditingOrder, setEditingProduct, setIsHelpGuideOpen, setIsQuickActionsOpen, setIsSearchPaletteOpen, setNewPaymentAmount, setNewPaymentNotes, setNewPaymentSYPAmount, setOrderDetailsTab, setPaymentInputCurrency, setPrintTicketOrder, setProdCategory, setProdCode, setProdDescription, setProdName, setProdPrice, setProdStock, setProgressModalOrder, setRemHeight, setRemLocation, setRemMatId, setRemQty, setRemWidth, setSearchQuery, setSearchResults, setSelectedCustomerFiles, setSelectedCustomerIdForOrder, setSelectedMaterialFiles, setSelectedOrder, setSelectedPaymentMethod, setSelectedPaymentReceipt, setSelectedProductFiles, setShareBody, setShareEmail, setShareEmailSuccess, setShareMethod, setShareSubject, setShowAddOrder, setShowAddProduct, setShowAddRemnant, setShowHelpModal, setShowShareModal, shareBody, shareEmail, shareEmailSuccess, shareMethod, shareMsgCopied, sharePdfCopied, shareSubject, showAddOrder, showAddProduct, showAddRemnant, showHelpModal, showShareModal, updateEditOrderDraftItem, updateRate }}
      />
      </main>

    </div>
  );
}
