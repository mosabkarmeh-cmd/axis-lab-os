import { motion, AnimatePresence } from "motion/react";
import * as Lucide from "lucide-react";
import { QRCodeSVG } from "qrcode.react";
import AddOrderModal from "../AddOrderModal";
import CurrencyConverterModal from "../CurrencyConverterModal";
import { FileUploader } from "../FileUploader";
import HelpCenter from "../HelpCenter";
import HelpModal from "../HelpModal";
import SupplierPriceComparisonModal from "../SupplierPriceComparisonModal";
import OrderTeamRatingPanel from "../OrderTeamRatingPanel";
import OrderPrintModal from "../OrderPrintModal";
import ShareOrderModal from "../ShareOrderModal";
import CommandPalette from "../CommandPalette";
import EntityFilesModals from "../EntityFilesModals";
import QuickActionsFab from "../QuickActionsFab";
import CutProgressModal from "../CutProgressModal";
import { materialPriceSYP, materialPriceUSD } from "../../lib/materials";

export type GlobalDialogProps = Record<string, any>;
