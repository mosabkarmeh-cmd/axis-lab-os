import type { GlobalDialogProps } from "./dialogs/shared";
import AddOrderModal from "./AddOrderModal";
import CurrencyConverterModal from "./CurrencyConverterModal";
import HelpModal from "./HelpModal";
import SupplierPriceComparisonModal from "./SupplierPriceComparisonModal";
import AddProductionJobDialog from "./dialogs/AddProductionJobDialog";
import AddRemnantDialog from "./dialogs/AddRemnantDialog";
import AdjustStockDialog from "./dialogs/AdjustStockDialog";
import DeleteConfirmDialog from "./dialogs/DeleteConfirmDialog";
import DeliveryBlockedDialog from "./dialogs/DeliveryBlockedDialog";
import EditCustomerDialog from "./dialogs/EditCustomerDialog";
import EditOrderDialog from "./dialogs/EditOrderDialog";
import HelpGuideDialog from "./dialogs/HelpGuideDialog";
import MaterialDialog from "./dialogs/MaterialDialog";
import OrderDetailsDialog from "./dialogs/OrderDetailsDialog";
import PaymentReceiptDialog from "./dialogs/PaymentReceiptDialog";
import ProductDialog from "./dialogs/ProductDialog";
import RemnantRegisterDialog from "./dialogs/RemnantRegisterDialog";
import SmartSupplyDialog from "./dialogs/SmartSupplyDialog";

/**
 * Modal composition root. Dialog modules own their own visibility and business
 * interactions; this file only wires the independent surfaces together.
 */
export default function GlobalDialogs(props: GlobalDialogProps) {
  const {
    showAddOrder,
    selectedCustomerIdForOrder,
    setShowAddOrder,
    setSelectedCustomerIdForOrder,
    customers,
    products,
    currentUser,
    fetchOrders,
    fetchLogs,
    fetchCustomers,
    addTerminalLog,
    exchangeRate,
    priceComparisonMaterial,
    setPriceComparisonMaterial,
    suppliers,
    handleCreateDirectSupplyOrder,
    refreshInventoryData,
    isCurrencyConverterOpen,
    setIsCurrencyConverterOpen,
    updateRate,
    showHelpModal,
    setShowHelpModal,
    activeView,
    setIsHelpGuideOpen,
  } = props as GlobalDialogProps & Record<string, any>;

  return (
    <>
      <AddOrderModal
        isOpen={Boolean(showAddOrder)}
        onClose={() => {
          setShowAddOrder(false);
          setSelectedCustomerIdForOrder("");
        }}
        initialCustomerId={selectedCustomerIdForOrder}
        customers={customers}
        products={products}
        currentUser={currentUser}
        fetchOrders={fetchOrders}
        fetchLogs={fetchLogs}
        fetchCustomers={fetchCustomers}
        addTerminalLog={addTerminalLog}
        exchangeRate={exchangeRate}
      />

      <EditCustomerDialog {...props} />
      <DeliveryBlockedDialog {...props} />
      <PaymentReceiptDialog {...props} />
      <OrderDetailsDialog {...props} />
      <EditOrderDialog {...props} />
      <AddProductionJobDialog {...props} />
      <RemnantRegisterDialog {...props} />
      <SmartSupplyDialog {...props} />
      <AdjustStockDialog {...props} />
      <AddRemnantDialog {...props} />
      <MaterialDialog {...props} />
      <ProductDialog {...props} />
      <DeleteConfirmDialog {...props} />
      <HelpGuideDialog {...props} />

      <SupplierPriceComparisonModal
        isOpen={Boolean(priceComparisonMaterial)}
        onClose={() => setPriceComparisonMaterial(null)}
        material={priceComparisonMaterial}
        materials={props.materials}
        suppliers={suppliers}
        exchangeRate={exchangeRate}
        onSelectMaterial={(material: any) => setPriceComparisonMaterial(material)}
        onCreateSupplyOrder={handleCreateDirectSupplyOrder}
        onMaterialUpdated={refreshInventoryData}
      />

      <CurrencyConverterModal
        isOpen={Boolean(isCurrencyConverterOpen)}
        onClose={() => setIsCurrencyConverterOpen(false)}
        exchangeRate={exchangeRate}
        onUpdateRate={updateRate}
      />

      <HelpModal
        isOpen={Boolean(showHelpModal)}
        onClose={() => setShowHelpModal(false)}
        currentView={activeView}
        onOpenFullGuide={() => setIsHelpGuideOpen(true)}
      />
    </>
  );
}
